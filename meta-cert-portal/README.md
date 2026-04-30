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
- `pnpm db:start` — start local Supabase
- `pnpm db:types` — regenerate TypeScript types from DB schema
- `pnpm format` — format with Prettier

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
