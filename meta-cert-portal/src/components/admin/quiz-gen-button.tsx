'use client';
import { useState } from 'react';

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
    <div className="flex items-center gap-3">
      <button
        onClick={generate}
        disabled={busy}
        className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
      >
        {busy ? 'Generating quiz…' : 'Generate quiz from PDF'}
      </button>
      {msg && <span className="text-xs text-green-700">{msg}</span>}
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  );
}
