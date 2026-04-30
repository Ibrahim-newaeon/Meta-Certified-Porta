'use client';
import { useState } from 'react';
import { ChatPanel } from './chat-panel';

// Floating "Ask the tutor" toggle that opens a right-side drawer hosting the
// streaming chat. Kept client-only so the chat stream isn't part of the RSC
// payload.

export function LessonChatDrawer({ lessonId }: { lessonId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open AI tutor"
        className="fixed bottom-6 right-6 z-30 inline-flex h-12 items-center gap-2 rounded-full bg-slate-900 px-5 text-sm font-medium text-white shadow-lg hover:bg-slate-800"
      >
        Ask the tutor
      </button>

      {open && (
        <div className="fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="text-sm font-semibold">AI Tutor</span>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
            <div className="flex-1 p-4">
              <ChatPanel lessonId={lessonId} />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
