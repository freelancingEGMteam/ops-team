import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../db/client";
import { users, projectMembers } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import type { Bindings, Variables } from "../types";

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

router.use("*", authMiddleware);

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

export default router;
