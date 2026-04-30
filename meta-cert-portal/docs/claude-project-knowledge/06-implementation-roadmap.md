# 06 — Implementation Roadmap

Each phase is fully executable. Run the pnpm commands, create the listed files, paste the **Claude Project Prompt** into your Claude Project to generate the code, then run the verification checklist before moving on.

## Phase 0 — Bootstrap ✅ DONE

`setup.sh` (or `setup.ps1` on Windows) creates the Next.js project, installs deps, scaffolds folders, writes Supabase/Anthropic clients, middleware, and base types. shadcn install needs network access to `ui.shadcn.com` — finish locally:

```bash
pnpm dlx shadcn@latest init -d --yes
pnpm dlx shadcn@latest add -y button card input label form dialog \
  dropdown-menu select textarea tabs table badge avatar separator \
  toast sonner progress skeleton alert sheet
```

## Phase 1 — Database & RLS ✅ DONE

Migrations are in `supabase/migrations/`:
- `0001_init.sql` — tables + enums
- `0002_functions.sql` — `is_admin`, `is_enrolled_in_lesson`
- `0003_rls.sql` — all RLS policies + column-level revoke for `is_correct`
- `0004_storage.sql` — buckets + storage policies

Seed: `supabase/seed.sql` (six certification tracks).

Test script: `tests/rls.sql` — the three RLS guarantees.

### Commands
```bash
pnpm db:start            # local Postgres via Docker
pnpm db:migrate          # apply migrations
pnpm exec supabase db execute -f tests/rls.sql  # verify RLS
```

### Verification
- `select tablename, rowsecurity from pg_tables where schemaname='public';` → every table has `rowsecurity=true`.
- `tests/rls.sql` reports all three guarantees pass.
- 6 rows in `certification_tracks`.

---

## Phase 2 — Auth pages

### Commands
```bash
mkdir -p src/lib/auth src/app/auth/callback src/components/shared
```

### Files to create
- `src/lib/auth/roles.ts` (doc 02 § 5).
- `src/app/(auth)/login/{page.tsx,actions.ts}` (doc 02 § 6).
- `src/app/auth/callback/route.ts` (doc 02 § 7).
- `src/components/shared/login-form.tsx`.

### Verification
- Sign up, then in SQL editor `update profiles set role='admin' where email='you@x.com'`.
- `/admin` while logged out → `/login?next=/admin`.
- `/admin` as learner → redirects to `/dashboard`.
- Magic link round-trip works.

### Claude Project Prompt
> Execute Phase 2 from `06-implementation-roadmap.md`. Generate every file listed in `02-auth-and-roles.md`. Add a `/api/health` route that returns `{ ok: true }` so middleware can be smoke-tested. Then output a Playwright spec covering the three middleware redirect cases.

---

## Phase 3 — Admin panel

### Files to create
All files listed in `03-admin-panel.md` § 2, plus:
- `src/lib/pdf/extract.ts` (doc 03 § 4.2).
- `src/lib/mux/client.ts` (doc 03 § 4.3).
- `src/app/api/mux/webhook/route.ts` (doc 03 § 4.3).

### Verification
- Create a track; toggle `is_published`; learner-side `/tracks` shows it.
- Upload a PDF; confirm `resources.extracted_text` length > 0.
- Upload a video; webhook flips `video_asset_id` from `pending` to a real Mux ID.
- Promote a learner to admin via the Users page.

### Claude Project Prompt
> Execute Phase 3 from `06-implementation-roadmap.md`. Generate the full admin module per `03-admin-panel.md`, including the Mux upload flow with `@mux/upchunk` and the webhook handler with HMAC verification. Use shadcn/ui components by name. After generation, output a 5-step manual QA script.

---

## Phase 4 — Learner content delivery

### Files to create
All files listed in `04-content-delivery.md` § 2, plus `src/lib/signing.ts` (doc 04 § 5).

### Verification
- Enroll in a track; lesson list renders.
- PDF resource opens with signed URL; nav buttons work; resume restores last page.
- Mux video resumes within 5 s of last position.
- Mock-exam timer counts down; auto-submit at 0; result page shows score and pass/fail.

### Claude Project Prompt
> Execute Phase 4 from `06-implementation-roadmap.md`. Generate the learner UI per `04-content-delivery.md`. Make sure `react-pdf` worker is loaded from a CDN matching `pdfjs.version`. Add `src/app/(learner)/exam/[quizId]/result/page.tsx` to render score, pass/fail, and per-question correctness using the freshly written `quiz_answers`.

---

## Phase 5 — AI tutor + quiz generation

### Files to create
- `src/lib/anthropic/{budget,quiz-schema}.ts` (doc 05 § 3, § 7).
- `src/app/api/ai/chat/route.ts` (doc 05 § 5).
- `src/app/api/ai/generate-quiz/route.ts` (doc 05 § 7).
- `src/components/ai-tutor/chat-panel.tsx` (doc 05 § 6).

### Verification
- Open a lesson; chat panel streams a Claude response that references the PDF.
- Burn through the daily limit → 429.
- Admin → "Generate quiz from PDF" → new quiz row + 10 questions + options with mixed correctness.
- Service role queries confirm `is_correct` is populated; learner UI never receives it.

### Claude Project Prompt
> Execute Phase 5 from `06-implementation-roadmap.md`. Generate every file in `05-ai-tutor-integration.md` and wire the chat panel into `src/app/(learner)/lessons/[lessonId]/page.tsx` as a right-side drawer using shadcn `Sheet`. Add a unit test for the SSE forwarding and an integration test for `generate-quiz` that mocks `anthropic.messages.create` to return a tool_use block with three valid questions.

---

## Phase 6 — Polish & deploy

### Commands
```bash
pnpm add -D @playwright/test
pnpm exec playwright install --with-deps

pnpm dlx vercel link
# Add env vars (see .env.local.example) for production
pnpm dlx vercel deploy --prod
```

### Files to create / update
- `next.config.ts` — `images.remotePatterns` for Supabase Storage public buckets, `transpilePackages: ['react-pdf']` if needed.
- `src/app/error.tsx`, `src/app/not-found.tsx`.
- `src/app/sitemap.ts`, `src/app/robots.ts`.
- `tests/e2e/*.spec.ts` — auth, enroll, lesson resume, mock exam.

### Verification (production smoke tests)
- [ ] Sign up → magic link → `/dashboard`.
- [ ] Enroll → lesson PDF, link, video each render under 3 s TTFB.
- [ ] Mux webhook recorded in Vercel logs after a real upload.
- [ ] AI chat streams in production; daily cap enforced.
- [ ] `/admin` denies a learner; admin Users page can promote/demote.
- [ ] Mock exam: timer counts down, auto-submits, persists score.

---

## Phase summary timeline

| Phase | Estimated effort | Status |
|---|---|---|
| 0 — Bootstrap | 1 h | ✅ done |
| 1 — DB + RLS | 2 h | ✅ done |
| 2 — Auth pages | 2 h | next |
| 3 — Admin panel | 6 h | |
| 4 — Learner UI | 6 h | |
| 5 — AI tutor | 4 h | |
| 6 — Polish & deploy | 3 h | |
| **Total** | **~24 h** | |

## Final Claude Project Prompt

> Read all seven knowledge files. Walk me through Phase 2 → Phase 6 sequentially (Phases 0 and 1 are already complete). Before each phase, list the files you will create, ask me to confirm, then generate them. After each phase, run through the verification checklist and report any failures along with the diffs needed to fix them. Do not advance to the next phase until I type "next".
