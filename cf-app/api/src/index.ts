import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import authRouter from "./routes/auth";
import projectsRouter from "./routes/projects";
import stagesRouter from "./routes/stages";
import tasksRouter from "./routes/tasks";
import timeEntriesRouter from "./routes/time-entries";
import usersRouter from "./routes/users";
import mentionsRouter from "./routes/mentions";
import type { Bindings, Variables } from "./types";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("*", logger());
app.use("*", prettyJSON());
app.use(
  "*",
  cors({
    origin: (origin, c) => {
      const allowedOrigins = (c.env.CORS_ORIGIN || "")
        .split(",")
        .map((value: string) => value.trim())
        .filter(Boolean);

      if (!origin || allowedOrigins.length === 0) {
        return origin || "*";
      }

      const originHost = new URL(origin).hostname;
      const isAllowedPreview =
        originHost === "ops-team.pages.dev" ||
        originHost.endsWith(".ops-team.pages.dev") ||
        originHost === "ops-web-siu.pages.dev" ||
        originHost.endsWith(".ops-web-siu.pages.dev");

      return allowedOrigins.includes(origin) || isAllowedPreview
        ? origin
        : allowedOrigins[0];
    },
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.get("/health", (c) => c.json({ ok: true, ts: Date.now() }));

app.route("/api/auth", authRouter);
app.route("/api/projects", projectsRouter);
app.route("/api/stages", stagesRouter);
app.route("/api/tasks", tasksRouter);
app.route("/api/time-entries", timeEntriesRouter);
app.route("/api/users", usersRouter);
app.route("/api/mentions", mentionsRouter);

app.notFound((c) => c.json({ error: "Not found" }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Internal server error" }, 500);
});

export default app;
