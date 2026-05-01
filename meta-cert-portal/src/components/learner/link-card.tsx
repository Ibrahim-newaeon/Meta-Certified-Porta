'use client';
import { Button } from '@/components/shared/button';

export function LinkCard({
  url,
  title,
  onComplete,
}: {
  url: string;
  title: string;
  onComplete?: () => void;
}) {
  let hostname = '';
  try {
    hostname = new URL(url).hostname;
  } catch {
    hostname = url;
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="text-xs uppercase text-[var(--color-text-muted)]">External resource</div>
      <h3 className="mt-1 text-lg font-semibold">{title}</h3>
      <p className="mt-2 truncate text-sm text-[var(--color-text-muted)]">{hostname}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${title} (opens in a new tab)`}
          className="inline-flex h-11 items-center gap-1 rounded-md bg-[var(--color-primary)] px-5 text-sm font-medium text-[var(--color-primary-fg)] transition-colors hover:bg-[var(--color-primary-hover)]"
          onClick={() => onComplete?.()}
        >
          Open link
          <span aria-hidden="true">↗</span>
        </a>
        {onComplete && (
          <Button variant="secondary" onClick={onComplete}>
            Mark complete
          </Button>
        )}
      </div>
    </div>
  );
}
