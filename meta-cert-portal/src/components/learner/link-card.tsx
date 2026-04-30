'use client';

// Phase-4 link card. The blueprint references @microlink/react for rich
// previews; that package needs the registry which our environment couldn't
// reach during setup. The microlink npm package IS installed, so swapping
// this stub for a real preview is a one-component change later.
//
// For now we render a clean external-link card with the URL parsed for
// hostname display.

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
    <div className="rounded-lg border bg-white p-6">
      <div className="text-xs uppercase text-slate-500">External resource</div>
      <h3 className="mt-1 text-lg font-semibold">{title}</h3>
      <p className="mt-2 truncate text-sm text-slate-500">{hostname}</p>
      <div className="mt-4 flex items-center gap-3">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
          onClick={() => onComplete?.()}
        >
          Open link ↗
        </a>
        {onComplete && (
          <button
            onClick={onComplete}
            className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-sm hover:bg-slate-50"
          >
            Mark complete
          </button>
        )}
      </div>
    </div>
  );
}
