# =============================================================================
# Meta Certification Training Portal - Setup Script (Windows PowerShell)
# =============================================================================
# Bootstraps a Next.js + Supabase + Anthropic project.
#
# Usage (PowerShell, run as regular user):
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   .\setup.ps1 [-ProjectName "meta-cert-portal"]
#
# Note: This PowerShell script handles scaffolding, dependencies, shadcn,
# folders, and env files. The inline TypeScript files (Supabase clients,
# Anthropic client, middleware, types) are written by setup.sh — on Windows,
# either run setup.sh via WSL/Git Bash, or copy those code blocks manually
# from setup.sh after this script finishes.
# =============================================================================

param(
    [string]$ProjectName = "meta-cert-portal"
)

$ErrorActionPreference = "Stop"

function Log    { param($m) Write-Host "[setup] $m" -ForegroundColor Cyan }
function Ok     { param($m) Write-Host "[ ok ] $m" -ForegroundColor Green }
function Warn   { param($m) Write-Host "[warn] $m" -ForegroundColor Yellow }
function Fail   { param($m) Write-Host "[err ] $m" -ForegroundColor Red; exit 1 }

# ---------- Pre-flight ----------
Log "Running pre-flight checks..."

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Fail "Node.js is not installed. Install Node 18+ from https://nodejs.org"
}
$nodeVersion = (node -v).Substring(1).Split('.')[0]
if ([int]$nodeVersion -lt 18) {
    Fail "Node.js 18+ required. Current: $(node -v)"
}
Ok "Node.js $(node -v) detected"

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Warn "pnpm not found. Installing globally..."
    npm install -g pnpm
}
Ok "pnpm $(pnpm -v) ready"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Fail "git is not installed."
}
Ok "git detected"

# ---------- Create app ----------
if (Test-Path $ProjectName) {
    Fail "Directory '$ProjectName' already exists."
}

Log "Creating Next.js app: $ProjectName"
pnpm create next-app@latest $ProjectName `
    --typescript `
    --tailwind `
    --eslint `
    --app `
    --src-dir `
    --import-alias "@/*" `
    --use-pnpm `
    --no-turbopack

Set-Location $ProjectName
Ok "Next.js scaffolded"

# ---------- Install dependencies ----------
Log "Installing runtime dependencies..."
pnpm add `
    "@supabase/supabase-js" `
    "@supabase/ssr" `
    "@anthropic-ai/sdk" `
    "@microlink/mql" `
    "react-pdf" `
    "pdfjs-dist" `
    "@mux/mux-player-react" `
    "zod" `
    "react-hook-form" `
    "@hookform/resolvers" `
    "lucide-react" `
    "class-variance-authority" `
    "clsx" `
    "tailwind-merge" `
    "tailwindcss-animate" `
    "date-fns" `
    "sonner"
Ok "Runtime dependencies installed"

Log "Installing dev dependencies..."
pnpm add -D `
    "@types/node" `
    "prettier" `
    "prettier-plugin-tailwindcss" `
    "supabase"
Ok "Dev dependencies installed"

# ---------- shadcn/ui ----------
Log "Initializing shadcn/ui..."
pnpm dlx shadcn@latest init -d --yes

Log "Adding shadcn components..."
pnpm dlx shadcn@latest add -y `
    button card input label form dialog dropdown-menu select textarea `
    tabs table badge avatar separator toast sonner progress skeleton alert sheet
Ok "shadcn/ui configured"

# ---------- Supabase ----------
Log "Initializing Supabase..."
try { pnpm dlx supabase init } catch { Warn "Supabase init skipped" }

# ---------- Folder structure ----------
Log "Creating project folder structure..."
$folders = @(
    "src/app/(auth)/login",
    "src/app/(auth)/register",
    "src/app/(learner)/dashboard",
    "src/app/(learner)/tracks/[trackId]",
    "src/app/(learner)/lessons/[lessonId]",
    "src/app/(learner)/exam/[quizId]",
    "src/app/admin/tracks",
    "src/app/admin/modules",
    "src/app/admin/lessons",
    "src/app/admin/users",
    "src/app/admin/analytics",
    "src/app/api/ai/chat",
    "src/app/api/ai/generate-quiz",
    "src/app/api/upload",
    "src/components/admin",
    "src/components/learner",
    "src/components/content-viewers",
    "src/components/ai-tutor",
    "src/lib/supabase",
    "src/lib/anthropic",
    "src/lib/utils",
    "src/lib/validations",
    "src/types",
    "supabase/migrations",
    "supabase/seed",
    "docs/claude-project-knowledge"
)
foreach ($f in $folders) { New-Item -ItemType Directory -Force -Path $f | Out-Null }
Ok "Folder structure created"

# ---------- .env.local.example ----------
Log "Creating .env.local.example..."
@'
# =============================================================================
# Meta Cert Portal — Environment Variables
# Copy to .env.local and fill in real values. NEVER commit .env.local.
# =============================================================================

# --- Supabase ---
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# --- Anthropic ---
ANTHROPIC_API_KEY=sk-ant-your-key-here
ANTHROPIC_MODEL=claude-sonnet-4-5

# --- Mux (optional, for video) ---
MUX_TOKEN_ID=your-mux-token-id
MUX_TOKEN_SECRET=your-mux-token-secret

# --- App ---
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME="Meta Cert Portal"

# --- AI guardrails ---
AI_TUTOR_MAX_TOKENS_PER_DAY=50000
AI_TUTOR_MAX_REQUESTS_PER_HOUR=30
'@ | Out-File -FilePath ".env.local.example" -Encoding utf8

Copy-Item ".env.local.example" ".env.local"
Ok ".env files created"

# ---------- Append to .gitignore ----------
@'

# Meta Cert Portal additions
.env.local
.env*.local
supabase/.branches
supabase/.temp
supabase/seed/*.local.sql
.vscode/
.idea/
*.log
'@ | Add-Content -Path ".gitignore"
Ok ".gitignore updated"

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  Setup complete!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Project: $(Get-Location)"
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. cd $ProjectName"
Write-Host "  2. Edit .env.local with real keys"
Write-Host "  3. pnpm dev"
Write-Host ""
Write-Host "TypeScript library files (Supabase clients, Anthropic client,"
Write-Host "middleware, types) are written by setup.sh. On Windows, run setup.sh"
Write-Host "via WSL/Git Bash, or copy those blocks manually from setup.sh."
