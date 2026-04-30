'use client';
import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

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
    <div className="rounded-lg border bg-white p-4">
      {error ? (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          Failed to load PDF: {error}
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <Document
            file={url}
            onLoadSuccess={({ numPages: n }) => setNumPages(n)}
            onLoadError={(e) => setError(e.message)}
            loading={<div className="py-8 text-sm text-slate-500">Loading PDF…</div>}
          >
            <Page pageNumber={page} width={760} />
          </Document>

          <div className="mt-4 flex items-center gap-3 text-sm">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex h-8 items-center rounded-md border border-slate-300 bg-white px-3 hover:bg-slate-50 disabled:opacity-50"
            >
              ← Prev
            </button>
            <span>
              Page {page} of {numPages || '…'}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(numPages || p, p + 1))}
              disabled={page >= numPages}
              className="inline-flex h-8 items-center rounded-md border border-slate-300 bg-white px-3 hover:bg-slate-50 disabled:opacity-50"
            >
              Next →
            </button>
            {onFinish && page === numPages && numPages > 0 && (
              <button
                onClick={onFinish}
                className="inline-flex h-8 items-center rounded-md bg-slate-900 px-3 text-white hover:bg-slate-800"
              >
                Mark complete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
