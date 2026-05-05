import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { createDb } from "../db/client";
import { projects, projectMembers, stages } from "../db/schema";
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
    "Idea Only",
    "Script/Lyrics Generation",
    "Audio/Album Generation",
    "Image/Video Generation",
    "Video Editing",
    "SEO&Metadata",
    "Final Revision",
    "Modifications Needed",
  ];
  await db.insert(stages).values(
    defaultStages.map((name, i) => ({
      id: nanoid(),
      name,
      projectId: id,
      orderIndex: i,
      color: ["#94a3b8", "#60a5fa", "#f59e0b", "#a78bfa", "#818cf8", "#22c55e", "#34d399", "#f97316"][i],
    }))
  );

  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .get();

  return c.json(project, 201);
});

router.get("/:id", async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("user").sub;
  const projectId = c.req.param("id");

  const membership = await db
    .select()
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId)
      )
    )
    .get();

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

  const membership = await db
    .select()
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId)
      )
    )
    .get();

  if (!membership || membership.role === "member") {
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
