import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, asc } from "drizzle-orm";
import { createDb } from "../db/client";
import { tasks, projectMembers, users, stages } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { nanoid } from "../lib/jwt";
import type { Bindings, Variables } from "../types";

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

router.use("*", authMiddleware);

const taskStatus = z.enum(["todo", "in_progress", "in_review", "done", "cancelled"]);
const taskPriority = z.enum(["low", "medium", "high", "urgent"]);

const createTaskSchema = z.object({
  name: z.string().min(1).max(300),
  description: z.string().max(5000).optional(),
  projectId: z.string(),
  stageId: z.string().optional(),
  assigneeId: z.string().optional(),
  status: taskStatus.optional(),
  priority: taskPriority.optional(),
  dueDate: z.string().datetime().optional(),
  orderIndex: z.number().int().min(0).optional(),
});

const updateTaskSchema = createTaskSchema.omit({ projectId: true }).partial();

const reorderSchema = z.object({
  taskId: z.string(),
  stageId: z.string().nullable(),
  orderIndex: z.number().int().min(0),
});

async function requireMembership(
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

router.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("user").sub;
  const projectId = c.req.query("projectId");
  const stageId = c.req.query("stageId");
  const statusFilter = c.req.query("status");

  if (!projectId) return c.json({ error: "projectId required" }, 400);

  const membership = await requireMembership(db, projectId, userId);
  if (!membership) return c.json({ error: "Not found" }, 404);

  const rows = await db
    .select({
      task: tasks,
      assignee: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
      },
      stage: {
        id: stages.id,
        name: stages.name,
        color: stages.color,
      },
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .leftJoin(stages, eq(tasks.stageId, stages.id))
    .where(
      and(
        eq(tasks.projectId, projectId),
        stageId ? eq(tasks.stageId, stageId) : undefined,
        statusFilter ? eq(tasks.status, statusFilter as z.infer<typeof taskStatus>) : undefined
      )
    )
    .orderBy(asc(tasks.orderIndex))
    .all();

  return c.json(rows);
});

router.post("/", zValidator("json", createTaskSchema), async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("user").sub;
  const body = c.req.valid("json");

  const membership = await requireMembership(db, body.projectId, userId);
  if (!membership) return c.json({ error: "Forbidden" }, 403);

  const id = nanoid();
  const now = new Date();

  await db.insert(tasks).values({
    id,
    name: body.name,
    description: body.description,
    projectId: body.projectId,
    stageId: body.stageId,
    assigneeId: body.assigneeId,
    status: body.status ?? "todo",
    priority: body.priority ?? "medium",
    dueDate: body.dueDate ? new Date(body.dueDate) : null,
    orderIndex: body.orderIndex ?? 0,
    createdAt: now,
    updatedAt: now,
  });

  const task = await db.select().from(tasks).where(eq(tasks.id, id)).get();
  return c.json(task, 201);
});

router.get("/:id", async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("user").sub;
  const taskId = c.req.param("id");

  const row = await db
    .select({ task: tasks, assignee: users })
    .from(tasks)
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .where(eq(tasks.id, taskId))
    .get();

  if (!row) return c.json({ error: "Not found" }, 404);

  const membership = await requireMembership(db, row.task.projectId, userId);
  if (!membership) return c.json({ error: "Not found" }, 404);

  return c.json(row);
});

router.patch("/:id", zValidator("json", updateTaskSchema), async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("user").sub;
  const taskId = c.req.param("id");
  const body = c.req.valid("json");

  const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) return c.json({ error: "Not found" }, 404);

  const membership = await requireMembership(db, task.projectId, userId);
  if (!membership) return c.json({ error: "Forbidden" }, 403);

  const updateData: Record<string, unknown> = {
    ...body,
    updatedAt: new Date(),
  };
  if (body.dueDate !== undefined) {
    updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  }

  await db.update(tasks).set(updateData).where(eq(tasks.id, taskId));

  const updated = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  return c.json(updated);
});

router.delete("/:id", async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("user").sub;
  const taskId = c.req.param("id");

  const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) return c.json({ error: "Not found" }, 404);

  const membership = await requireMembership(db, task.projectId, userId);
  if (!membership) return c.json({ error: "Forbidden" }, 403);

  await db.delete(tasks).where(eq(tasks.id, taskId));
  return c.json({ success: true });
});

// Batch reorder for drag-and-drop
router.post("/reorder", zValidator("json", z.array(reorderSchema)), async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("user").sub;
  const updates = c.req.valid("json");

  if (updates.length === 0) return c.json({ success: true });

  const firstTask = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, updates[0]!.taskId))
    .get();

  if (!firstTask) return c.json({ error: "Task not found" }, 404);

  const membership = await requireMembership(db, firstTask.projectId, userId);
  if (!membership) return c.json({ error: "Forbidden" }, 403);

  await Promise.all(
    updates.map(({ taskId, stageId, orderIndex }) =>
      db
        .update(tasks)
        .set({ stageId: stageId ?? undefined, orderIndex, updatedAt: new Date() })
        .where(eq(tasks.id, taskId))
    )
  );

  return c.json({ success: true });
});

export default router;
