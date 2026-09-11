import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Product } from "@/types/domain";
import {
  addProduct,
  cartTotal,
  clearCart,
  readCart,
  removeProduct,
} from "./cart";

const product: Product = {
  id: "product-1",
  slug: "grace-album",
  title: "Grace Album",
  kind: "album_mp3",
  description: null,
  price_cents: 1299,
  currency: "usd",
  stripe_product_id: null,
  stripe_price_id: null,
  stripe_tax_code: "txcd_10000000",
  cover_asset_id: null,
  album_id: null,
  track_id: null,
  tag: null,
  status: "published",
  published_at: "2026-09-03T00:00:00.000Z",
  scheduled_for: null,
  created_at: "2026-09-03T00:00:00.000Z",
  updated_at: "2026-09-03T00:00:00.000Z",
};

describe("anonymous cart", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("adds products, consolidates quantities, and calculates cents exactly", () => {
    const listener = vi.fn();
    window.addEventListener("egh-cart-changed", listener);
    addProduct(product);
    addProduct(product);
    expect(readCart()).toEqual([
      {
        productId: "product-1",
        slug: "grace-album",
        title: "Grace Album",
        priceCents: 1299,
        quantity: 2,
      },
    ]);
    expect(cartTotal(readCart())).toBe(2598);
    expect(listener).toHaveBeenCalledTimes(2);
    window.removeEventListener("egh-cart-changed", listener);
  });

  it("removes one product without touching the rest", () => {
    addProduct(product);
    addProduct({
      ...product,
      id: "product-2",
      slug: "lyrics",
      title: "Lyrics",
      price_cents: 499,
    });
    removeProduct("product-1");
    expect(readCart().map((line) => line.productId)).toEqual(["product-2"]);
    clearCart();
    expect(readCart()).toEqual([]);
  });

  it("recovers from corrupt local storage", () => {
    localStorage.setItem("egh-cart-v2", "not-json");
    expect(readCart()).toEqual([]);
  });
});
