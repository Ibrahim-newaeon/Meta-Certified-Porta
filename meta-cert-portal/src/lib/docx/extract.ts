import 'server-only';

// Server-side DOCX → plain-text extraction via mammoth.
// Returns the body text plus an inferred title (the first non-empty line).

export async function extractDocxText(
  source: Buffer | ArrayBuffer | Uint8Array,
): Promise<{ text: string; title: string | null }> {
  const mammoth = await import('mammoth');

  const buffer =
    source instanceof Uint8Array
      ? Buffer.from(source.buffer, source.byteOffset, source.byteLength)
      : Buffer.from(source);

  // extractRawText skips formatting/styles and gives us a single string.
  const result = await mammoth.extractRawText({ buffer });
  const text = (result.value ?? '').replace(/\r\n?/g, '\n').trim();

  const firstLine = text.split('\n').find((l) => l.trim().length > 0) ?? '';
  const title = firstLine.slice(0, 200) || null;

  return { text, title };
}
