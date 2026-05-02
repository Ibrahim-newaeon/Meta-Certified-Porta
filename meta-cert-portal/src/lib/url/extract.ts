import 'server-only';

const UA =
  'Mozilla/5.0 (compatible; MetaCertPortal/1.0; +https://meta-cert-portal.example/bot)';

const ENTITY: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
  '&mdash;': '—',
  '&ndash;': '–',
  '&hellip;': '…',
  '&rsquo;': '’',
  '&lsquo;': '‘',
  '&rdquo;': '”',
  '&ldquo;': '“',
};

// Strip HTML to plain text. Not as smart as Mozilla Readability — no main-
// content extraction — but good enough for tutorial pages with mostly
// semantic markup. Returns trimmed/whitespace-collapsed text.
function htmlToText(html: string): string {
  let text = html
    // Block tags that should NEVER contribute text
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<template\b[^>]*>[\s\S]*?<\/template>/gi, ' ')
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    // Block-level tags get newlines so paragraphs don't run together
    .replace(/<\/(p|div|li|h[1-6]|tr|br|hr|section|article)>/gi, '\n')
    // Strip all remaining tags
    .replace(/<[^>]+>/g, ' ');

  // Decode named/numeric entities
  text = text.replace(/&[a-z0-9#]+;/gi, (m) => {
    if (ENTITY[m]) return ENTITY[m];
    const num = m.match(/^&#(\d+);$/);
    if (num) return String.fromCharCode(Number(num[1]));
    const hex = m.match(/^&#x([0-9a-f]+);$/i);
    if (hex) return String.fromCharCode(parseInt(hex[1], 16));
    return ' ';
  });

  // Collapse whitespace, normalise line breaks
  return text
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .trim();
}

export async function extractTextFromUrl(
  url: string,
): Promise<{ text: string; title: string | null }> {
  const target = new URL(url);
  if (target.protocol !== 'https:' && target.protocol !== 'http:') {
    throw new Error(`Unsupported protocol: ${target.protocol}`);
  }

  const res = await fetch(target, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`Fetch failed: HTTP ${res.status}`);
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (
    !contentType.includes('text/html') &&
    !contentType.includes('application/xhtml') &&
    !contentType.includes('text/plain')
  ) {
    throw new Error(`Unsupported content-type: ${contentType.split(';')[0]}`);
  }

  const html = await res.text();

  // Pull <title> separately so we can store it.
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch
    ? htmlToText(titleMatch[1]).slice(0, 200) || null
    : null;

  const text = htmlToText(html);
  return { text, title };
}
