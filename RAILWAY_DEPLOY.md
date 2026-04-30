# Deploying to Railway

The Next.js app lives in `meta-cert-portal/`. Railway is configured via
`meta-cert-portal/railway.json` (Nixpacks builder, `/api/health` as the
healthcheck endpoint, restart-on-failure with up to 5 retries).

> **Note on the original blueprint:** the locked stack specified Vercel.
> Railway is an alternate target — pick one. Don't deploy to both at
> the same time without coordinating env vars and Mux webhook URLs.

## Prerequisites

- A Railway account (https://railway.app/)
- The Railway CLI:
  ```bash
  # macOS / Linux
  curl -fsSL https://railway.com/install.sh | sh
  # or via Homebrew
  brew install railway
  # Windows (PowerShell)
  iwr -useb https://railway.app/install.ps1 | iex
  ```
- Your secrets ready (Supabase, Anthropic, Mux). Have `.env.local`
  filled in locally first; the script below reads it.

## One-time setup

```bash
# 1. Authenticate (opens a browser)
railway login

# 2. Create the project (from the repo root)
cd /path/to/Meta-Certified-Porta
railway init        # name it e.g. "meta-cert-portal"
                    # this creates an empty project + service

# 3. Link your local checkout to the project
railway link

# 4. Tell Railway the app lives in the meta-cert-portal/ subdirectory.
#    Either via CLI:
railway variables set RAILWAY_ROOT_DIRECTORY=meta-cert-portal
#    Or in the dashboard: Service → Settings → Root Directory
```

## Set environment variables

Set every variable from `meta-cert-portal/.env.local.example` plus
`MUX_SIGNING_KEY_ID`, `MUX_SIGNING_KEY_PRIVATE`, and `MUX_WEBHOOK_SECRET`.
The fastest way is to upload your local `.env.local` in one shot:

```bash
cd meta-cert-portal
# Bash uploads every KEY=VALUE pair from .env.local
while IFS='=' read -r key val; do
  # skip blank lines and comments
  [[ -z "$key" || "$key" == \#* ]] && continue
  # strip surrounding quotes from val if present
  val="${val%\"}"; val="${val#\"}"
  railway variables set "$key=$val"
done < .env.local
```

After upload, also set Railway-specific:

```bash
railway variables set NEXT_PUBLIC_APP_URL=https://your-railway-domain.up.railway.app
```

> The healthcheck (`/api/health`) is a **public** route in
> `proxy.ts`'s `PUBLIC_ROUTES`, so it'll respond before learners are
> authenticated.

## Deploy

```bash
cd meta-cert-portal
railway up
```

Railway uploads the directory (respecting `.railwayignore`), runs
Nixpacks (auto-detects pnpm via `pnpm-lock.yaml`, runs `pnpm install`
then `pnpm build`), and starts with `pnpm start`. Next.js' `next start`
honors Railway's injected `PORT` automatically.

To stream logs:

```bash
railway logs --tail
```

## Generate a public domain

```bash
railway domain
```

Note the URL it prints, then update `NEXT_PUBLIC_APP_URL` to that domain
and redeploy:

```bash
railway variables set NEXT_PUBLIC_APP_URL=https://<your-domain>
railway up
```

## Wire the Mux webhook

In the Mux dashboard:

- Webhook URL: `https://<your-domain>/api/mux/webhook`
- Copy the signing secret into Railway:
  ```bash
  railway variables set MUX_WEBHOOK_SECRET=<value>
  ```
- Redeploy: `railway up`

## CI / repeat deploys

```bash
railway up                    # deploy from local working tree
railway up --detach           # don't tail logs after deploy
railway redeploy              # redeploy current image
railway down                  # stop the service (keeps the project)
```

For a GitHub-Actions-driven deploy, generate a project token in the
Railway dashboard and set `RAILWAY_TOKEN` as a repo secret, then in
the workflow:

```yaml
- run: |
    curl -fsSL https://railway.com/install.sh | sh
    cd meta-cert-portal && railway up --detach
  env:
    RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

## Troubleshooting

**Build fails with "no package manager detected"** — make sure
`pnpm-lock.yaml` is committed (it is) and that the service Root
Directory is set to `meta-cert-portal`.

**`/api/health` returns 502** — Railway's healthcheck times out at 30s
(per `railway.json`); the first cold start can take longer. Either
bump `healthcheckTimeout` in `railway.json` and redeploy, or hit the
URL once after deploy to warm it.

**`MUX_SIGNING_KEY_PRIVATE` errors with "invalid key"** — the value
must be **base64-encoded** PEM (no literal newlines). Encode locally
with `cat key.pem | base64 -w0` and paste the result.

**Supabase RLS errors after deploy** — `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` must be set, and the migrations in
`supabase/migrations/` must have been applied to that project. Verify
with `pnpm db:migrate` against the same Supabase project before
deploying.
