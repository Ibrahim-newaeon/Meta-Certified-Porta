#!/usr/bin/env bash
# =============================================================================
# Meta Certification Training Portal - Setup Script (Mac/Linux)
# =============================================================================
# Bootstraps a Next.js 14 + Supabase + Anthropic project with all dependencies,
# folder structure, env templates, and base configuration.
#
# Usage:
#   chmod +x setup.sh
#   ./setup.sh [project-name]
#
# Default project name: meta-cert-portal
# =============================================================================

set -e  # Exit on any error
set -u  # Exit on undefined variable

# ---------- Colors for output ----------
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log()    { echo -e "${BLUE}[setup]${NC} $1"; }
ok()     { echo -e "${GREEN}[ ok ]${NC} $1"; }
warn()   { echo -e "${YELLOW}[warn]${NC} $1"; }
err()    { echo -e "${RED}[err ]${NC} $1"; exit 1; }

# ---------- Config ----------
PROJECT_NAME="${1:-meta-cert-portal}"
NODE_MIN_VERSION=18

# ---------- Pre-flight checks ----------
log "Running pre-flight checks..."

# Check Node.js
if ! command -v node &> /dev/null; then
  err "Node.js is not installed. Install Node 18+ from https://nodejs.org"
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt "$NODE_MIN_VERSION" ]; then
  err "Node.js $NODE_MIN_VERSION+ required. Current: $(node -v)"
fi
ok "Node.js $(node -v) detected"

# Check / install pnpm
if ! command -v pnpm &> /dev/null; then
  warn "pnpm not found. Installing globally via npm..."
  npm install -g pnpm
fi
ok "pnpm $(pnpm -v) ready"

# Check git
if ! command -v git &> /dev/null; then
  err "git is not installed. Install git first."
fi
ok "git $(git --version | awk '{print $3}') detected"

# ---------- Create Next.js app ----------
if [ -d "$PROJECT_NAME" ]; then
  err "Directory '$PROJECT_NAME' already exists. Remove it or pick a different name."
fi

log "Creating Next.js 14 app: $PROJECT_NAME"
pnpm create next-app@latest "$PROJECT_NAME" \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --use-pnpm \
  --no-turbopack

cd "$PROJECT_NAME"
ok "Next.js scaffolded"

# ---------- Install runtime dependencies ----------
log "Installing runtime dependencies..."
pnpm add \
  @supabase/supabase-js \
  @supabase/ssr \
  @anthropic-ai/sdk \
  @microlink/mql \
  react-pdf \
  pdfjs-dist \
  @mux/mux-player-react \
  zod \
  react-hook-form \
  @hookform/resolvers \
  lucide-react \
  class-variance-authority \
  clsx \
  tailwind-merge \
  tailwindcss-animate \
  date-fns \
  sonner

ok "Runtime dependencies installed"

# ---------- Install dev dependencies ----------
log "Installing dev dependencies..."
pnpm add -D \
  @types/node \
  prettier \
  prettier-plugin-tailwindcss \
  supabase

ok "Dev dependencies installed"

# ---------- Initialize shadcn/ui ----------
log "Initializing shadcn/ui..."
pnpm dlx shadcn@latest init -d -y --base-color slate

# Install commonly used shadcn components
log "Adding shadcn components..."
pnpm dlx shadcn@latest add -y \
  button \
  card \
  input \
  label \
  form \
  dialog \
  dropdown-menu \
  select \
  textarea \
  tabs \
  table \
  badge \
  avatar \
  separator \
  toast \
  sonner \
  progress \
  skeleton \
  alert \
  sheet

ok "shadcn/ui configured"

# ---------- Initialize Supabase locally ----------
log "Initializing Supabase project (local CLI)..."
pnpm dlx supabase init || warn "Supabase init skipped (already initialized?)"

# ---------- Build folder structure ----------
log "Creating project folder structure..."

mkdir -p "src/app/(auth)/login"
mkdir -p "src/app/(auth)/register"
mkdir -p "src/app/(learner)/dashboard"
mkdir -p "src/app/(learner)/tracks/[trackId]"
mkdir -p "src/app/(learner)/lessons/[lessonId]"
mkdir -p "src/app/(learner)/exam/[quizId]"
mkdir -p src/app/admin/tracks
mkdir -p src/app/admin/modules
mkdir -p src/app/admin/lessons
mkdir -p src/app/admin/users
mkdir -p src/app/admin/analytics
mkdir -p src/app/api/ai/chat
mkdir -p src/app/api/ai/generate-quiz
mkdir -p src/app/api/upload
mkdir -p src/components/admin
mkdir -p src/components/learner
mkdir -p src/components/content-viewers
mkdir -p src/components/ai-tutor
mkdir -p src/lib/supabase
mkdir -p src/lib/anthropic
mkdir -p src/lib/utils
mkdir -p src/lib/validations
mkdir -p src/types
mkdir -p supabase/migrations
mkdir -p supabase/seed
mkdir -p docs/claude-project-knowledge

ok "Folder structure created"

# ---------- Create .env.local template ----------
log "Creating .env.local.example..."
cat > .env.local.example << 'EOF'
# =============================================================================
# Meta Cert Portal — Environment Variables
# Copy this file to .env.local and fill in real values.
# NEVER commit .env.local to git.
# =============================================================================

# --- Supabase ---
# Get from: https://supabase.com/dashboard/project/_/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here  # SECURITY: server-only, never expose

# --- Anthropic API ---
# Get from: https://console.anthropic.com/settings/keys
ANTHROPIC_API_KEY=sk-ant-your-key-here
ANTHROPIC_MODEL=claude-sonnet-4-5

# --- Mux (video streaming) ---
# Get from: https://dashboard.mux.com/settings/access-tokens
MUX_TOKEN_ID=your-mux-token-id
MUX_TOKEN_SECRET=your-mux-token-secret

# --- App config ---
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME="Meta Cert Portal"

# --- Rate limiting / AI guardrails ---
AI_TUTOR_MAX_TOKENS_PER_DAY=50000
AI_TUTOR_MAX_REQUESTS_PER_HOUR=30
EOF

# Also create the actual .env.local with placeholders
cp .env.local.example .env.local
ok ".env.local.example and .env.local created"

# ---------- Update .gitignore ----------
log "Updating .gitignore..."
cat >> .gitignore << 'EOF'

# Meta Cert Portal additions
.env.local
.env*.local
supabase/.branches
supabase/.temp
supabase/seed/*.local.sql

# Editor
.vscode/
.idea/
*.swp
.DS_Store

# Logs
*.log
EOF
ok ".gitignore updated"

# ---------- Create Supabase client utilities ----------
log "Creating Supabase client utilities..."

cat > src/lib/supabase/client.ts << 'EOF'
// Browser-side Supabase client (uses anon key, RLS enforced)
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
EOF

cat > src/lib/supabase/server.ts << 'EOF'
// Server-side Supabase client (for Server Components, Route Handlers, Server Actions)
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component: cookies cannot be set here. Safe to ignore.
          }
        },
      },
    }
  );
}
EOF

cat > src/lib/supabase/admin.ts << 'EOF'
// SECURITY: Service-role Supabase client. SERVER-ONLY. Bypasses RLS.
// Use only in trusted server-side contexts (API routes, server actions).
import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
EOF

ok "Supabase clients created"

# ---------- Create Anthropic client ----------
log "Creating Anthropic client..."

cat > src/lib/anthropic/client.ts << 'EOF'
// Server-only Anthropic client
import 'server-only';
import Anthropic from '@anthropic-ai/sdk';

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set');
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5';
EOF

cat > src/lib/anthropic/system-prompts.ts << 'EOF'
// System prompts tuned for Meta certification tutoring

export const META_TUTOR_SYSTEM_PROMPT = `You are an expert Meta Blueprint certification tutor. You help learners prepare for Meta's official certifications including:
- Meta Certified Digital Marketing Associate
- Meta Certified Media Buying Professional
- Meta Certified Marketing Science Professional
- Meta Certified Community Manager
- Meta Certified Creative Strategy Professional

Your responsibilities:
1. Explain Meta advertising concepts using official Blueprint terminology (campaigns, ad sets, ads, Advantage+, Conversions API, attribution, etc.)
2. Reference Meta's actual product names accurately (Meta Business Suite, Ads Manager, Events Manager, Commerce Manager)
3. When given study material as context, ground your answers in that material first
4. For exam-style questions, walk the learner through the reasoning, not just the answer
5. Flag outdated information — Meta's platform changes frequently

Constraints:
- Never fabricate exam questions claiming they are from real Meta exams
- If unsure about a current Meta feature, say so and suggest the learner verify on the Meta Business Help Center
- Keep responses focused; this is exam prep, not general marketing chat`;

export const QUIZ_GENERATOR_SYSTEM_PROMPT = `You generate exam-prep quiz questions in the style of Meta Blueprint certifications.

Output format: valid JSON only, matching this schema:
{
  "questions": [
    {
      "type": "multiple_choice" | "multi_select" | "scenario",
      "question": "string",
      "options": ["A", "B", "C", "D"],
      "correct_answers": [0],
      "explanation": "string",
      "difficulty": "easy" | "medium" | "hard",
      "topic": "string"
    }
  ]
}

Rules:
- Base questions ONLY on the provided source material
- Mirror Meta's real exam style: scenario-based, application-focused, not pure recall
- Include 1 distractor that reflects a common misconception
- Explanations must reference the source material`;
EOF

ok "Anthropic client and prompts created"

# ---------- Create middleware for auth ----------
log "Creating auth middleware..."

cat > src/middleware.ts << 'EOF'
// SECURITY: Route protection middleware. Runs on every request.
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/login', '/register', '/'];
const ADMIN_ROUTES = ['/admin'];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // SECURITY: Redirect unauthenticated users away from protected routes
  const isPublic = PUBLIC_ROUTES.some(r => path === r || path.startsWith(r + '/'));
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', path);
    return NextResponse.redirect(url);
  }

  // SECURITY: Admin route check — verify role from profiles table
  if (user && ADMIN_ROUTES.some(r => path.startsWith(r))) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
EOF

ok "Auth middleware created"

# ---------- Create base types ----------
log "Creating TypeScript types..."

cat > src/types/database.ts << 'EOF'
// Database row types — regenerate with: pnpm db:types
// Until then, these are placeholders matching the planned schema.

export type UserRole = 'admin' | 'learner';
export type ResourceType = 'link' | 'pdf' | 'video';
export type CertificationExam =
  | 'digital_marketing_associate'
  | 'media_buying_professional'
  | 'marketing_science_professional'
  | 'community_manager'
  | 'creative_strategy_professional';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}

export interface CertificationTrack {
  id: string;
  title: string;
  exam: CertificationExam;
  description: string | null;
  cover_image_url: string | null;
  created_at: string;
}

export interface Module {
  id: string;
  track_id: string;
  title: string;
  order_index: number;
  created_at: string;
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  order_index: number;
  estimated_minutes: number | null;
  created_at: string;
}

export interface Resource {
  id: string;
  lesson_id: string;
  type: ResourceType;
  title: string;
  url: string | null;          // for link/video
  storage_path: string | null; // for pdf in Supabase Storage
  mux_playback_id: string | null; // for hosted video
  metadata: Record<string, unknown>;
  created_at: string;
}
EOF

ok "Types created"

# ---------- Create package.json scripts ----------
log "Adding npm scripts..."
node << 'EOF'
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.scripts = {
  ...pkg.scripts,
  "db:start": "supabase start",
  "db:stop": "supabase stop",
  "db:reset": "supabase db reset",
  "db:migrate": "supabase migration up",
  "db:types": "supabase gen types typescript --local > src/types/supabase.ts",
  "db:diff": "supabase db diff",
  "format": "prettier --write \"**/*.{ts,tsx,md,json}\"",
  "format:check": "prettier --check \"**/*.{ts,tsx,md,json}\""
};
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
EOF
ok "Scripts added to package.json"

# ---------- Create Prettier config ----------
cat > .prettierrc.json << 'EOF'
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "plugins": ["prettier-plugin-tailwindcss"]
}
EOF
ok "Prettier configured"

# ---------- Create README ----------
log "Creating README..."
cat > README.md << EOF
# $PROJECT_NAME

Meta Certification Training Portal — Next.js 14 + Supabase + Anthropic Claude.

## Quick Start

\`\`\`bash
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
\`\`\`

App runs at http://localhost:3000

## Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui
- **Backend:** Next.js API Routes + Server Actions
- **Database:** PostgreSQL via Supabase
- **Auth:** Supabase Auth (email/password + magic link)
- **Storage:** Supabase Storage (PDFs) + Mux (video)
- **AI:** Anthropic Claude Sonnet 4.5 (tutor + quiz generation)

## Project Structure

See \`docs/claude-project-knowledge/\` for the seven Claude Project knowledge files.

## Scripts

- \`pnpm dev\` — start dev server
- \`pnpm build\` — production build
- \`pnpm db:start\` — start local Supabase
- \`pnpm db:types\` — regenerate TypeScript types from DB schema
- \`pnpm format\` — format with Prettier
EOF
ok "README created"

# ---------- Final summary ----------
echo ""
echo -e "${GREEN}================================================================${NC}"
echo -e "${GREEN}  Setup complete!${NC}"
echo -e "${GREEN}================================================================${NC}"
echo ""
echo "Project location: $(pwd)"
echo ""
echo "Next steps:"
echo "  1. cd $PROJECT_NAME"
echo "  2. Edit .env.local with your real Supabase + Anthropic keys"
echo "  3. (Optional) pnpm db:start    # local Supabase via Docker"
echo "  4. pnpm dev                    # start dev server"
echo ""
echo "Don't have keys yet?"
echo "  - Supabase:  https://supabase.com/dashboard"
echo "  - Anthropic: https://console.anthropic.com/settings/keys"
echo "  - Mux:       https://dashboard.mux.com (optional, for video)"
echo ""
