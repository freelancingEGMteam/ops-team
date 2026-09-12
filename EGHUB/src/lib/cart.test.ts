import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addVariant,
  cartTotal,
  clearCart,
  readCart,
  removeVariant,
} from "./cart";

const product = { slug: "grace-album", title: "Grace Album" };
const variant = { id: "variant-1", price_cents: 1299, label: "MP3 Album" };

describe("anonymous cart", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("adds a variant once and calculates cents exactly", () => {
    const listener = vi.fn();
    window.addEventListener("egh-cart-changed", listener);
    addVariant(product, variant);
    expect(readCart()).toEqual([
      {
        variantId: "variant-1",
        productSlug: "grace-album",
        productTitle: "Grace Album",
        variantLabel: "MP3 Album",
        priceCents: 1299,
        quantity: 1,
      },
    ]);
    expect(cartTotal(readCart())).toBe(1299);
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener("egh-cart-changed", listener);
  });

  it("adding an already-in-cart variant again is a no-op, not a quantity bump", () => {
    expect(addVariant(product, variant)).toBe(true);
    expect(addVariant(product, variant)).toBe(false);
    expect(readCart()).toHaveLength(1);
    expect(readCart()[0].quantity).toBe(1);
  });

  it("keeps two variants of the same product as separate lines", () => {
    addVariant(product, variant);
    addVariant(product, {
      id: "variant-2",
      price_cents: 499,
      label: "Chord Book",
    });
    expect(readCart().map((line) => line.variantId)).toEqual([
      "variant-1",
      "variant-2",
    ]);
  });

  it("removes one variant without touching the rest", () => {
    addVariant(product, variant);
    addVariant(product, {
      id: "variant-2",
      price_cents: 499,
      label: "Chord Book",
    });
    removeVariant("variant-1");
    expect(readCart().map((line) => line.variantId)).toEqual(["variant-2"]);
    clearCart();
    expect(readCart()).toEqual([]);
  });

  it("recovers from corrupt local storage", () => {
    localStorage.setItem("egh-cart-v3", "not-json");
    expect(readCart()).toEqual([]);
  });
});
