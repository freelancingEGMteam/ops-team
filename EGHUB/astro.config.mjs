import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || "http://localhost:4321",
  output: "server",
  adapter: vercel(),
  session: false,
  integrations: [react()],
  vite: {
    ssr: {
      noExternal: ["@supabase/supabase-js"],
    },
  },
});
