import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function LandingPage() {
  const supabase = await createClient();

  // Show whether the visitor is already signed in so the CTAs adapt.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: tracksData } = await supabase
    .from('certification_tracks')
    .select('id, code, title, description, exam_minutes, pass_score')
    .eq('is_published', true)
    .order('code');
  const tracks = tracksData ?? [];

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--color-text)]">
      <Header isSignedIn={!!user} />

      <main>
        <Hero isSignedIn={!!user} />
        <Stats trackCount={tracks.length} />
        <Tracks tracks={tracks} />
        <Features />
        <HowItWorks />
        <FinalCta isSignedIn={!!user} />
      </main>

      <Footer />
    </div>
  );
}

function Header({ isSignedIn }: { isSignedIn: boolean }) {
  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[var(--color-brand)] text-xs font-bold text-[var(--color-brand-fg-on)]">
            M
          </span>
          Meta Cert Portal
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <a
            href="#tracks"
            className="hidden text-[var(--color-text-muted)] hover:text-[var(--color-text)] sm:inline"
          >
            Tracks
          </a>
          <a
            href="#features"
            className="hidden text-[var(--color-text-muted)] hover:text-[var(--color-text)] sm:inline"
          >
            Features
          </a>
          {isSignedIn ? (
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center rounded-md bg-[var(--color-brand)] px-4 text-sm font-medium text-[var(--color-brand-fg-on)] transition-colors hover:bg-[var(--color-brand-hover)]"
            >
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex h-10 items-center rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--surface-muted)]"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="inline-flex h-10 items-center rounded-md bg-[var(--color-brand)] px-4 text-sm font-medium text-[var(--color-brand-fg-on)] transition-colors hover:bg-[var(--color-brand-hover)]"
              >
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function Hero({ isSignedIn }: { isSignedIn: boolean }) {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[var(--color-brand-soft)] opacity-40 dark:opacity-30" />
      <div className="pointer-events-none absolute -right-24 top-12 h-72 w-72 rounded-full bg-[var(--color-brand)]/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-12 bottom-0 h-72 w-72 rounded-full bg-[var(--color-brand)]/10 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="max-w-2xl">
          <span className="inline-flex items-center rounded-full border border-[var(--color-brand)]/30 bg-[var(--color-brand-soft)] px-3 py-1 text-xs font-medium text-[var(--color-brand-soft-fg)]">
            Meta Blueprint · Practice & study
          </span>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Pass your Meta certification, with a study plan that actually fits.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-[var(--color-text-muted)]">
            Structured tracks, video lessons, downloadable PDFs, AI tutoring, and
            Meta-style practice exams — built for working media buyers and marketers.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            {isSignedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex h-11 items-center rounded-md bg-[var(--color-brand)] px-6 text-sm font-medium text-[var(--color-brand-fg-on)] shadow-sm transition-colors hover:bg-[var(--color-brand-hover)]"
              >
                Continue to dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className="inline-flex h-11 items-center rounded-md bg-[var(--color-brand)] px-6 text-sm font-medium text-[var(--color-brand-fg-on)] shadow-sm transition-colors hover:bg-[var(--color-brand-hover)]"
                >
                  Create free account
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-11 items-center rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-6 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--surface-muted)]"
                >
                  Sign in
                </Link>
              </>
            )}
            <a
              href="#tracks"
              className="text-sm font-medium text-[var(--color-brand-soft-fg)] hover:underline"
            >
              See certification tracks →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stats({ trackCount }: { trackCount: number }) {
  const items = [
    { label: 'Certification tracks', value: trackCount > 0 ? `${trackCount}+` : 'New' },
    { label: 'Practice questions', value: 'AI-generated' },
    { label: 'Pass score', value: '70%' },
    { label: 'Format', value: 'Self-paced' },
  ];
  return (
    <section className="border-y border-[var(--border)] bg-[var(--surface-muted)]">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 md:grid-cols-4">
        {items.map((s) => (
          <div key={s.label}>
            <div className="text-2xl font-semibold tracking-tight">{s.value}</div>
            <div className="mt-1 text-xs uppercase tracking-wide text-[var(--color-text-subtle)]">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Tracks({
  tracks,
}: {
  tracks: Array<{
    id: string;
    code: string;
    title: string;
    description: string | null;
    exam_minutes: number;
    pass_score: number;
  }>;
}) {
  return (
    <section id="tracks" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mb-10 max-w-2xl">
        <h2 className="text-3xl font-semibold tracking-tight">Certification tracks</h2>
        <p className="mt-3 text-[var(--color-text-muted)]">
          Each track maps to a Meta Blueprint certification. Enroll to unlock lessons,
          PDFs, videos, and AI-graded practice exams.
        </p>
      </div>

      {tracks.length === 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--color-text-muted)]">
          New tracks are being added soon. Create an account to be notified when they
          go live.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {tracks.map((t) => (
            <div
              key={t.id}
              className="flex h-full flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm transition hover:border-[var(--color-brand)]/40 hover:shadow-md"
            >
              <span className="inline-flex w-fit items-center rounded-full bg-[var(--color-brand-soft)] px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--color-brand-soft-fg)]">
                {t.code}
              </span>
              <h3 className="mt-3 text-lg font-semibold">{t.title}</h3>
              {t.description && (
                <p className="mt-2 line-clamp-3 text-sm text-[var(--color-text-muted)]">
                  {t.description}
                </p>
              )}
              <div className="mt-auto pt-4 text-xs text-[var(--color-text-subtle)]">
                {t.exam_minutes} min exam · {t.pass_score}% to pass
              </div>
              <Link
                href="/register"
                className="mt-3 inline-flex h-10 w-fit items-center rounded-md bg-[var(--color-brand)] px-3 text-sm font-medium text-[var(--color-brand-fg-on)] transition-colors hover:bg-[var(--color-brand-hover)]"
              >
                Enroll free
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Features() {
  const features = [
    {
      title: 'Structured tracks',
      body: 'Modules and lessons sequenced like the Meta Blueprint exam outline.',
    },
    {
      title: 'Video + PDF lessons',
      body: 'Signed video playback via Mux and downloadable PDF references.',
    },
    {
      title: 'AI tutor on every lesson',
      body: 'Ask Claude questions in context — grounded in the lesson material.',
    },
    {
      title: 'Practice exams',
      body: 'Meta-style multi-choice, multi-select, and scenario questions, AI-generated from your study material.',
    },
    {
      title: 'Progress tracking',
      body: 'See lessons completed, hours spent, and exam pass rate at a glance.',
    },
    {
      title: 'Self-paced',
      body: 'Study on your schedule. Resume from where you left off across devices.',
    },
  ];
  return (
    <section id="features" className="border-t border-[var(--border)] bg-[var(--surface-muted)]">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mb-10 max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight">
            Everything you need to study and pass
          </h2>
          <p className="mt-3 text-[var(--color-text-muted)]">
            Built specifically for Meta certification candidates, not a generic LMS.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm"
            >
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: '1',
      title: 'Create your account',
      body: 'Sign up free with email — no credit card.',
    },
    {
      n: '2',
      title: 'Pick a track',
      body: 'Browse Meta Blueprint tracks and enroll in one (or more).',
    },
    {
      n: '3',
      title: 'Study at your pace',
      body: 'Watch videos, read PDFs, ask the AI tutor — track your progress.',
    },
    {
      n: '4',
      title: 'Practice exams',
      body: 'Take AI-generated practice exams scoped to each lesson until you pass.',
    },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mb-10 max-w-2xl">
        <h2 className="text-3xl font-semibold tracking-tight">How it works</h2>
        <p className="mt-3 text-[var(--color-text-muted)]">
          From signup to pass, in four steps.
        </p>
      </div>
      <ol className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((s) => (
          <li
            key={s.n}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm"
          >
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-brand-soft)] text-sm font-semibold text-[var(--color-brand-soft-fg)]">
              {s.n}
            </div>
            <h3 className="mt-4 font-semibold">{s.title}</h3>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function FinalCta({ isSignedIn }: { isSignedIn: boolean }) {
  return (
    <section
      className="text-white"
      style={{ background: 'var(--color-brand-gradient)' }}
    >
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight">
            Ready to get certified?
          </h2>
          <p className="mt-2 text-white/80">
            Free to start. Pick a track, study with AI, pass the exam.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {isSignedIn ? (
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center rounded-md bg-[var(--background)] px-6 text-sm font-medium text-[var(--color-brand-soft-fg)] shadow-sm transition-colors hover:bg-[var(--surface-muted)]"
            >
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/register"
                className="inline-flex h-11 items-center rounded-md bg-[var(--background)] px-6 text-sm font-medium text-[var(--color-brand-soft-fg)] shadow-sm transition-colors hover:bg-[var(--surface-muted)]"
              >
                Create free account
              </Link>
              <Link
                href="/login"
                className="inline-flex h-11 items-center rounded-md border border-white/40 bg-transparent px-6 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                Sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-4 py-8 text-sm text-[var(--color-text-subtle)] sm:flex-row sm:items-center sm:px-6">
        <div>© {new Date().getFullYear()} Meta Cert Portal</div>
        <div className="flex gap-4">
          <Link href="/login" className="hover:text-[var(--color-text)]">
            Sign in
          </Link>
          <Link href="/register" className="hover:text-[var(--color-text)]">
            Sign up
          </Link>
        </div>
      </div>
    </footer>
  );
}
