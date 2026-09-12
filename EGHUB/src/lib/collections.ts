import type { Product, ProductVariant } from "@/types/domain";

export const sourceCollections = [
  { slug: "all", label: "All products" },
  { slug: "mp3-files", label: "MP3 Files" },
  { slug: "chord-sheets", label: "Chord Sheets" },
  { slug: "oldhymns", label: "Old Hymns" },
  { slug: "psalms", label: "Singing the Psalms" },
  { slug: "topical-worship", label: "Topical Worship" },
] as const;

export type CollectionKey = (typeof sourceCollections)[number]["slug"];

const collectionLabels = new Map(
  sourceCollections.map((collection) => [collection.slug, collection.label]),
);

export function isCollectionKey(
  value: string | null | undefined,
): value is CollectionKey {
  return Boolean(value && collectionLabels.has(value as CollectionKey));
}

export function collectionLabel(value: CollectionKey) {
  return collectionLabels.get(value) || value;
}

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

/**
 * Fourthwall uses overlapping collections. The local product model has one
 * catalog tag, so derive the same multi-collection membership from the
 * imported product's variant kinds and title while keeping the source labels
 * intact. A product can carry several variants (MP3 / chords / bundle), so
 * it shows up in a collection if *any* variant matches.
 */
export function collectionsForProduct(
  product: Pick<Product, "title" | "tag"> & {
    variants: Pick<ProductVariant, "kind">[];
  },
): CollectionKey[] {
  const value = `${product.title} ${product.tag || ""}`.toLowerCase();
  const kinds = new Set(product.variants.map((variant) => variant.kind));
  const collections = new Set<Exclude<CollectionKey, "all">>();

  const chordProduct =
    kinds.has("album_chords") ||
    kinds.has("track_chords") ||
    includesAny(value, ["chord sheet", "chord-sheet", "guitar chord"]);
  if (chordProduct) collections.add("chord-sheets");

  if (includesAny(value, ["psalm", "psalms"])) collections.add("psalms");

  if (
    includesAny(value, [
      "hymn",
      "mighty fortress",
      "christ the lord is risen today",
      "all the way to calvary",
    ])
  ) {
    collections.add("oldhymns");
  }

  const audioProduct =
    kinds.has("album_mp3") ||
    kinds.has("track_mp3") ||
    kinds.has("bundle") ||
    includesAny(value, ["audio", "mp3"]);
  if (audioProduct) collections.add("mp3-files");

  if (
    includesAny(value, [
      "the paths of wisdom",
      "fruits of the spirit",
      "morning praise",
      "the names of jesus",
      "victory through trials",
      "risen king",
      "season of grace",
      "blessed are the meek",
      "till the end of the world",
      "kingdome come",
      "grace that overflows",
      "my soul rejoices",
      "from generation to generation",
      "powerful prayers",
      "faithful army",
      "god's faithful army",
      "god's faithful army",
      "romans 8",
      "my shield is faith",
      "i have mighty god",
    ])
  ) {
    collections.add("topical-worship");
  }

  // Imported records without a more specific match are still MP3 releases
  // in the source catalog, which is the safest default for the public filter.
  if (!collections.size) collections.add("mp3-files");

  return sourceCollections
    .slice(1)
    .map((collection) => collection.slug)
    .filter((slug): slug is Exclude<CollectionKey, "all"> =>
      collections.has(slug as Exclude<CollectionKey, "all">),
    );
}
