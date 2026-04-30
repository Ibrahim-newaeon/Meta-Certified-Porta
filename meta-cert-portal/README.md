# meta-cert-portal

Meta Certification Training Portal — Next.js (App Router) + Supabase + Anthropic Claude.

> Note: `create-next-app` installed **Next.js 16.2.4** (the current stable). The
> blueprint targeted "Next.js 14+", and 16 satisfies that. APIs in `cookies()`
> and the App Router differ from Next 14 — see `AGENTS.md` and the docs in
> `node_modules/next/dist/docs/` for current usage.

## Quick Start

```bash
# 1. Fill in environment variables
cp .env.local.example .env.local
# Edit .env.local with your Supabase + Anthropic keys

# 2. Start Supabase locally (requires Docker)
pnpm db:start

# 3. Run migrations
pnpm db:migrate

# 4. Generate database types
pnpm db:types

# 5. Start dev server
pnpm dev
```

App runs at http://localhost:3000

## Stack

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- **Backend:** Next.js API Routes + Server Actions
- **Database:** PostgreSQL via Supabase
- **Auth:** Supabase Auth (email/password + magic link)
- **Storage:** Supabase Storage (PDFs) + Mux (video)
- **AI:** Anthropic Claude Sonnet 4.5 (tutor + quiz generation)

## Project Structure

See `docs/claude-project-knowledge/` for the seven Claude Project knowledge files
(`00-project-overview.md` through `06-implementation-roadmap.md`).

## Scripts

- `pnpm dev` — start dev server
- `pnpm build` — production build
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm lint` — ESLint
- `pnpm db:start` / `db:migrate` / `db:types` — local Supabase
- `pnpm test:e2e:install` then `pnpm test:e2e` — Playwright E2E (needs `@playwright/test`)
- `pnpm format` — Prettier

## Deploy to Vercel

Set these environment variables (the `NEXT_PUBLIC_` ones are visible in
the browser; everything else is server-only — never prefix a server-only
secret with `NEXT_PUBLIC_`):

| Variable | Scope | Source |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | **server-only** | Supabase → Settings → API |
| `ANTHROPIC_API_KEY` | **server-only** | console.anthropic.com |
| `ANTHROPIC_MODEL` | server-only | `claude-sonnet-4-5` |
| `MUX_TOKEN_ID` / `MUX_TOKEN_SECRET` | **server-only** | dashboard.mux.com |
| `MUX_SIGNING_KEY_ID` | server-only | Mux signing keys |
| `MUX_SIGNING_KEY_PRIVATE` | **server-only** | base64 of the PEM |
| `MUX_WEBHOOK_SECRET` | **server-only** | Mux webhook config |
| `NEXT_PUBLIC_APP_URL` | public | `https://your-domain.com` |
| `AI_TUTOR_MAX_REQUESTS_PER_HOUR` | server-only | default `30` |
| `AI_TUTOR_MAX_TOKENS_PER_DAY` | server-only | default `50000` |

Then:

```bash
pnpm dlx vercel link
# Add each var above with `vercel env add <NAME> production`
pnpm dlx vercel deploy --prod
```

After the first deploy, in Mux's dashboard configure the webhook to POST to
`https://your-domain.com/api/mux/webhook` and copy the signing secret into
`MUX_WEBHOOK_SECRET`.

## Architecture & build phases

The seven Claude-Project knowledge files in `docs/claude-project-knowledge/`
(`00-project-overview.md` through `06-implementation-roadmap.md`) document
the schema, RLS policies, route structure, and phase-by-phase build plan.

## shadcn/ui

`setup.sh` attempted `pnpm dlx shadcn@latest init` but the registry
(`ui.shadcn.com`) was unreachable from the sandbox. Finish the UI install
locally:

```bash
pnpm dlx shadcn@latest init -d
pnpm dlx shadcn@latest add -y button card input label form dialog \
  dropdown-menu select textarea tabs table badge avatar separator \
  toast sonner progress skeleton alert sheet
```
