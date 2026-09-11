# Eternal Grace Hub

Production web platform for Eternal Grace Hub. The app is a standalone pnpm workspace built with Astro SSR, React, Supabase, Stripe Checkout/Tax, Resend, and Vercel.

The production catalog intentionally starts empty. The former `data.js` content remains a development reference only and is never imported by the production application.

## Local development

Requirements: Node.js 22.12+, pnpm 10, Docker Desktop for the local Supabase stack, and the Supabase CLI installed through this workspace.

```bash
pnpm install
copy .env.example .env.local
pnpm db:start
pnpm dev
```

The app runs at `http://localhost:4321`. Supabase Studio runs at `http://localhost:54323` after `pnpm db:start`.

## Verification

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm functions:check
pnpm build
pnpm db:test
pnpm exec playwright install chromium
pnpm test:e2e
pnpm test:lighthouse
```

Database tests require the local Supabase stack. End-to-end tests use the local Astro server automatically unless `PLAYWRIGHT_BASE_URL` is set.

## Production configuration

Copy every required variable from `.env.example` into the corresponding Supabase Edge Function or Vercel environment. Never store Stripe, Resend, or service-role secrets in `site_settings` or a `PUBLIC_*` variable.

Before launch:

- Create separate Supabase and Stripe projects for test and production.
- Configure Google OAuth in Supabase with `/auth/callback` as an allowed redirect.
- Create and verify the two private storage buckets and the public media bucket by applying the migration.
- Configure the Stripe webhook endpoint at `/functions/v1/stripe-webhook` and subscribe to Checkout completion, async payment, and refund events.
- Enable Stripe Tax registrations and assign a tax code to every paid product.
- Verify the Resend sending domain and set `RESEND_FROM_EMAIL` and `STAFF_ALERT_EMAIL`.
- Configure Supabase backups and webhook monitoring.
- Set `PUBLIC_SITE_URL`, `PUBLIC_SUPABASE_URL`, and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` in both Vercel preview and production environments.
- Apply migrations, deploy Edge Functions, then bootstrap the first owner once with `pnpm db:bootstrap-owner`.

Vercel build settings:

- Root directory: `EGHUB` when importing the parent repository
- Build command: `pnpm build`
- Node version: 22

Vercel can deploy from the dashboard after connecting the repository, or from the included `pnpm deploy` command once `vercel login` or a `VERCEL_TOKEN` is configured. The optional GitHub workflow requires the production environment secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID`, plus the environment variable `EGHUB_DEPLOY_ENABLED=true`.

## Database and function deployment

Link the desired Supabase project before running production commands:

```bash
pnpm exec supabase link --project-ref YOUR_PROJECT_REF
pnpm exec supabase db push
pnpm exec supabase functions deploy
```

Run `pnpm db:types` after every schema change and commit the generated frontend types. The browser uses only the publishable key; privileged writes happen inside authenticated Edge Functions with service-role access.

## Access model

- `customer`: own profile, cart, orders, and lifetime downloads.
- `support`: customers, receipts, downloads, and refunds.
- `editor`: uploads and draft/review catalog content.
- `admin`: publishing, catalog, commerce, customers, refunds, and non-owner staff.
- `owner`: unrestricted operational and staff access.

Self-registration always creates a customer. Staff access is invitation-only, and profile updates cannot change role or account status through the browser.
