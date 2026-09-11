import { expect, test } from "@playwright/test";

test("account routes redirect unauthenticated visitors before rendering", async ({
  request,
}) => {
  const response = await request.get("/account/orders", { maxRedirects: 0 });
  expect(response.status()).toBe(303);
  expect(response.headers().location).toContain("/login");
  expect(response.headers().location).toContain("next=%2Faccount%2Forders");
});

test("admin routes redirect unauthenticated visitors before rendering", async ({
  request,
}) => {
  const response = await request.get("/admin/products", { maxRedirects: 0 });
  expect(response.status()).toBe(303);
  expect(response.headers().location).toContain("/login");
  expect(response.headers().location).toContain("next=%2Fadmin%2Fproducts");
});

test("private and authentication pages carry noindex metadata", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex,nofollow",
  );
});
