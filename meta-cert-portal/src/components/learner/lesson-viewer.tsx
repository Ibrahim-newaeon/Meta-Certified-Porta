'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { LinkCard } from './link-card';
import { TextViewer } from './text-viewer';
import { saveProgressAction } from '@/app/(learner)/lessons/actions';

// Dynamic imports — react-pdf and Mux Player both depend on the DOM, so we
// avoid SSR-evaluating them.
const PdfViewer = dynamic(() => import('./pdf-viewer').then((m) => m.PdfViewer), {
  ssr: false,
  loading: () => <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--color-text-muted)]">Loading PDF viewer…</div>,
});
const VideoPlayer = dynamic(() => import('./video-player').then((m) => m.VideoPlayer), {
  ssr: false,
  loading: () => <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--color-text-muted)]">Loading player…</div>,
});

export type PreparedResource = {
  id: string;
  kind: 'link' | 'pdf' | 'video' | 'text';
  title: string;
  order_index: number;
  url: string | null;
  signedUrl?: string;
  video_playback_id: string | null;
  videoTokens?: { playback: string; thumbnail: string; storyboard: string };
  textContent?: string;
};

export function LessonViewer({
  lessonId,
  lessonTitle,
  resources,
  initialPosition,
  initialStatus,
}: {
  lessonId: string;
  lessonTitle: string;
  resources: PreparedResource[];
  initialPosition: number;
  initialStatus: string | null;
}) {
  const [activeId, setActiveId] = useState<string | undefined>(resources[0]?.id);
  const active = resources.find((r) => r.id === activeId);

  // Mark the lesson as in-progress on first open if no progress yet.
  useEffect(() => {
    if (initialStatus == null) {
      saveProgressAction({ lessonId, lastPosition: 0, completed: false });
    }
  }, [lessonId, initialStatus]);

  function reportPosition(pos: number) {
    saveProgressAction({ lessonId, lastPosition: Math.floor(pos), completed: false });
  }

  function reportComplete() {
    saveProgressAction({ lessonId, lastPosition: 0, completed: true });
  }

  return (
    <div className="grid grid-cols-1 gap-6 p-4 sm:p-6 xl:grid-cols-[260px_1fr]">
      <aside>
        <div className="mb-3 text-xs uppercase text-[var(--color-text-muted)]">Lesson</div>
        <h2 className="mb-4 font-semibold">{lessonTitle}</h2>
        <ul className="space-y-1">
          {resources.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => setActiveId(r.id)}
                className={`flex w-full min-h-11 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                  r.id === activeId
                    ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)]'
                    : 'hover:bg-[var(--surface-muted)]'
                }`}
              >
                <span
                  className={`rounded px-1.5 py-0.5 font-mono text-[10px] uppercase ${
                    r.id === activeId
                      ? 'bg-[var(--color-primary-fg)]/15 text-[var(--color-primary-fg)]'
                      : 'bg-[var(--color-neutral-bg)] text-[var(--color-neutral-fg)]'
                  }`}
                >
                  {r.kind}
                </span>
                <span className="truncate">{r.title}</span>
              </button>
            </li>
          ))}
          {resources.length === 0 && (
            <li className="text-sm text-[var(--color-text-muted)]">No resources in this lesson yet.</li>
          )}
        </ul>
      </aside>

      <main>
        {active?.kind === 'link' && active.url && (
          <LinkCard url={active.url} title={active.title} onComplete={reportComplete} />
        )}
        {active?.kind === 'pdf' && active.signedUrl && (
          <PdfViewer
            url={active.signedUrl}
            startPage={initialPosition || 1}
            onPageChange={(p) => reportPosition(p)}
            onFinish={reportComplete}
          />
        )}
        {active?.kind === 'video' && active.video_playback_id && active.videoTokens && (
          <VideoPlayer
            playbackId={active.video_playback_id}
            tokens={active.videoTokens}
            startSeconds={initialPosition || 0}
            onTime={(t) => reportPosition(t)}
            onEnd={reportComplete}
          />
        )}
        {active?.kind === 'text' && active.textContent && (
          <TextViewer
            title={active.title}
            content={active.textContent}
            onComplete={reportComplete}
          />
        )}
        {!active && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--color-text-muted)]">
            Select a resource to begin.
          </div>
        )}
      </main>
    </div>
  );
}
