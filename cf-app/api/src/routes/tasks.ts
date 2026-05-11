import { Hono } from "hono";
import type { Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, asc } from "drizzle-orm";
import { createDb } from "../db/client";
import {
  tasks,
  projectMembers,
  users,
  stages,
  taskComments,
  taskAttachments,
} from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { nanoid } from "../lib/jwt";
import type { Bindings, Variables } from "../types";

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

router.use("*", authMiddleware);

const taskStatus = z.enum(["todo", "in_progress", "in_review", "done", "cancelled"]);
const taskPriority = z.enum(["low", "medium", "high", "urgent"]);
const taskChannel = z.enum(["BIV", "EGM"]);

const createTaskSchema = z.object({
  name: z.string().min(1).max(300),
  description: z.string().max(5000).optional(),
  link: z.string().url().or(z.literal("")).nullable().optional(),
  projectId: z.string(),
  stageId: z.string().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  status: taskStatus.optional(),
  priority: taskPriority.optional(),
  dueDate: z.string().datetime().nullable().optional(),
  channel: taskChannel.nullable().optional(),
  orderIndex: z.number().int().min(0).optional(),
});

const updateTaskSchema = createTaskSchema.omit({ projectId: true }).partial();

const reorderSchema = z.object({
  taskId: z.string(),
  stageId: z.string().nullable(),
  orderIndex: z.number().int().min(0),
});

const createCommentSchema = z.object({
  body: z.string().min(1).max(5000),
  mentionedUserIds: z.array(z.string()).optional(),
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

function normalizeMention(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findMentionedUsers(
  body: string,
  members: { id: string; name: string; email: string; avatar: string | null }[],
  authorId: string
) {
  const mentionedTerms = new Set(
    [...body.matchAll(/@([^\s,.;:!?()[\]{}]+)/g)].map((match) =>
      normalizeMention(match[1] ?? "")
    )
  );

  return members.filter((member) => {
    if (member.id === authorId) return false;

    const name = normalizeMention(member.name);
    const firstName = name.split(" ")[0] ?? "";
    const emailUser = normalizeMention(member.email.split("@")[0] ?? "");

    return [name, firstName, emailUser]
      .filter(Boolean)
      .some((candidate) => mentionedTerms.has(candidate));
  });
}

async function sendMentionEmails(
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
  recipients: { name: string; email: string }[],
  details: { projectId: string; taskName: string; authorName: string; commentBody: string }
) {
  if (!c.env.RESEND_API_KEY || !c.env.RESEND_FROM_EMAIL || recipients.length === 0) return;

  const origin = c.req.header("Origin") ?? "https://ops-team.pages.dev";
  const taskUrl = `${origin}/projects/${details.projectId}`;
  await Promise.all(
    recipients.map((recipient) =>
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${c.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: c.env.RESEND_FROM_EMAIL,
          to: recipient.email,
          subject: `${details.authorName} mentioned you on ${details.taskName}`,
          text: [
            `Hi ${recipient.name},`,
            "",
            `${details.authorName} mentioned you in a task comment:`,
            "",
            details.commentBody,
            "",
            `Open the task: ${taskUrl}`,
          ].join("\n"),
        }),
      }).catch(() => undefined)
    )
  );
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
    link: body.link,
    projectId: body.projectId,
    stageId: body.stageId,
    assigneeId: body.assigneeId,
    status: body.status ?? "todo",
    priority: body.priority ?? "medium",
    dueDate: body.dueDate ? new Date(body.dueDate) : null,
    channel: body.channel,
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

router.get("/:id/comments", async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("user").sub;
  const taskId = c.req.param("id");

  const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) return c.json({ error: "Not found" }, 404);

  const membership = await requireMembership(db, task.projectId, userId);
  if (!membership) return c.json({ error: "Not found" }, 404);

  const rows = await db
    .select({
      id: taskComments.id,
      taskId: taskComments.taskId,
      body: taskComments.body,
      createdAt: taskComments.createdAt,
      author: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
      },
    })
    .from(taskComments)
    .innerJoin(users, eq(taskComments.authorId, users.id))
    .where(eq(taskComments.taskId, taskId))
    .orderBy(asc(taskComments.createdAt))
    .all();

  return c.json(rows);
});

router.post("/:id/comments", zValidator("json", createCommentSchema), async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("user").sub;
  const taskId = c.req.param("id");
  const body = c.req.valid("json");

  const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) return c.json({ error: "Not found" }, 404);

  const membership = await requireMembership(db, task.projectId, userId);
  if (!membership) return c.json({ error: "Forbidden" }, 403);

  const id = nanoid();
  const now = new Date();

  await db.insert(taskComments).values({
    id,
    taskId,
    authorId: userId,
    body: body.body,
    createdAt: now,
  });

  const row = await db
    .select({
      id: taskComments.id,
      taskId: taskComments.taskId,
      body: taskComments.body,
      createdAt: taskComments.createdAt,
      author: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
      },
    })
    .from(taskComments)
    .innerJoin(users, eq(taskComments.authorId, users.id))
    .where(eq(taskComments.id, id))
    .get();

  if (row) {
    const projectUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
      })
      .from(projectMembers)
      .innerJoin(users, eq(users.id, projectMembers.userId))
      .where(eq(projectMembers.projectId, task.projectId))
      .all();
    const explicitMentionIds = new Set(body.mentionedUserIds ?? []);
    const explicitMentions = projectUsers.filter(
      (member) => member.id !== userId && explicitMentionIds.has(member.id)
    );
    const typedMentions = findMentionedUsers(body.body, projectUsers, userId);
    const mentionedUsers = Array.from(
      new Map([...explicitMentions, ...typedMentions].map((member) => [member.id, member])).values()
    );
    await sendMentionEmails(c, mentionedUsers, {
      projectId: task.projectId,
      taskName: task.name,
      authorName: row.author.name,
      commentBody: body.body,
    });
  }

  return c.json(row, 201);
});

router.get("/:id/attachments", async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("user").sub;
  const taskId = c.req.param("id");

  const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) return c.json({ error: "Not found" }, 404);

  const membership = await requireMembership(db, task.projectId, userId);
  if (!membership) return c.json({ error: "Not found" }, 404);

  const rows = await db
    .select({
      id: taskAttachments.id,
      taskId: taskAttachments.taskId,
      fileName: taskAttachments.fileName,
      fileType: taskAttachments.fileType,
      fileSize: taskAttachments.fileSize,
      createdAt: taskAttachments.createdAt,
      uploader: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
      },
    })
    .from(taskAttachments)
    .innerJoin(users, eq(taskAttachments.uploaderId, users.id))
    .where(eq(taskAttachments.taskId, taskId))
    .orderBy(asc(taskAttachments.createdAt))
    .all();

  return c.json(rows);
});

router.post("/:id/attachments", async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("user").sub;
  const taskId = c.req.param("id");

  const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) return c.json({ error: "Not found" }, 404);

  const membership = await requireMembership(db, task.projectId, userId);
  if (!membership) return c.json({ error: "Forbidden" }, 403);

  const form = await c.req.formData();
  const file = form.get("file") as unknown as File | null;
  if (!file || typeof file === "string") return c.json({ error: "file required" }, 400);

  const id = nanoid();
  const now = new Date();
  const r2Key = `tasks/${taskId}/${id}-${file.name}`;

  await c.env.FILES.put(r2Key, file.stream(), {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
  });

  await db.insert(taskAttachments).values({
    id,
    taskId,
    uploaderId: userId,
    fileName: file.name,
    fileType: file.type || null,
    fileSize: file.size,
    r2Key,
    createdAt: now,
  });

  const row = await db
    .select({
      id: taskAttachments.id,
      taskId: taskAttachments.taskId,
      fileName: taskAttachments.fileName,
      fileType: taskAttachments.fileType,
      fileSize: taskAttachments.fileSize,
      createdAt: taskAttachments.createdAt,
      uploader: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
      },
    })
    .from(taskAttachments)
    .innerJoin(users, eq(taskAttachments.uploaderId, users.id))
    .where(eq(taskAttachments.id, id))
    .get();

  return c.json(row, 201);
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
