import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { createDb } from "../db/client";
import { stages, projectMembers } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { nanoid } from "../lib/jwt";
import type { Bindings, Variables } from "../types";

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

router.use("*", authMiddleware);

const stageSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  orderIndex: z.number().int().min(0).optional(),
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

  if (!projectId) return c.json({ error: "projectId required" }, 400);

  const membership = await requireMembership(db, projectId, userId);
  if (!membership) return c.json({ error: "Not found" }, 404);

  const rows = await db
    .select()
    .from(stages)
    .where(eq(stages.projectId, projectId))
    .all();

  return c.json(rows);
});

router.post("/", zValidator("json", stageSchema.extend({ projectId: z.string() })), async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("user").sub;
  const body = c.req.valid("json");

  const membership = await requireMembership(db, body.projectId, userId);
  if (!membership || membership.role === "member") {
    return c.json({ error: "Forbidden" }, 403);
  }

  const id = nanoid();
  await db.insert(stages).values({
    id,
    name: body.name,
    projectId: body.projectId,
    color: body.color,
    orderIndex: body.orderIndex ?? 0,
  });

  const stage = await db.select().from(stages).where(eq(stages.id, id)).get();
  return c.json(stage, 201);
});

router.patch("/:id", zValidator("json", stageSchema.partial()), async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("user").sub;
  const stageId = c.req.param("id");
  const body = c.req.valid("json");

  const stage = await db.select().from(stages).where(eq(stages.id, stageId)).get();
  if (!stage) return c.json({ error: "Not found" }, 404);

  const membership = await requireMembership(db, stage.projectId, userId);
  if (!membership || membership.role === "member") {
    return c.json({ error: "Forbidden" }, 403);
  }

  await db.update(stages).set(body).where(eq(stages.id, stageId));
  const updated = await db.select().from(stages).where(eq(stages.id, stageId)).get();
  return c.json(updated);
});

router.delete("/:id", async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("user").sub;
  const stageId = c.req.param("id");

  const stage = await db.select().from(stages).where(eq(stages.id, stageId)).get();
  if (!stage) return c.json({ error: "Not found" }, 404);

  const membership = await requireMembership(db, stage.projectId, userId);
  if (!membership || membership.role === "member") {
    return c.json({ error: "Forbidden" }, 403);
  }

  await db.delete(stages).where(eq(stages.id, stageId));
  return c.json({ success: true });
});

export default router;
