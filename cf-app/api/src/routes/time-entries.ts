import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { createDb } from "../db/client";
import { timeEntries, users } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { nanoid } from "../lib/jwt";
import type { Bindings, Variables } from "../types";

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

router.use("*", authMiddleware);

const timeEntryStatus = z.enum(["Pending", "Done"]);
const timeEntryChannel = z.enum(["BIV", "EGM"]);

const createTimeEntrySchema = z.object({
  startDate: z.string().datetime().nullable().optional(),
  task: z.string().min(1).max(300),
  price: z.number().min(0).max(1000000).optional(),
  channel: timeEntryChannel.nullable().optional(),
  deliveryDate: z.string().datetime().nullable().optional(),
  status: timeEntryStatus.optional(),
});

const updateTimeEntrySchema = createTimeEntrySchema.partial();

function toCents(price: number | undefined) {
  return Math.round((price ?? 0) * 100);
}

function fromCents(priceCents: number) {
  return priceCents / 100;
}

function mapEntry(row: {
  entry: typeof timeEntries.$inferSelect;
  user: Pick<typeof users.$inferSelect, "id" | "name" | "email" | "avatar"> | null;
}) {
  return {
    id: row.entry.id,
    userId: row.entry.userId,
    startDate: row.entry.startDate,
    task: row.entry.task,
    price: fromCents(row.entry.priceCents),
    channel: row.entry.channel,
    deliveryDate: row.entry.deliveryDate,
    status: row.entry.status,
    createdAt: row.entry.createdAt,
    updatedAt: row.entry.updatedAt,
    user: row.user,
  };
}

async function getEntry(db: ReturnType<typeof createDb>, id: string) {
  return db
    .select({
      entry: timeEntries,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
      },
    })
    .from(timeEntries)
    .leftJoin(users, eq(users.id, timeEntries.userId))
    .where(eq(timeEntries.id, id))
    .get();
}

router.get("/", async (c) => {
  const db = createDb(c.env.DB);

  const rows = await db
    .select({
      entry: timeEntries,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
      },
    })
    .from(timeEntries)
    .leftJoin(users, eq(users.id, timeEntries.userId))
    .orderBy(asc(timeEntries.startDate), asc(timeEntries.createdAt))
    .all();

  return c.json(rows.map(mapEntry));
});

router.post("/", zValidator("json", createTimeEntrySchema), async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("user").sub;
  const body = c.req.valid("json");
  const now = new Date();
  const id = nanoid();

  await db.insert(timeEntries).values({
    id,
    userId,
    startDate: body.startDate ? new Date(body.startDate) : null,
    task: body.task,
    priceCents: toCents(body.price),
    channel: body.channel,
    deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : null,
    status: body.status ?? "Pending",
    createdAt: now,
    updatedAt: now,
  });

  const entry = await getEntry(db, id);
  return c.json(entry ? mapEntry(entry) : null, 201);
});

router.patch("/:id", zValidator("json", updateTimeEntrySchema), async (c) => {
  const db = createDb(c.env.DB);
  const id = c.req.param("id");
  const body = c.req.valid("json");

  const existing = await getEntry(db, id);
  if (!existing) return c.json({ error: "Not found" }, 404);

  await db
    .update(timeEntries)
    .set({
      ...(body.startDate !== undefined
        ? { startDate: body.startDate ? new Date(body.startDate) : null }
        : {}),
      ...(body.task !== undefined ? { task: body.task } : {}),
      ...(body.price !== undefined ? { priceCents: toCents(body.price) } : {}),
      ...(body.channel !== undefined ? { channel: body.channel } : {}),
      ...(body.deliveryDate !== undefined
        ? { deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : null }
        : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      updatedAt: new Date(),
    })
    .where(eq(timeEntries.id, id));

  const updated = await getEntry(db, id);
  return c.json(updated ? mapEntry(updated) : null);
});

router.delete("/:id", async (c) => {
  const db = createDb(c.env.DB);
  const id = c.req.param("id");

  const existing = await getEntry(db, id);
  if (!existing) return c.json({ error: "Not found" }, 404);

  await db.delete(timeEntries).where(eq(timeEntries.id, id));
  return c.json({ success: true });
});

export default router;
