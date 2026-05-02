'use client';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/shared/button';

export function TextViewer({
  title,
  content,
  onComplete,
}: {
  title: string;
  content: string;
  onComplete?: () => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Mark complete on first scroll-to-end so the lesson can flip to "completed"
  // without requiring a button click (the button still works as fallback).
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !onComplete) return;
    let fired = false;
    const onScroll = () => {
      if (fired) return;
      const reachedEnd =
        el.scrollHeight - (el.scrollTop + el.clientHeight) < 24;
      if (reachedEnd) {
        fired = true;
        onComplete();
      }
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    // Some lessons fit in one screen — fire immediately if no scroll possible.
    if (el.scrollHeight <= el.clientHeight + 24) onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, [onComplete, content]);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <div className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
          Reading
        </div>
        <h3 className="mt-0.5 text-lg font-semibold">{title}</h3>
      </div>
      <div
        ref={scrollerRef}
        className="max-h-[70vh] overflow-y-auto px-6 py-5 text-sm leading-relaxed"
      >
        {content
          .split(/\n{2,}/)
          .map((para, i) => (
            <p key={i} className="mt-3 first:mt-0 whitespace-pre-wrap">
              {para}
            </p>
          ))}
      </div>
      {onComplete && (
        <div className="border-t border-[var(--border)] px-4 py-3">
          <Button size="sm" onClick={onComplete}>
            Mark complete
          </Button>
        </div>
      )}
    </div>
  );
}
