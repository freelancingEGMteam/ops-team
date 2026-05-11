import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import { createDb } from "../db/client";
import {
  mentionNotifications,
  projects,
  taskComments,
  tasks,
  users,
} from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import type { Bindings, Variables } from "../types";

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

router.use("*", authMiddleware);

router.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("user").sub;

  const rows = await db
    .select({
      id: mentionNotifications.id,
      readAt: mentionNotifications.readAt,
      createdAt: mentionNotifications.createdAt,
      project: {
        id: projects.id,
        name: projects.name,
        color: projects.color,
      },
      task: {
        id: tasks.id,
        name: tasks.name,
        status: tasks.status,
        priority: tasks.priority,
      },
      comment: {
        id: taskComments.id,
        body: taskComments.body,
        createdAt: taskComments.createdAt,
      },
      author: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
      },
    })
    .from(mentionNotifications)
    .innerJoin(projects, eq(projects.id, mentionNotifications.projectId))
    .innerJoin(tasks, eq(tasks.id, mentionNotifications.taskId))
    .innerJoin(taskComments, eq(taskComments.id, mentionNotifications.commentId))
    .innerJoin(users, eq(users.id, mentionNotifications.authorId))
    .where(eq(mentionNotifications.userId, userId))
    .orderBy(desc(mentionNotifications.createdAt))
    .limit(100)
    .all();

  return c.json(rows);
});

router.patch("/:id/read", async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("user").sub;
  const id = c.req.param("id");

  const row = await db
    .select()
    .from(mentionNotifications)
    .where(eq(mentionNotifications.id, id))
    .get();

  if (!row || row.userId !== userId) return c.json({ error: "Not found" }, 404);

  await db
    .update(mentionNotifications)
    .set({ readAt: new Date() })
    .where(eq(mentionNotifications.id, id));

  return c.json({ success: true });
});

export default router;
