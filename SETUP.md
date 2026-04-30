# Meta Cert Portal — Setup Scripts

Two setup scripts that bootstrap the entire project from zero.

## What it installs

| Layer         | Tool |
|---------------|------|
| Framework     | Next.js (App Router) + TypeScript + Tailwind |
| UI Kit        | shadcn/ui (18 components pre-installed) |
| Auth/DB       | Supabase (`@supabase/ssr`, `@supabase/supabase-js`) + Supabase CLI |
| AI            | Anthropic SDK (`@anthropic-ai/sdk`) |
| PDF           | `react-pdf` + `pdfjs-dist` |
| Video         | `@mux/mux-player-react` |
| Link previews | `@microlink/mql` |
| Forms         | `react-hook-form` + `zod` |
| Misc          | `lucide-react`, `sonner`, `date-fns`, Prettier |

## What it creates

- Full Next.js project with App Router
- Folder structure for admin / learner / API / lib / types / Supabase migrations
- `src/lib/supabase/{client,server,admin}.ts` — three Supabase clients (browser, server, service-role)
- `src/lib/anthropic/{client,system-prompts}.ts` — Anthropic client + Meta-tuned system prompts
- `src/middleware.ts` — auth + admin route protection
- `src/types/database.ts` — base TypeScript types
- `.env.local.example` + `.env.local` — environment template
- Updated `.gitignore`, Prettier config, npm scripts (`db:start`, `db:types`, etc.)
- README in the new project

## Prerequisites

- **Node.js 18+** — https://nodejs.org
- **git**
- **pnpm** — auto-installed by the script if missing
- **Docker Desktop** — only needed if you want to run Supabase locally (`pnpm db:start`)

## Running it

### Mac / Linux

```bash
chmod +x setup.sh
./setup.sh                    # creates ./meta-cert-portal
./setup.sh my-portal-name     # custom name
```

### Windows (PowerShell)

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\setup.ps1
.\setup.ps1 -ProjectName "my-portal-name"
```

> Note: the PowerShell version handles scaffolding, dependencies, shadcn,
> folders, and env files. For the inline TypeScript files (Supabase clients,
> middleware, etc.), the bash script writes them automatically — on Windows
> you can either run the bash script via WSL/Git Bash, or copy those code
> blocks from `setup.sh` manually.

## After setup

```bash
cd meta-cert-portal

# 1. Get your keys
#    Supabase:  https://supabase.com/dashboard  →  Settings → API
#    Anthropic: https://console.anthropic.com/settings/keys
#    Mux:       https://dashboard.mux.com (optional, for video)

# 2. Edit .env.local and paste them in

# 3. Start dev server
pnpm dev
```

Open http://localhost:3000

## Optional: local Supabase via Docker

If you'd rather run Supabase locally instead of using the hosted version:

```bash
pnpm db:start          # boots Postgres + Auth + Storage + Studio in Docker
pnpm db:migrate        # applies migrations from supabase/migrations/
pnpm db:types          # generates TypeScript types from your schema
pnpm db:stop           # shut down when done
```

Studio runs at http://localhost:54323.

## Troubleshooting

**"pnpm: command not found"** — the script auto-installs it, but if that fails: `npm install -g pnpm`

**Supabase CLI fails to init** — make sure Docker Desktop is running (only needed for local DB). Skipping it is fine if you're using hosted Supabase.

**shadcn install fails (`host_not_allowed` or registry 403)** — your network blocks `ui.shadcn.com`. Run on a network with outbound access:
```bash
pnpm dlx shadcn@latest init -d
pnpm dlx shadcn@latest add -y button card input label form dialog \
  dropdown-menu select textarea tabs table badge avatar separator \
  toast sonner progress skeleton alert sheet
```

**`--base-color` flag unknown** — newer shadcn dropped that flag. Use `pnpm dlx shadcn@latest init -d --yes` instead.

**Permission denied on setup.sh** — `chmod +x setup.sh`
