/**
 * Catalog copy was imported from Fourthwall with HTML markup baked into the
 * plain `description` columns, so it renders as literal `<p>` tags on the
 * page and leaks tags into meta descriptions and structured data.
 *
 * These helpers turn that markup into structured blocks (paragraphs and
 * lists) that templates render through normal escaping. Nothing here ever
 * emits HTML for the browser to parse, so staff-authored copy can never
 * become markup injection.
 */

export type RichTextBlock =
  { type: "paragraph"; text: string } | { type: "list"; items: string[] };

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  ldquo: "“",
  rdquo: "”",
};

function decodeEntities(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) =>
      String.fromCodePoint(Number.parseInt(dec, 10)),
    )
    .replace(
      /&([a-z]+);/gi,
      (match, name) => NAMED_ENTITIES[name.toLowerCase()] ?? match,
    );
}

function cleanInline(value: string) {
  return decodeEntities(
    value.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]*>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

const BLOCK_PATTERN =
  /<(ul|ol)\b[^>]*>([\s\S]*?)<\/\1>|<p\b[^>]*>([\s\S]*?)<\/p>/gi;
const LIST_ITEM_PATTERN = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;

function pushParagraphs(blocks: RichTextBlock[], raw: string) {
  const text = cleanInline(raw);
  if (text) blocks.push({ type: "paragraph", text });
}

export function parseRichText(
  input: string | null | undefined,
): RichTextBlock[] {
  if (!input) return [];
  const blocks: RichTextBlock[] = [];
  let lastIndex = 0;
  for (const match of input.matchAll(BLOCK_PATTERN)) {
    pushParagraphs(blocks, input.slice(lastIndex, match.index));
    lastIndex = match.index + match[0].length;
    if (match[1]) {
      const items = [...match[2].matchAll(LIST_ITEM_PATTERN)]
        .map((item) => cleanInline(item[1]))
        .filter(Boolean);
      if (items.length) blocks.push({ type: "list", items });
      else pushParagraphs(blocks, match[2]);
    } else {
      pushParagraphs(blocks, match[3]);
    }
  }
  pushParagraphs(blocks, input.slice(lastIndex));
  return blocks;
}

/** Single-line plain text, for meta descriptions, cards, and JSON-LD. */
export function toPlainText(input: string | null | undefined) {
  return cleanInline(input || "");
}

export function truncateText(value: string, limit: number) {
  if (value.length <= limit) return value;
  const clipped = value.slice(0, limit);
  const lastSpace = clipped.lastIndexOf(" ");
  return `${clipped.slice(0, lastSpace > 40 ? lastSpace : limit).trimEnd()}…`;
}
