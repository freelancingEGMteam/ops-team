import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("home is crawlable, canonical, structured, and production-empty", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Eternal Grace Hub");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "index,follow",
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/$/,
  );
  expect(
    await page.locator('script[type="application/ld+json"]').textContent(),
  ).toContain("Organization");
  await expect(
    page.getByRole("heading", { name: "The first record is being prepared." }),
  ).toBeVisible();
});

test("representative public page has no serious or critical accessibility findings", async ({
  page,
}) => {
  await page.goto("/about");
  const findings = await new AxeBuilder({ page }).analyze();
  expect(
    findings.violations.filter((item) =>
      ["serious", "critical"].includes(item.impact || ""),
    ),
  ).toEqual([]);
});

test("legacy hash routes become clean paths", async ({ page }) => {
  await page.goto("/#/about");
  await expect(page).toHaveURL(/\/about$/);
});

test("sitemap and robots expose only public discovery routes", async ({
  request,
}) => {
  const sitemap = await request.get("/sitemap.xml");
  const robots = await request.get("/robots.txt");
  await expect(sitemap).toBeOK();
  await expect(robots).toBeOK();
  expect(await sitemap.text()).toContain("/bibleinvideo");
  expect(await sitemap.text()).not.toContain("/admin");
  expect(await robots.text()).toContain("Disallow: /admin");
});

test("mobile navigation opens and closes accessibly", async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "mobile-only behavior");
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Open menu" });
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await menu.click();
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await page
    .getByLabel("Primary navigation")
    .getByRole("link", { name: "About", exact: true })
    .click();
  await expect(page).toHaveURL(/\/about$/);
});
