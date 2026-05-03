# ops-cf — Cloudflare-Native Rebuild

100% Cloudflare-compatible rewrite of the ops-team project management app.

## Stack

| Layer | Technology |
|---|---|
| **API** | [Hono](https://hono.dev) on Cloudflare Workers |
| **ORM** | [Drizzle ORM](https://orm.drizzle.team) |
| **Database** | Cloudflare D1 (SQLite) |
| **Caching** | Cloudflare KV |
| **File storage** | Cloudflare R2 |
| **Frontend** | React 19 + Vite on Cloudflare Pages |
| **UI** | shadcn/ui primitives + Tailwind CSS |
| **Tables** | TanStack Table v8 (inline editing) |
| **Auth** | JWT (HMAC-SHA256, Web Crypto API) |
| **State** | TanStack Query + Zustand |

## Prerequisites

- Node.js 20+
- pnpm 9+
- Wrangler CLI (`pnpm add -g wrangler`)
- A Cloudflare account

## Setup

### 1. Create Cloudflare resources

```bash
# Create D1 database
wrangler d1 create ops-db
# → copy the database_id into api/wrangler.toml [[d1_databases]]

# Create KV namespace for sessions
wrangler kv namespace create SESSIONS
# → copy the id into api/wrangler.toml [[kv_namespaces]]

# Create R2 bucket (optional, for file uploads)
wrangler r2 bucket create ops-files
```

### 2. Install dependencies

```bash
cd cf-app
pnpm install
```

### 3. Run migrations

```bash
# Local dev
pnpm db:migrate:local

# Production
pnpm db:migrate:prod
```

### 4. Start local development

```bash
# In one terminal — Workers API on :8787
cd api && pnpm dev

# In another terminal — Vite frontend on :5173 (proxies /api → :8787)
cd web && pnpm dev
```

### 5. Deploy

```bash
# Deploy Workers API
cd api && pnpm deploy

# Deploy Pages frontend
cd web && pnpm deploy
```

## Project Structure

```
cf-app/
├── api/                    # Cloudflare Workers (Hono + Drizzle)
│   └── src/
│       ├── index.ts        # Hono app entry point
│       ├── db/
│       │   ├── schema.ts   # Drizzle table definitions
│       │   └── client.ts   # D1 database client
│       ├── routes/         # Route handlers
│       │   ├── auth.ts     # POST /api/auth/login|register
│       │   ├── projects.ts # CRUD /api/projects
│       │   ├── stages.ts   # CRUD /api/stages
│       │   ├── tasks.ts    # CRUD + reorder /api/tasks
│       │   └── users.ts    # GET /api/users/me|project/:id
│       ├── middleware/
│       │   └── auth.ts     # JWT Bearer middleware
│       └── lib/
│           └── jwt.ts      # HMAC-SHA256 JWT (Web Crypto)
│
├── web/                    # Cloudflare Pages (React + Vite)
│   └── src/
│       ├── components/
│       │   ├── tasks/
│       │   │   ├── TaskTable.tsx      # TanStack Table with inline editing
│       │   │   ├── TaskBoard.tsx      # Kanban board with drag-and-drop
│       │   │   └── TaskInlineEdit.tsx # Reusable inline cell components
│       │   ├── layout/
│       │   │   ├── AppLayout.tsx
│       │   │   └── Sidebar.tsx
│       │   └── ui/                    # shadcn/ui primitives
│       ├── pages/
│       │   ├── Dashboard.tsx
│       │   ├── Login.tsx
│       │   ├── Register.tsx
│       │   ├── Projects.tsx
│       │   └── ProjectDetail.tsx
│       ├── lib/
│       │   ├── api.ts      # Type-safe fetch wrapper
│       │   └── utils.ts
│       ├── store/
│       │   └── auth.ts     # Zustand auth store
│       └── types/
│           └── index.ts    # Shared TypeScript types
│
└── migrations/
    └── 0001_initial.sql    # D1 schema migration
```

## API Reference

```
POST   /api/auth/register          Create account → { token, user }
POST   /api/auth/login             Sign in        → { token, user }

GET    /api/projects               List my projects
POST   /api/projects               Create project (auto-creates 5 stages)
GET    /api/projects/:id           Get project
PATCH  /api/projects/:id           Update project
DELETE /api/projects/:id           Delete project (owner only)

GET    /api/stages?projectId=...   List stages
POST   /api/stages                 Create stage
PATCH  /api/stages/:id             Update stage
DELETE /api/stages/:id             Delete stage

GET    /api/tasks?projectId=...    List tasks (with assignee + stage)
POST   /api/tasks                  Create task
GET    /api/tasks/:id              Get task
PATCH  /api/tasks/:id              Update task (inline edit)
DELETE /api/tasks/:id              Delete task
POST   /api/tasks/reorder          Batch reorder (drag-and-drop)

GET    /api/users/me               Current user
GET    /api/users/project/:id      Project members
```

## Inline Editing

Task fields support click-to-edit directly in both Table and Board views:

- **Name**: click to activate input, Enter/Blur to save, Escape to cancel
- **Status**: click to open dropdown picker
- **Priority**: click to open dropdown picker
- **Stage**: drag card between board columns

Changes are sent immediately via `PATCH /api/tasks/:id` and invalidate the query cache for instant UI refresh.
