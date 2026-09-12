import type { Product, Track } from "@/types/domain";

export interface DisplayTrack {
  number: number;
  title: string;
}

type ProductWithTracks = Pick<Product, "title" | "description"> & {
  tracks?: Track[];
};

function cleanMarkup(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function listItems(description: string) {
  return Array.from(description.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi))
    .map((match) => cleanMarkup(match[1]))
    .filter(Boolean)
    .filter((item) => !/^https?:\/\//i.test(item));
}

function includedTitles(description: string) {
  const match = description.match(
    /\bincluding\s+([\s\S]*?)(?:<\/p>|\.\s*(?:These|This|The|They)\b|$)/i,
  );
  if (!match) return [];
  const markedTitles = Array.from(
    match[1].matchAll(/<(?:em|strong)>([\s\S]*?)<\/(?:em|strong)>/gi),
  )
    .map((title) => cleanMarkup(title[1]).replace(/[.]$/, ""))
    .filter(Boolean);
  if (markedTitles.length >= 2) return markedTitles;
  return cleanMarkup(match[1])
    .split(/,|\s+and\s+/i)
    .map((title) =>
      title
        .replace(/^["“]|["”]$/g, "")
        .replace(/[.]$/, "")
        .trim(),
    )
    .filter(Boolean);
}

function scriptureRange(source: string) {
  const match = source.match(
    /\b(?:psalm|psalms)\s*(\d+)\s*(?:to|[-–—])\s*(\d+)\b/i,
  );
  if (!match) return [];
  const start = Number(match[1]);
  const end = Number(match[2]);
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    end < start ||
    end - start > 30
  ) {
    return [];
  }
  return Array.from(
    { length: end - start + 1 },
    (_, index) => `Psalm ${start + index}`,
  );
}

/**
 * Returns the best track list available for a catalog product. Imported
 * products often arrive before their downloadable files or album relation,
 * so Scripture-based album titles get a useful list instead of an empty page.
 */
export function tracklistForProduct(
  product: ProductWithTracks,
): DisplayTrack[] {
  if (product.tracks?.length) {
    return product.tracks
      .slice()
      .sort((a, b) => a.track_number - b.track_number)
      .map((track, index) => ({
        number: track.track_number || index + 1,
        title: track.title,
      }));
  }

  const description = product.description || "";
  const titles = includedTitles(description);
  const items = titles.length >= 2 ? titles : listItems(description);
  const fallback = items.length
    ? items
    : scriptureRange(`${product.title} ${description}`);

  return fallback.map((title, index) => ({ number: index + 1, title }));
}
