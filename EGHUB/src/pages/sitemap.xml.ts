import type { APIRoute } from "astro";
import { getCatalog } from "@/lib/catalog";
export const GET: APIRoute = async ({ site }) => {
  const catalog = await getCatalog();
  const paths = [
    "/",
    "/bibleinvideo",
    "/music/albums",
    "/resources",
    "/about",
    "/contact",
    "/privacy",
    "/terms",
    "/refund-policy",
    ...catalog.albums.map((x) => `/music/albums/${x.slug}`),
    ...catalog.episodes.map((x) => `/bibleinvideo/${x.slug}`),
    ...catalog.products.map((x) => `/resources/${x.slug}`),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<url><loc>${new URL(path, site).toString()}</loc></url>`).join("")}</urlset>`;
  return new Response(body, { headers: { "Content-Type": "application/xml" } });
};
