import type { JwtPayload } from "./lib/jwt";

export interface Bindings {
  DB: D1Database;
  SESSIONS: KVNamespace;
  FILES: R2Bucket;
  JWT_SECRET: string;
  CORS_ORIGIN: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
}

export interface Variables {
  user: JwtPayload;
}
