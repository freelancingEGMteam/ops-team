import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { createDb } from "../db/client";
import { users } from "../db/schema";
import { signJwt, nanoid } from "../lib/jwt";
import type { Bindings, Variables } from "../types";

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

router.post("/register", zValidator("json", registerSchema), async (c) => {
  const { name, email, password } = c.req.valid("json");
  const db = createDb(c.env.DB);

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .get();

  if (existing) {
    return c.json({ error: "Email already registered" }, 409);
  }

  const id = nanoid();
  const passwordHash = await hashPassword(password);

  await db.insert(users).values({ id, name, email, passwordHash });

  const token = await signJwt({ sub: id, email }, c.env.JWT_SECRET);
  return c.json({ token, user: { id, name, email } }, 201);
});

router.post("/login", zValidator("json", loginSchema), async (c) => {
  const { email, password } = c.req.valid("json");
  const db = createDb(c.env.DB);

  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .get();

  if (!user) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const passwordHash = await hashPassword(password);
  if (passwordHash !== user.passwordHash) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const token = await signJwt(
    { sub: user.id, email: user.email },
    c.env.JWT_SECRET
  );

  return c.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar },
  });
});

export default router;
