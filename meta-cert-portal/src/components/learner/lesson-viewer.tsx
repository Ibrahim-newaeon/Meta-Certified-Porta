'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { LinkCard } from './link-card';
import { saveProgressAction } from '@/app/(learner)/lessons/actions';

// Dynamic imports — react-pdf and Mux Player both depend on the DOM, so we
// avoid SSR-evaluating them.
const PdfViewer = dynamic(() => import('./pdf-viewer').then((m) => m.PdfViewer), {
  ssr: false,
  loading: () => <div className="rounded-lg border bg-white p-6 text-sm text-slate-500">Loading PDF viewer…</div>,
});
const VideoPlayer = dynamic(() => import('./video-player').then((m) => m.VideoPlayer), {
  ssr: false,
  loading: () => <div className="rounded-lg border bg-white p-6 text-sm text-slate-500">Loading player…</div>,
});

export type PreparedResource = {
  id: string;
  kind: 'link' | 'pdf' | 'video';
  title: string;
  order_index: number;
  url: string | null;
  signedUrl?: string;
  video_playback_id: string | null;
  videoTokens?: { playback: string; thumbnail: string; storyboard: string };
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
    <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[260px_1fr]">
      <aside>
        <div className="mb-3 text-xs uppercase text-slate-500">Lesson</div>
        <h2 className="mb-4 font-semibold">{lessonTitle}</h2>
        <ul className="space-y-1">
          {resources.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => setActiveId(r.id)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                  r.id === activeId ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'
                }`}
              >
                <span
                  className={`rounded px-1.5 py-0.5 font-mono text-[10px] uppercase ${
                    r.id === activeId ? 'bg-white/20' : 'bg-slate-200'
                  }`}
                >
                  {r.kind}
                </span>
                <span className="truncate">{r.title}</span>
              </button>
            </li>
          ))}
          {resources.length === 0 && (
            <li className="text-sm text-slate-500">No resources in this lesson yet.</li>
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
        {!active && (
          <div className="rounded-lg border bg-white p-8 text-center text-sm text-slate-500">
            Select a resource to begin.
          </div>
        )}
      </main>
    </div>
  );
}
