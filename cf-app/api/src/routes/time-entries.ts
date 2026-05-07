import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { createDb } from "../db/client";
import { timeEntries, timeTrackerMembers, users } from "../db/schema";
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

function mapEntry(row: {
  entry: typeof timeEntries.$inferSelect;
  user: Pick<typeof users.$inferSelect, "name" | "email" | "avatar"> | null;
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
    user: row.user ? { id: row.entry.userId, ...row.user } : null,
  };
}

async function getEntry(db: Db, id: string) {
  return db
    .select({
      entry: timeEntries,
      user: {
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
  const access = await getTimeTrackerAccess(db, c.get("user").sub);
  if (!access) return c.json({ error: "Forbidden" }, 403);

  const rows = await db
    .select({
      entry: timeEntries,
      user: {
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
  const access = await getTimeTrackerAccess(db, c.get("user").sub);
  if (!access) return c.json({ error: "Forbidden" }, 403);

  const id = c.req.param("id");

  const existing = await getEntry(db, id);
  if (!existing) return c.json({ error: "Not found" }, 404);

  await db.delete(timeEntries).where(eq(timeEntries.id, id));
  return c.json({ success: true });
});

export default router;
