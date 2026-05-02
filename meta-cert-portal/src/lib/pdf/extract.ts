import 'server-only';

// Server-side PDF text extraction.
//
// Uses `unpdf` — a Node/edge-friendly fork of pdfjs that doesn't require
// DOMMatrix or other browser globals at import time. The original
// `pdfjs-dist/legacy/build/pdf.mjs` import threw "DOMMatrix is not defined"
// in the Railway Node runtime even though the legacy build is supposed to
// work without a DOM.
//
// `react-pdf` (the client-side viewer) still uses pdfjs-dist via dynamic
// import in the browser, where DOMMatrix is native — no conflict.

export async function extractPdfText(
  source: Buffer | ArrayBuffer | Uint8Array,
): Promise<{ text: string; pageCount: number }> {
  const { extractText, getDocumentProxy } = await import('unpdf');

  // unpdf rejects Node Buffer instances even though Buffer extends Uint8Array.
  // Uint8Array.from copies the bytes into a plain Uint8Array (sharing no
  // prototype with Buffer) which is what unpdf expects.
  const data = source instanceof Uint8Array
    ? Uint8Array.from(source)
    : new Uint8Array(source);

  const doc = await getDocumentProxy(data);
  // mergePages: true makes text a single string (already joined per-page).
  const { totalPages, text } = await extractText(doc, { mergePages: true });

  return { text, pageCount: totalPages };
}
