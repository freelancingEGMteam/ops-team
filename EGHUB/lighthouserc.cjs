module.exports = {
  ci: {
    collect: {
      startServerCommand:
        "cross-env ASTRO_DEV_BACKGROUND=0 pnpm dev --host 127.0.0.1",
      startServerReadyPattern: "4321",
      url: [
        "http://127.0.0.1:4321/",
        "http://127.0.0.1:4321/about",
        "http://127.0.0.1:4321/resources",
      ],
      numberOfRuns: 1,
      settings: {
        onlyCategories: ["accessibility", "seo"],
        chromeFlags:
          "--headless --no-sandbox --disable-gpu --user-data-dir=.lighthouseci/chrome-profile",
      },
    },
    assert: {
      assertions: {
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "categories:seo": ["error", { minScore: 0.9 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci/results",
    },
  },
};
