# 00 — Project Overview: Meta Certified Porta

## 1. Executive Summary

**Meta Certified Porta** is a learning portal that prepares candidates for Meta's Blueprint certification exams (Digital Marketing Associate, Media Buying Professional, Marketing Science Professional, Community Manager, Creative Strategy Professional, etc.). It centralizes three content types — **external links, PDFs, and videos** — under a hierarchy of `Track → Module → Lesson → Resource`, tracks per-learner progress, and exposes a Claude-powered AI tutor that can answer questions, summarize PDFs, and generate Meta-style practice quizzes.

The platform is a single Next.js 14 (App Router) codebase deployed to Vercel, backed by Supabase (Postgres + Auth + Storage + RLS). Video streaming is offloaded to Mux (or Bunny.net Stream) for HLS playback. Anthropic's Messages API (Claude Sonnet 4.5) drives the tutor.

## 2. Goals

- **Admin** can upload Meta certification study material in three formats (link, PDF, video) and organize it into tracks/modules/lessons.
- **Learner** can browse certification tracks, consume resources with adaptive rendering, track progress, take Meta-style quizzes (single-select, multi-select, scenario), and run **timed mock exams**.
- **AI Tutor** answers questions grounded in the lesson's PDF text, with a Meta Blueprint-tuned system prompt.
- **Security** is enforced via Supabase RLS at the database boundary, never relying solely on UI gating.

## 3. System Architecture (ASCII)

```
                        ┌────────────────────────────────────┐
                        │            Browser (Learner/Admin) │
                        │  Next.js 14 App Router + Tailwind  │
                        │  shadcn/ui + react-pdf + Mux Player│
                        └───────────────┬────────────────────┘
                                        │ HTTPS (RSC + Server Actions)
                                        ▼
        ┌────────────────────────────────────────────────────────────┐
        │                  Vercel — Next.js 14 (App Router)          │
        │                                                            │
        │  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
        │  │ /app pages  │  │ /api routes  │  │ Server Actions   │   │
        │  │ (RSC)       │  │ (REST/SSE)   │  │ (mutations)      │   │
        │  └──────┬──────┘  └──────┬───────┘  └────────┬─────────┘   │
        │         │                │                   │             │
        │  ┌──────▼────────────────▼───────────────────▼─────────┐   │
        │  │            lib/supabase/{server,client,admin}        │   │
        │  └──────┬──────────────────────────────────┬────────────┘   │
        │         │                                  │                │
        │  ┌──────▼──────┐                   ┌───────▼─────────┐      │
        │  │ Anthropic   │                   │ Mux / Bunny     │      │
        │  │ Messages API│                   │ (signed URLs)   │      │
        │  │ Sonnet 4.5  │                   └─────────────────┘      │
        │  └─────────────┘                                            │
        └───────────────┬────────────────────────────────────────────┘
                        │ supabase-js (SSR cookies + service role)
                        ▼
        ┌────────────────────────────────────────────────────────────┐
        │                       Supabase                             │
        │                                                            │
        │  ┌──────────────┐ ┌──────────────┐ ┌────────────────────┐  │
        │  │  PostgreSQL  │ │  Auth (GoTrue)│ │ Storage (S3-style) │  │
        │  │  + RLS       │ │ email + magic │ │ pdfs, thumbnails   │  │
        │  └──────────────┘ └──────────────┘ └────────────────────┘  │
        └────────────────────────────────────────────────────────────┘
```

## 4. Data Flow — Three Critical Paths

### 4.1 Admin uploads a PDF resource
```
Admin form (Server Action)
  → upload File to Supabase Storage bucket `resource-pdfs`
  → insert row into `resources` (kind='pdf', storage_path=...)
  → server-side: extract text via pdf-parse, store in `resources.extracted_text`
  → revalidatePath('/admin/lessons/[id]')
```

### 4.2 Learner views a lesson
```
RSC `/learn/[trackSlug]/[lessonId]`
  → createClient(cookies) [SSR]
  → SELECT lesson + resources (RLS: enrolled_or_admin)
  → render LessonViewer:
        kind='link' → <LinkCard /> (microlink)
        kind='pdf'  → <PdfViewer /> (signed URL, react-pdf)
        kind='video'→ <VideoPlayer /> (Mux signed playback ID)
  → on view + on completion → POST /api/progress (upsert)
```

### 4.3 Learner asks AI Tutor about a PDF
```
ChatPanel.tsx (client) sends { lessonId, message }
  → POST /api/ai/chat (streaming, edge-friendly node runtime)
  → server: load lesson.resources.extracted_text (RLS-checked)
  → build system prompt (Meta Blueprint priming) + user msg
  → anthropic.messages.stream({ model: 'claude-sonnet-4-5', ... })
  → forward SSE chunks back to client
  → on finish: persist turn to `ai_chat_sessions` + `ai_chat_messages`
```

## 5. Meta Certification Taxonomy (drives the schema)

The `certification_tracks` table is seeded with the official Meta Blueprint exam catalog. The schema must allow every resource and quiz to be tagged to one or more `certification_exams`.

| Track Code | Display Name | Audience |
|---|---|---|
| `MCDMA` | Meta Certified Digital Marketing Associate | Entry — overview of Meta marketing |
| `MCMBP` | Meta Certified Media Buying Professional | Buyers — campaign structure, optimization, Advantage+ |
| `MCMSP` | Meta Certified Marketing Science Professional | Measurement — attribution, lift, MMM, CAPI |
| `MCCM`  | Meta Certified Community Manager | Community building, Pages, Groups |
| `MCCSP` | Meta Certified Creative Strategy Professional | Creative testing, Reels strategy |
| `MCMDA` | Meta Certified Marketing Developer Associate | Graph API, Marketing API basics |

**Domains** (terminology that the AI tutor system prompt and quiz generator MUST know):
- Campaign objectives (Awareness, Traffic, Engagement, Leads, App Promotion, Sales)
- Ad set structure, audiences (Custom, Lookalike, Advantage+ Audience)
- **Advantage+** suite (Shopping Campaigns, Audience, Placements, Creative)
- **Conversions API** (CAPI), Pixel, Events Manager, Aggregated Event Measurement
- Attribution windows (1d-click, 7d-click, 1d-view), Data-Driven Attribution
- Brand Lift / Conversion Lift studies, Marketing Mix Modeling (MMM)
- Reels, Stories, Feed placements, Meta Advantage Placements
- Auction dynamics: bid, estimated action rates, ad quality
- Business Manager, Asset groups, Partner integrations

## 6. Folder Structure (top-level)

```
meta-certified-porta/
├── app/
│   ├── (marketing)/              # public pages
│   ├── (auth)/login/
│   ├── (learn)/                  # learner UI, requires auth
│   │   ├── dashboard/
│   │   ├── tracks/[slug]/
│   │   ├── lesson/[lessonId]/
│   │   └── exam/[quizId]/
│   ├── (admin)/admin/            # requires role='admin'
│   │   ├── tracks/
│   │   ├── modules/
│   │   ├── lessons/
│   │   ├── resources/
│   │   ├── quizzes/
│   │   └── users/
│   └── api/
│       ├── ai/chat/route.ts
│       ├── ai/quiz-gen/route.ts
│       ├── progress/route.ts
│       └── upload/route.ts
├── components/
│   ├── ui/                       # shadcn/ui generated
│   ├── learner/
│   ├── admin/
│   └── shared/
├── lib/
│   ├── supabase/{client,server,admin,middleware}.ts
│   ├── anthropic/{client,prompts}.ts
│   ├── pdf/extract.ts
│   ├── mux/client.ts
│   └── auth/roles.ts
├── db/
│   ├── migrations/
│   └── seed.sql
├── middleware.ts
├── tailwind.config.ts
├── components.json               # shadcn config
└── package.json
```

## 7. Non-Functional Requirements

- **Latency**: lesson page TTFB < 500 ms (Vercel Edge → Supabase same region).
- **Security**: every table has RLS; Service Role key never reaches the client.
- **Cost guardrails**: AI tutor capped at **20 chat turns / learner / day**, **8K input tokens / turn**.
- **Accessibility**: WCAG AA via shadcn defaults; keyboard navigation in PdfViewer and exam mode.

## Claude Project Prompt

> You are my coding partner for **Meta Certified Porta**, a Next.js 14 + Supabase + Anthropic learning portal. Read all seven knowledge files in this project. Confirm you understand: (a) the locked tech stack in `00-project-overview.md`, (b) the four-level content hierarchy (Track → Module → Lesson → Resource), (c) the three resource kinds (link, pdf, video), and (d) the Meta certification taxonomy. Then list any ambiguities you would clarify before writing code, and propose a build order that matches `06-implementation-roadmap.md`. Do not produce code yet.
