# Spread Turn Tracker — v2

React + TypeScript + Vite SPA using **Supabase Auth**, **Postgres**, and **RLS**. Scheduling and progress rules live in `src/domain` with Vitest coverage.

## Prerequisites

- Node 20+
- A Supabase project (or [local Supabase](https://supabase.com/docs/guides/cli))

## Setup

```bash
cd app-v2
cp .env.example .env
# Edit .env with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (required for production / hosted Supabase).
# Without .env, the dev build falls back to the default local Supabase URL and anon key from `supabase start`.
```

Apply database migrations (from repo root or `app-v2`):

```bash
# Using Supabase CLI linked to your project:
supabase db push
# Or paste SQL from supabase/migrations into the Supabase SQL editor.
```

In **Authentication → URL configuration**, add your dev origin (e.g. `http://127.0.0.1:5173`) to redirect URLs if you use email confirmation.

## Scripts

| Command | Purpose |
|--------|---------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run test` | Vitest (domain + Zod) |
| `npm run test:e2e` | Playwright (starts dev server; see below) |

## First-time user flow

1. Open the app → **Sign in** or **Create account**.
2. If the user has **no** `household_members` row, the app calls the RPC **`bootstrap_household`**, which creates a household, adds the user as **owner**, creates a default **patient** (“Child”), and a default **treatment plan** (27 / 23, every 2 days).

To add another caregiver, an **owner** can insert a row into `household_members` for the other user’s `profiles.id` (after they sign up). Optional future work: invite flow via Edge Function.

## Playwright

Public test (login page) runs without credentials. Authenticated flows require:

```bash
set E2E_EMAIL=you@example.com
set E2E_PASSWORD=yourpassword
npm run test:e2e
```

(On Unix: `export E2E_EMAIL=...`.)

## Deploy

Build static assets with `npm run build` and host `dist/` on any static host (e.g. Vercel, Netlify). Configure the same Supabase URL and anon key. Do **not** expose the service role key in the browser.

## Migration from v1

See [MIGRATION.md](./MIGRATION.md).
