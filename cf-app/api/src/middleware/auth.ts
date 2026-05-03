import { createMiddleware } from "hono/factory";
import { verifyJwt, type JwtPayload } from "../lib/jwt";
import type { Bindings } from "../types";

type AuthEnv = {
  Bindings: Bindings;
  Variables: { user: JwtPayload };
};

export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const token = authHeader.slice(7);
  const payload = await verifyJwt(token, c.env.JWT_SECRET);
  if (!payload) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
  c.set("user", payload);
  await next();
});
