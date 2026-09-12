import { describe, expect, it } from "vitest";
import { parseRichText, toPlainText, truncateText } from "./rich-text";

// Representative of the imported Fourthwall copy actually in the catalog.
const imported =
  '<p>This collection features 10 remastered songs, &#34;Psalms 1 to 10&#34;.</p> <ul class="marker:text-textOff list-disc"><li> <p class="my-0">Includes chords</p> </li><li> <p>Letter &amp; A4</p> </li></ul>';

describe("parseRichText", () => {
  it("splits imported markup into paragraphs and lists", () => {
    expect(parseRichText(imported)).toEqual([
      {
        type: "paragraph",
        text: 'This collection features 10 remastered songs, "Psalms 1 to 10".',
      },
      { type: "list", items: ["Includes chords", "Letter & A4"] },
    ]);
  });

  it("decodes numeric and hex entities, including emoji", () => {
    expect(
      parseRichText("<p>Watch now &#x1f64f; &#8212; key of G &#61; easy</p>"),
    ).toEqual([{ type: "paragraph", text: "Watch now 🙏 — key of G = easy" }]);
  });

  it("treats copy with no markup as a single paragraph", () => {
    expect(parseRichText("A plain description.")).toEqual([
      { type: "paragraph", text: "A plain description." },
    ]);
  });

  it("keeps loose text that sits outside block tags", () => {
    expect(parseRichText("Intro line<p>Second block</p>")).toEqual([
      { type: "paragraph", text: "Intro line" },
      { type: "paragraph", text: "Second block" },
    ]);
  });

  it("returns nothing for empty or missing copy", () => {
    expect(parseRichText(null)).toEqual([]);
    expect(parseRichText("")).toEqual([]);
    expect(parseRichText("<p> </p>")).toEqual([]);
  });
});

describe("toPlainText", () => {
  it("flattens markup to one line for meta descriptions", () => {
    expect(toPlainText(imported)).toBe(
      'This collection features 10 remastered songs, "Psalms 1 to 10". Includes chords Letter & A4',
    );
  });

  it("is empty for missing copy", () => {
    expect(toPlainText(undefined)).toBe("");
  });
});

describe("truncateText", () => {
  it("leaves short text alone", () => {
    expect(truncateText("Short copy", 160)).toBe("Short copy");
  });

  it("clips on a word boundary and adds an ellipsis", () => {
    const result = truncateText("a".repeat(30) + " tail words here", 40);
    expect(result.endsWith("…")).toBe(true);
    expect(result.length).toBeLessThanOrEqual(41);
  });
});
