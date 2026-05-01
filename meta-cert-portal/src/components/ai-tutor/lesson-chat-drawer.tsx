'use client';
import { useCallback, useState } from 'react';
import { ChatPanel } from './chat-panel';
import { Button } from '@/components/shared/button';
import { useFocusTrap } from '@/lib/use-focus-trap';

export function LessonChatDrawer({ lessonId }: { lessonId: string }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const drawerRef = useFocusTrap<HTMLElement>(open, close);

  return (
    <>
      <Button
        size="lg"
        onClick={() => setOpen(true)}
        aria-label="Open AI tutor"
        aria-expanded={open}
        className="fixed bottom-6 right-6 z-30 h-12 gap-2 rounded-full px-5 shadow-lg"
      >
        Ask the tutor
      </Button>

      {open && (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            onClick={close}
            aria-label="Close AI tutor"
            tabIndex={-1}
            className="absolute inset-0 bg-[var(--color-scrim)]"
          />
          <aside
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="AI Tutor"
            tabIndex={-1}
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-[var(--surface)] shadow-xl sm:max-w-md"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <span className="text-sm font-semibold">AI Tutor</span>
              <Button variant="ghost" size="sm" onClick={close}>
                Close
              </Button>
            </div>
            <div className="flex-1 overflow-hidden p-4">
              <ChatPanel lessonId={lessonId} />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
