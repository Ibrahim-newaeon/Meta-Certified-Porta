import 'server-only';

// Server-side PDF text extraction using pdfjs-dist (already installed).
// Avoids adding `pdf-parse` (which has a notorious test-fixture loading bug).
//
// Returns the concatenated text content and page count. The caller stores
// the text into `resources.extracted_text` (capped at ~1MB) for the AI tutor
// to use as lesson context.

export async function extractPdfText(
  source: Buffer | ArrayBuffer | Uint8Array
): Promise<{ text: string; pageCount: number }> {
  // Dynamic import — pdfjs-dist's ESM entry has top-level await issues when
  // imported eagerly in some Next runtimes.
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

  // Buffer extends Uint8Array, so this also handles Node Buffer.
  const data =
    source instanceof Uint8Array
      ? source
      : new Uint8Array(source);

  const doc = await pdfjs.getDocument({
    data,
    disableFontFace: true,
    useSystemFonts: false,
  }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    const text = tc.items
      .map((item) => ('str' in item ? item.str : ''))
      .filter(Boolean)
      .join(' ');
    pages.push(text);
  }

  return { text: pages.join('\n\n'), pageCount: doc.numPages };
}
