import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { createDb } from "../db/client";
import { users, projectMembers } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { nanoid } from "../lib/jwt";
import type { Bindings, Variables } from "../types";

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

router.use("*", authMiddleware);

const userRole = z.enum(["admin", "member"]);

const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  avatar: z.string().url().or(z.literal("")).nullable().optional(),
  role: userRole.default("member"),
});

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatar: z.string().url().or(z.literal("")).nullable().optional(),
  role: userRole.optional(),
});

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

async function requireAdmin(db: ReturnType<typeof createDb>, userId: string) {
  const currentUser = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .get();

  return currentUser?.role === "owner" || currentUser?.role === "admin"
    ? currentUser
    : null;
}

router.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatar: users.avatar,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .all();
  return c.json(rows);
});

router.get("/me", async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("user").sub;

  const user = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatar: users.avatar,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .get();

  if (!user) return c.json({ error: "Not found" }, 404);
  return c.json(user);
});

router.get("/project/:projectId", async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("user").sub;
  const projectId = c.req.param("projectId");

  const membership = await db
    .select()
    .from(projectMembers)
    .where(
      eq(projectMembers.projectId, projectId)
    )
    .all();

  const isMember = membership.some((m) => m.userId === userId);
  if (!isMember) return c.json({ error: "Forbidden" }, 403);

  const memberIds = membership.map((m) => m.userId);

  const rows = await db
    .select({ id: users.id, name: users.name, email: users.email, avatar: users.avatar })
    .from(users)
    .all();

  return c.json(rows.filter((u) => memberIds.includes(u.id)));
});

router.post("/", zValidator("json", createUserSchema), async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("user").sub;
  const currentUser = await requireAdmin(db, userId);
  if (!currentUser) return c.json({ error: "Forbidden" }, 403);

  const body = c.req.valid("json");
  const email = body.email.toLowerCase().trim();
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .get();

  if (existing) return c.json({ error: "Email already registered" }, 409);

  const id = nanoid();
  const passwordHash = await hashPassword(body.password);
  await db.insert(users).values({
    id,
    name: body.name,
    email,
    passwordHash,
    avatar: body.avatar || null,
    role: body.role,
  });

  const created = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatar: users.avatar,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .get();

  return c.json(created, 201);
});

router.patch("/:id", zValidator("json", updateUserSchema), async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("user").sub;
  const currentUser = await requireAdmin(db, userId);
  if (!currentUser) return c.json({ error: "Forbidden" }, 403);

  const targetId = c.req.param("id");
  const body = c.req.valid("json");
  const target = await db.select().from(users).where(eq(users.id, targetId)).get();
  if (!target) return c.json({ error: "Not found" }, 404);
  if (target.role === "owner" && currentUser.role !== "owner") {
    return c.json({ error: "Only owners can edit owners" }, 403);
  }

  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.avatar !== undefined) updateData.avatar = body.avatar || null;
  if (body.role !== undefined) updateData.role = body.role;

  if (Object.keys(updateData).length > 0) {
    await db.update(users).set(updateData).where(eq(users.id, targetId));
  }

  const updated = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatar: users.avatar,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, targetId))
    .get();

  return c.json(updated);
});

router.delete("/:id", async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("user").sub;
  const currentUser = await requireAdmin(db, userId);
  if (!currentUser) return c.json({ error: "Forbidden" }, 403);

  const targetId = c.req.param("id");
  if (targetId === userId) return c.json({ error: "You cannot remove yourself" }, 400);

  const target = await db.select().from(users).where(eq(users.id, targetId)).get();
  if (!target) return c.json({ error: "Not found" }, 404);
  if (target.role === "owner") return c.json({ error: "Owners cannot be removed" }, 400);

  await db.delete(users).where(eq(users.id, targetId));
  return c.json({ success: true });
});

export default router;
