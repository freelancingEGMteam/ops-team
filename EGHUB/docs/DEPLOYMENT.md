# EGHUB deployment runbook

EGHUB uses Vercel for the Astro SSR frontend and Supabase for authentication, Postgres, storage, and Edge Functions. Stripe handles checkout and tax; Resend handles transactional email.

## Vercel

Import the repository into Vercel with `EGHUB` as the project root, or deploy the prebuilt output with `pnpm deploy` after authenticating the Vercel CLI.

Use Node 22 and the checked-in `pnpm-lock.yaml`. The repository includes `vercel.json` with the build and install commands.

Set these variables in Vercel Preview and Production environments:

```text
PUBLIC_SITE_URL=https://your-production-domain.example
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

## Supabase

Link the production project, apply migrations, and deploy functions:

```bash
pnpm exec supabase link --project-ref YOUR_PROJECT_REF
pnpm exec supabase db push
pnpm exec supabase functions deploy
```

Set these Edge Function secrets with `supabase secrets set`:

```text
SUPABASE_URL
SUPABASE_SECRET_KEY
SITE_URL
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
RESEND_API_KEY
RESEND_FROM_EMAIL
STAFF_ALERT_EMAIL
```

Configure the production auth site URL and `/auth/callback` redirect, enable the selected OAuth providers, and verify that the migration created the `public-media`, `private-downloads`, and `source-media` buckets.

Create and verify the first user, then assign the owner role once:

```bash
pnpm db:bootstrap-owner
```

## Stripe and Resend

- Use live Stripe keys only after completing Stripe Tax registrations and assigning tax codes to paid products.
- Point the Stripe webhook at `https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook` and subscribe to checkout completion, asynchronous payment, and refund events.
- Verify the Resend sending domain before enabling receipts or staff alerts.

## GitHub deployment workflow

The optional `.github/workflows/eghub-deploy.yml` workflow is gated until the production environment variable `EGHUB_DEPLOY_ENABLED` is set to `true`. Add these production environment secrets before enabling it:

```text
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
```

The existing EGHUB CI workflow should pass before enabling production deploys.
