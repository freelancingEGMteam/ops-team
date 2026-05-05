# Session Context - Ops Team Stable UI

Date: 2026-05-05
Repository: https://github.com/freelancingEGMteam/ops-team
Primary deploy target: Cloudflare Pages project `ops-web`
Cloudflare Pages root: `cf-app/web`
Build command: `pnpm install && pnpm build`
Build output: `dist`
Production branch: `main`

## Stable Tag

This session is intended to be saved as the current stable production version with tag:

`stable-2026-05-05-ops-ui`

## Recent Git History Before This Session Commit

- `fb2fe0d feat(cf-app): layout styling, task panel, pipeline rename, user management`
- `4b37b3f chore: add tsconfig.tsbuildinfo build artifact`
- `d4b4507 feat: layout styling, task panel, board removal, user management`
- `eb1108d Set real D1 database_id in api/wrangler.toml`
- `919c2cd Fix tsconfig ignoreDeprecations incompatible with TS 5.9`
- `e1b6aeb Remove unsupported [build] section from Pages wrangler.toml`
- `534dd00 Fix Cloudflare Pages pnpm detection for cf-app/web`
- `4c56961 Merge pull request #1 from freelancingEGMteam/claude/cloudflare-native-rebuild-B6rUL`

## User Requests In This Session

1. Connect local work to the public GitHub repo and Cloudflare Pages site.
2. Edit the project task page:
   - Add more margin when tasks are grouped.
   - Remove the old Board naming/button and use Pipeline.
   - Make table column headers dark navy with white text.
   - Add a drag handle on the left of each task row for ordering.
   - Add a task detail panel for comments, attachments, and large text.
   - Add a user management page listing users for assignment.
3. Make table fields editable:
   - Status dropdown in the table and right panel.
   - Priority dropdown in the table and right panel.
   - Stage dropdown in the table and right panel.
   - Due date calendar input in the table and right panel.
   - Add Channel column with BIV and EGM.
   - Replace the long add-task row with individual cells matching columns.
4. Add a Google Drive link field above Description in task details.
5. Restore project view controls:
   - Group by field with Stage, Channel, Status, Priority, Assignee.
   - Save View button.
   - Calendar view next to Table and Pipeline.
6. Update stage values to:
   - Idea Only
   - Script/Lyrics Generation
   - Audio/Album Generation
   - Image/Video Generation
   - Video Editing
   - SEO&Metadata
   - Final Revision
   - Modifications Needed
7. Bring back Time Tracker in the left menu.
8. Remove My Tasks from the left menu.
9. Remove redundant top-level Projects nav item because the left Projects section already exists.
10. Improve Calendar so it looks like a real month calendar with task name and assignee in the date cells.
11. Deduplicate stage values in dropdowns and Pipeline.
12. Make Time Tracker rows always editable:
    - Start date
    - Task
    - Price
    - Channel
    - Delivery date
    - Status
13. Remove the unclear Time Tracker note.
14. Update dashboard summary cards to task status counts:
    - To Do
    - In Progress
    - In Review
    - Done
    - Cancelled

## Main Files Changed

Frontend:

- `cf-app/web/src/components/tasks/TaskTable.tsx`
- `cf-app/web/src/components/tasks/TaskDetailPanel.tsx`
- `cf-app/web/src/components/tasks/TaskInlineEdit.tsx`
- `cf-app/web/src/components/tasks/TaskCalendar.tsx`
- `cf-app/web/src/components/tasks/TaskPipeline.tsx`
- `cf-app/web/src/pages/ProjectDetail.tsx`
- `cf-app/web/src/pages/TimeTracker.tsx`
- `cf-app/web/src/pages/Dashboard.tsx`
- `cf-app/web/src/pages/Users.tsx`
- `cf-app/web/src/components/layout/Sidebar.tsx`
- `cf-app/web/src/App.tsx`
- `cf-app/web/src/lib/api.ts`
- `cf-app/web/src/types/index.ts`

Backend:

- `cf-app/api/src/db/schema.ts`
- `cf-app/api/src/routes/tasks.ts`
- `cf-app/api/src/routes/projects.ts`
- `cf-app/api/src/routes/users.ts`

Migrations added:

- `cf-app/api/migrations/0002_task_attachments.sql`
- `cf-app/api/migrations/0003_task_channel.sql`
- `cf-app/api/migrations/0004_task_link.sql`
- `cf-app/migrations/0002_task_attachments.sql`
- `cf-app/migrations/0003_task_channel.sql`
- `cf-app/migrations/0004_task_link.sql`

## Important Deployment Notes

Cloudflare Pages should redeploy the frontend automatically after pushing `main`.

Final production state from this session:

- Latest pushed commit on `main`: `81eab38 fix: default web api to production worker`
- Stable tag: `stable-2026-05-05-ops-ui`
- API Worker: `https://ops-api.matiasvalencas.workers.dev`
- Latest verified Worker version from deploy: `7f5ef06b-1934-408d-afe0-91fcda65726a`
- Pages production deployment URL: `https://b45604a2.ops-web-siu.pages.dev`
- Pages production URL: `https://ops-web-siu.pages.dev`
- Note: the `ops-web` Pages project production branch is `claude/cloudflare-native-rebuild-B6rUL`; deploying to `main` creates a preview only for this project.
- Production D1 migrations applied remotely through `0004_task_link.sql`.
- `JWT_SECRET` is stored in Cloudflare as a Worker secret, not committed in `wrangler.toml`.
- API CORS allows local dev plus `https://ops-web-siu.pages.dev`.
- Web config points `VITE_API_URL` to `https://ops-api.matiasvalencas.workers.dev`.
- The web API client also defaults to `https://ops-api.matiasvalencas.workers.dev` if no Pages build variable is present.

The backend changes require deploying the Cloudflare Worker API and applying D1 migrations in production:

```powershell
cd cf-app/api
corepack pnpm db:migrate:prod
corepack pnpm deploy
```

The frontend can be deployed through the connected Cloudflare Pages Git integration, or manually:

```powershell
cd cf-app/web
corepack pnpm build
corepack pnpm deploy
```

## Validation Run During Session

- `corepack pnpm typecheck` in `cf-app/api` passed.
- `corepack pnpm build` in `cf-app/web` passed.
- Live health check passed: `https://ops-api.matiasvalencas.workers.dev/health`.
- CORS was verified for origin `https://ops-web-siu.pages.dev`.
- Production Pages bundle was verified to include `ops-api.matiasvalencas.workers.dev`.
- Production Pages root was verified to serve `assets/index-Bq4zj_AM.js`.

## Preview Account Used Locally

Local preview account:

- Email: `preview@example.com`
- Password: `password123`

This account and seeded data are local development data only.
