import { describe, expect, it } from "vitest";
import { tracklistForProduct } from "./tracklist";

describe("tracklistForProduct", () => {
  it("uses published album tracks when they are available", () => {
    const tracks = tracklistForProduct({
      title: "A worship album",
      description: null,
      tracks: [
        {
          id: "2",
          album_id: "album",
          track_number: 2,
          title: "Second song",
          runtime_seconds: null,
          song_key: null,
          lyrics: null,
          audio_asset_id: null,
          preview_asset_id: null,
          chord_pdf_asset_id: null,
          lyrics_pdf_asset_id: null,
          price_mp3_cents: 100,
          price_chords_cents: 100,
          status: "published",
          scheduled_for: null,
        },
        {
          id: "1",
          album_id: "album",
          track_number: 1,
          title: "First song",
          runtime_seconds: null,
          song_key: null,
          lyrics: null,
          audio_asset_id: null,
          preview_asset_id: null,
          chord_pdf_asset_id: null,
          lyrics_pdf_asset_id: null,
          price_mp3_cents: 100,
          price_chords_cents: 100,
          status: "published",
          scheduled_for: null,
        },
      ],
    });

    expect(tracks.map((track) => track.title)).toEqual([
      "First song",
      "Second song",
    ]);
  });

  it("turns Psalm range album titles into a useful imported track list", () => {
    const tracks = tracklistForProduct({
      title: "Psalms 1–10 Remastered + Chord Sheet",
      description: "Ten worship songs inspired by Psalms 1 to 10.",
    });

    expect(tracks).toHaveLength(10);
    expect(tracks[0].title).toBe("Psalm 1");
    expect(tracks[9].title).toBe("Psalm 10");
  });

  it("extracts explicitly included song titles from imported descriptions", () => {
    const tracks = tracklistForProduct({
      title: "Hymns of Faith Vol. 1",
      description:
        "A collection including <em>Glory to His Name</em>, <em>Yes, I Know!</em>, and <em>Rescue the Perishing</em>.",
    });

    expect(tracks.map((track) => track.title)).toEqual([
      "Glory to His Name",
      "Yes, I Know!",
      "Rescue the Perishing",
    ]);
  });
});
