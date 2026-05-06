import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { createDb } from "../db/client";
import { projects, projectMembers, stages, users } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { nanoid } from "../lib/jwt";
import type { Bindings, Variables } from "../types";

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

router.use("*", authMiddleware);

const createProjectSchema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  icon: z.string().optional(),
});

const updateProjectSchema = createProjectSchema.partial();

const shareProjectSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["admin", "member"]).default("member"),
});

async function getMembership(
  db: ReturnType<typeof createDb>,
  projectId: string,
  userId: string
) {
  return db
    .select()
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId)
      )
    )
    .get();
}

function canManageMembers(role: string) {
  return role === "owner" || role === "admin";
}

router.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("user").sub;

  const rows = await db
    .select({ project: projects })
    .from(projectMembers)
    .innerJoin(projects, eq(projects.id, projectMembers.projectId))
    .where(eq(projectMembers.userId, userId))
    .all();

  return c.json(rows.map((r) => r.project));
});

router.post("/", zValidator("json", createProjectSchema), async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("user").sub;
  const body = c.req.valid("json");

  const id = nanoid();
  const now = new Date();

  await db.insert(projects).values({
    id,
    ownerId: userId,
    name: body.name,
    description: body.description,
    color: body.color,
    icon: body.icon,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(projectMembers).values({
    id: nanoid(),
    projectId: id,
    userId,
    role: "owner",
    joinedAt: now,
  });

  // Default stages
  const defaultStages = [
    { name: "Idea Only", color: "#b8cbb8" },
    { name: "Script/Lyrics Generation", color: "#0048ff" },
    { name: "Audio/Album Generation", color: "#5f6974" },
    { name: "Image/Video Generation", color: "#8a0000" },
    { name: "Video Editing", color: "#168db5" },
    { name: "SEO&Metadata", color: "#7fb7ff" },
    { name: "Final Revision", color: "#ff75a8" },
    { name: "Modifications Needed", color: "#883100" },
  ];
  await db.insert(stages).values(
    defaultStages.map((stage, i) => ({
      id: nanoid(),
      name: stage.name,
      projectId: id,
      orderIndex: i,
      color: stage.color,
    }))
  );

  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .get();

  return c.json(project, 201);
});

router.get("/:id/members", async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("user").sub;
  const projectId = c.req.param("id");

  const membership = await getMembership(db, projectId, userId);
  if (!membership) return c.json({ error: "Not found" }, 404);

  const rows = await db
    .select({
      id: projectMembers.id,
      projectId: projectMembers.projectId,
      role: projectMembers.role,
      joinedAt: projectMembers.joinedAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
      },
    })
    .from(projectMembers)
    .innerJoin(users, eq(users.id, projectMembers.userId))
    .where(eq(projectMembers.projectId, projectId))
    .all();

  return c.json(rows);
});

router.post(
  "/:id/members",
  zValidator("json", shareProjectSchema),
  async (c) => {
    const db = createDb(c.env.DB);
    const userId = c.get("user").sub;
    const projectId = c.req.param("id");
    const body = c.req.valid("json");

    const membership = await getMembership(db, projectId, userId);
    if (!membership || !canManageMembers(membership.role)) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const user = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, body.userId))
      .get();

    if (!user) return c.json({ error: "User not found" }, 404);

    const existing = await getMembership(db, projectId, body.userId);
    if (existing) {
      if (existing.role === "owner") {
        return c.json({ error: "Project owner role cannot be changed" }, 400);
      }

      await db
        .update(projectMembers)
        .set({ role: body.role })
        .where(eq(projectMembers.id, existing.id));
    } else {
      await db.insert(projectMembers).values({
        id: nanoid(),
        projectId,
        userId: body.userId,
        role: body.role,
        joinedAt: new Date(),
      });
    }

    return c.json({ success: true });
  }
);

router.delete("/:id/members/:userId", async (c) => {
  const db = createDb(c.env.DB);
  const actingUserId = c.get("user").sub;
  const projectId = c.req.param("id");
  const memberUserId = c.req.param("userId");

  const membership = await getMembership(db, projectId, actingUserId);
  if (!membership || !canManageMembers(membership.role)) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const member = await getMembership(db, projectId, memberUserId);
  if (!member) return c.json({ error: "Not found" }, 404);
  if (member.role === "owner") {
    return c.json({ error: "Project owner cannot be removed" }, 400);
  }

  await db.delete(projectMembers).where(eq(projectMembers.id, member.id));
  return c.json({ success: true });
});

router.get("/:id", async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("user").sub;
  const projectId = c.req.param("id");

  const membership = await getMembership(db, projectId, userId);

  if (!membership) return c.json({ error: "Not found" }, 404);

  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .get();

  return c.json(project);
});

router.patch("/:id", zValidator("json", updateProjectSchema), async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("user").sub;
  const projectId = c.req.param("id");
  const body = c.req.valid("json");

  const membership = await getMembership(db, projectId, userId);

  if (!membership || !canManageMembers(membership.role)) {
    return c.json({ error: "Forbidden" }, 403);
  }

  await db
    .update(projects)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(projects.id, projectId));

  const updated = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .get();

  return c.json(updated);
});

router.delete("/:id", async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("user").sub;
  const projectId = c.req.param("id");

  const project = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, userId)))
    .get();

  if (!project) return c.json({ error: "Forbidden" }, 403);

  await db.delete(projects).where(eq(projects.id, projectId));
  return c.json({ success: true });
});

export default router;
