import type { JwtPayload } from "./lib/jwt";

export interface Bindings {
  DB: D1Database;
  SESSIONS: KVNamespace;
  FILES: R2Bucket;
  JWT_SECRET: string;
  CORS_ORIGIN: string;
}

export interface Variables {
  user: JwtPayload;
}
