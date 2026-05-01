'use client';
import { useState } from 'react';
import { Button } from '@/components/shared/button';

export function QuizGenButton({ lessonId, examCodes }: { lessonId: string; examCodes: string[] }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch('/api/ai/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, count: 10, examCodes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? `HTTP ${res.status}`);
      } else {
        setMsg(`Generated quiz "${data.title}" with ${data.count} questions.`);
        // Soft refresh — the lesson page itself doesn't list quizzes yet,
        // but admins can navigate to /admin/quizzes once that page exists.
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'request_failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="secondary" onClick={generate} disabled={busy}>
        {busy ? 'Generating quiz…' : 'Generate quiz from PDF'}
      </Button>
      {msg && (
        <span role="status" className="text-xs text-emerald-700 dark:text-emerald-300">
          {msg}
        </span>
      )}
      {err && (
        <span role="alert" className="text-xs text-rose-700 dark:text-rose-300">
          {err}
        </span>
      )}
    </div>
  );
}
