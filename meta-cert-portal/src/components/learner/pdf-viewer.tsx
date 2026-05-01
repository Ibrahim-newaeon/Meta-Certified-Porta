'use client';
import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Button } from '@/components/shared/button';

// Worker URL must match the pdfjs-dist version. unpkg works in dev; in prod
// host the worker file as a static asset and point this there.
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export function PdfViewer({
  url,
  startPage,
  onPageChange,
  onFinish,
}: {
  url: string;
  startPage: number;
  onPageChange?: (page: number) => void;
  onFinish?: () => void;
}) {
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(Math.max(1, startPage || 1));
  const [error, setError] = useState<string | null>(null);
  const lastReported = useRef(page);

  useEffect(() => {
    if (page !== lastReported.current) {
      lastReported.current = page;
      onPageChange?.(page);
    }
  }, [page, onPageChange]);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      {error ? (
        <div
          role="alert"
          className="rounded-md bg-[var(--color-danger-bg)] p-3 text-sm text-[var(--color-danger-fg)]"
        >
          Failed to load PDF: {error}
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <Document
            file={url}
            onLoadSuccess={({ numPages: n }) => setNumPages(n)}
            onLoadError={(e) => setError(e.message)}
            loading={
              <div className="py-8 text-sm text-[var(--color-text-muted)]">Loading PDF…</div>
            }
          >
            <Page pageNumber={page} width={760} />
          </Document>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              <span aria-hidden="true">← </span>Prev
            </Button>
            <span aria-live="polite" aria-atomic="true" className="text-[var(--color-text)]">
              Page {page} of {numPages || '…'}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.min(numPages || p, p + 1))}
              disabled={page >= numPages}
              aria-label="Next page"
            >
              Next<span aria-hidden="true"> →</span>
            </Button>
            {onFinish && page === numPages && numPages > 0 && (
              <Button size="sm" onClick={onFinish}>
                Mark complete
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
