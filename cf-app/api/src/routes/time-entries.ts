import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { createDb } from "../db/client";
import { timeTrackerMembers, users } from "../db/schema";
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
const shareTimeTrackerSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["admin", "member"]).default("member"),
});

type Db = ReturnType<typeof createDb>;

async function getCurrentUser(db: Db, userId: string) {
  return db.select().from(users).where(eq(users.id, userId)).get();
}

async function getTimeTrackerMembership(db: Db, userId: string) {
  return db
    .select()
    .from(timeTrackerMembers)
    .where(eq(timeTrackerMembers.userId, userId))
    .get();
}

async function hasTimeTrackerMembers(db: Db) {
  const member = await db.select({ id: timeTrackerMembers.id }).from(timeTrackerMembers).get();
  return Boolean(member);
}

async function getTimeTrackerAccess(db: Db, userId: string) {
  const user = await getCurrentUser(db, userId);
  if (!user) return null;

  if (user.role === "owner" || user.role === "admin") {
    return { user, role: user.role };
  }

  if (!(await hasTimeTrackerMembers(db))) {
    return { user, role: "admin" };
  }

  const membership = await getTimeTrackerMembership(db, userId);
  return membership ? { user, role: membership.role } : null;
}

function canManageMembers(role: string) {
  return role === "owner" || role === "admin";
}

function toCents(price: number | undefined) {
  return Math.round((price ?? 0) * 100);
}

function fromCents(priceCents: number) {
  return priceCents / 100;
}

type TimeEntryRow = {
  id: string;
  user_id: string | null;
  start_date: number | null;
  task?: string;
  task_name?: string;
  price?: number;
  price_cents?: number;
  channel: "BIV" | "EGM" | null;
  delivery_date: number | null;
  status: "Pending" | "Done" | "pending" | "done";
  created_at: number;
  updated_at: number;
  user_name: string | null;
  user_email: string | null;
  user_avatar: string | null;
};

type TimeEntryShape = {
  usesTaskName: boolean;
  usesPriceCents: boolean;
  hasWeekStart: boolean;
};

function mapStatus(status: TimeEntryRow["status"]) {
  return status.toLowerCase() === "done" ? "Done" : "Pending";
}

function storageStatus(status: "Pending" | "Done", shape: TimeEntryShape) {
  return shape.usesTaskName ? status.toLowerCase() : status;
}

function getWeekStart(value: string | null | undefined) {
  const date = value ? new Date(value) : new Date();
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() + diff);
  return monday.getTime();
}

async function getTimeEntryShape(db: D1Database): Promise<TimeEntryShape> {
  const columns = await db.prepare("PRAGMA table_info(time_entries)").all<{ name: string }>();
  const names = new Set((columns.results ?? []).map((column) => column.name));
  return {
    usesTaskName: names.has("task_name"),
    usesPriceCents: names.has("price_cents"),
    hasWeekStart: names.has("week_start"),
  };
}

function mapEntry(row: TimeEntryRow) {
  return {
    id: row.id,
    userId: row.user_id,
    startDate: row.start_date,
    task: row.task_name ?? row.task ?? "",
    price:
      row.price_cents === undefined
        ? Number(row.price ?? 0)
        : fromCents(Number(row.price_cents ?? 0)),
    channel: row.channel,
    deliveryDate: row.delivery_date,
    status: mapStatus(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    user: row.user_id
      ? {
          id: row.user_id,
          name: row.user_name ?? "",
          email: row.user_email ?? "",
          avatar: row.user_avatar,
        }
      : null,
  };
}

async function getEntry(db: D1Database, id: string) {
  return db
    .prepare(
      `SELECT te.*, u.name AS user_name, u.email AS user_email, u.avatar AS user_avatar
       FROM time_entries te
       LEFT JOIN users u ON u.id = te.user_id
       WHERE te.id = ?`
    )
    .bind(id)
    .first<TimeEntryRow>();
}

router.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const access = await getTimeTrackerAccess(db, c.get("user").sub);
  if (!access) return c.json({ error: "Forbidden" }, 403);

  const rows = await c.env.DB
    .prepare(
      `SELECT te.*, u.name AS user_name, u.email AS user_email, u.avatar AS user_avatar
       FROM time_entries te
       LEFT JOIN users u ON u.id = te.user_id
       ORDER BY te.start_date ASC, te.created_at ASC`
    )
    .all<TimeEntryRow>();

  return c.json((rows.results ?? []).map(mapEntry));
});

router.get("/members", async (c) => {
  const db = createDb(c.env.DB);
  const access = await getTimeTrackerAccess(db, c.get("user").sub);
  if (!access) return c.json({ error: "Forbidden" }, 403);

  const globalManagers = await db
    .select({
      id: users.id,
      role: users.role,
      joinedAt: users.createdAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
      },
    })
    .from(users)
    .all();

  const memberRows = await db
    .select({
      id: timeTrackerMembers.id,
      role: timeTrackerMembers.role,
      joinedAt: timeTrackerMembers.joinedAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
      },
    })
    .from(timeTrackerMembers)
    .innerJoin(users, eq(users.id, timeTrackerMembers.userId))
    .all();

  const members = new Map(
    globalManagers
      .filter((user) => user.role === "owner" || user.role === "admin")
      .map((user) => [
        user.id,
        {
          id: `global-${user.id}`,
          role: user.role,
          joinedAt: user.joinedAt,
          user: user.user,
        },
      ])
  );

  for (const member of memberRows) {
    if (!members.has(member.user.id)) {
      members.set(member.user.id, member);
    }
  }

  if (members.size === 0) {
    members.set(access.user.id, {
      id: `bootstrap-${access.user.id}`,
      role: "admin",
      joinedAt: access.user.createdAt,
      user: {
        id: access.user.id,
        name: access.user.name,
        email: access.user.email,
        avatar: access.user.avatar,
      },
    });
  }

  return c.json([...members.values()]);
});

router.post("/", zValidator("json", createTimeEntrySchema), async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("user").sub;
  const access = await getTimeTrackerAccess(db, userId);
  if (!access) return c.json({ error: "Forbidden" }, 403);

  const body = c.req.valid("json");
  const now = new Date();
  const id = nanoid();
  const shape = await getTimeEntryShape(c.env.DB);
  const startDate = body.startDate ? new Date(body.startDate).getTime() : null;
  const deliveryDate = body.deliveryDate ? new Date(body.deliveryDate).getTime() : null;
  const status = body.status ?? "Pending";
  const price = body.price ?? 0;

  if (shape.usesTaskName) {
    await c.env.DB
      .prepare(
        `INSERT INTO time_entries (
          id, user_id, task_name, start_date, delivery_date, price, channel, status, week_start, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        userId,
        body.task,
        startDate,
        deliveryDate,
        price,
        body.channel,
        storageStatus(status, shape),
        getWeekStart(body.startDate),
        now.getTime(),
        now.getTime()
      )
      .run();
  } else {
    await c.env.DB
      .prepare(
        `INSERT INTO time_entries (
          id, user_id, start_date, task, price_cents, channel, delivery_date, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        userId,
        startDate,
        body.task,
        toCents(price),
        body.channel,
        deliveryDate,
        storageStatus(status, shape),
        now.getTime(),
        now.getTime()
      )
      .run();
  }

  const entry = await getEntry(c.env.DB, id);
  return c.json(entry ? mapEntry(entry) : null, 201);
});

router.post(
  "/members",
  zValidator("json", shareTimeTrackerSchema),
  async (c) => {
    const db = createDb(c.env.DB);
    const access = await getTimeTrackerAccess(db, c.get("user").sub);
    if (!access) return c.json({ error: "Forbidden" }, 403);

    const body = c.req.valid("json");
    const targetUser = await getCurrentUser(db, body.userId);
    if (!targetUser) return c.json({ error: "User not found" }, 404);

    if (targetUser.role === "owner" || targetUser.role === "admin") {
      return c.json({ success: true });
    }

    const role = canManageMembers(access.role) ? body.role : "member";
    const hasMembers = await hasTimeTrackerMembers(db);
    if (!hasMembers && access.user.id !== body.userId) {
      await db.insert(timeTrackerMembers).values({
        id: nanoid(),
        userId: access.user.id,
        role: "admin",
        joinedAt: new Date(),
      });
    }

    const existing = await getTimeTrackerMembership(db, body.userId);
    if (existing) {
      if (canManageMembers(access.role)) {
        await db
          .update(timeTrackerMembers)
          .set({ role })
          .where(eq(timeTrackerMembers.id, existing.id));
      }
    } else {
      await db.insert(timeTrackerMembers).values({
        id: nanoid(),
        userId: body.userId,
        role,
        joinedAt: new Date(),
      });
    }

    return c.json({ success: true });
  }
);

router.delete("/members/:userId", async (c) => {
  const db = createDb(c.env.DB);
  const access = await getTimeTrackerAccess(db, c.get("user").sub);
  if (!access || !canManageMembers(access.role)) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const memberUserId = c.req.param("userId");
  const targetUser = await getCurrentUser(db, memberUserId);
  if (!targetUser) return c.json({ error: "Not found" }, 404);
  if (targetUser.role === "owner" || targetUser.role === "admin") {
    return c.json({ error: "Workspace owners and admins cannot be removed" }, 400);
  }

  const member = await getTimeTrackerMembership(db, memberUserId);
  if (!member) return c.json({ error: "Not found" }, 404);

  await db.delete(timeTrackerMembers).where(eq(timeTrackerMembers.id, member.id));
  return c.json({ success: true });
});

router.patch("/:id", zValidator("json", updateTimeEntrySchema), async (c) => {
  const db = createDb(c.env.DB);
  const access = await getTimeTrackerAccess(db, c.get("user").sub);
  if (!access) return c.json({ error: "Forbidden" }, 403);

  const id = c.req.param("id");
  const body = c.req.valid("json");

  const existing = await getEntry(c.env.DB, id);
  if (!existing) return c.json({ error: "Not found" }, 404);

  const shape = await getTimeEntryShape(c.env.DB);
  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.startDate !== undefined) {
    updates.push("start_date = ?");
    values.push(body.startDate ? new Date(body.startDate).getTime() : null);
    if (shape.hasWeekStart) {
      updates.push("week_start = ?");
      values.push(getWeekStart(body.startDate));
    }
  }
  if (body.task !== undefined) {
    updates.push(`${shape.usesTaskName ? "task_name" : "task"} = ?`);
    values.push(body.task);
  }
  if (body.price !== undefined) {
    updates.push(`${shape.usesPriceCents ? "price_cents" : "price"} = ?`);
    values.push(shape.usesPriceCents ? toCents(body.price) : body.price);
  }
  if (body.channel !== undefined) {
    updates.push("channel = ?");
    values.push(body.channel);
  }
  if (body.deliveryDate !== undefined) {
    updates.push("delivery_date = ?");
    values.push(body.deliveryDate ? new Date(body.deliveryDate).getTime() : null);
  }
  if (body.status !== undefined) {
    updates.push("status = ?");
    values.push(storageStatus(body.status, shape));
  }

  updates.push("updated_at = ?");
  values.push(Date.now(), id);

  await c.env.DB
    .prepare(`UPDATE time_entries SET ${updates.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();

  const updated = await getEntry(c.env.DB, id);
  return c.json(updated ? mapEntry(updated) : null);
});

router.delete("/:id", async (c) => {
  const db = createDb(c.env.DB);
  const access = await getTimeTrackerAccess(db, c.get("user").sub);
  if (!access) return c.json({ error: "Forbidden" }, 403);

  const id = c.req.param("id");

  const existing = await getEntry(c.env.DB, id);
  if (!existing) return c.json({ error: "Not found" }, 404);

  await c.env.DB.prepare("DELETE FROM time_entries WHERE id = ?").bind(id).run();
  return c.json({ success: true });
});

export default router;
