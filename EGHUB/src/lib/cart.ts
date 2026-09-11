import type { Product } from "@/types/domain";

export interface CartLine {
  productId: string;
  slug: string;
  title: string;
  priceCents: number;
  quantity: number;
}

const CART_KEY = "egh-cart-v2";

export function readCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function writeCart(lines: CartLine[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(lines));
  window.dispatchEvent(new CustomEvent("egh-cart-changed", { detail: lines }));
}

export function addProduct(product: Product) {
  const lines = readCart();
  const existing = lines.find((line) => line.productId === product.id);
  if (existing) existing.quantity += 1;
  else
    lines.push({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      priceCents: product.price_cents,
      quantity: 1,
    });
  writeCart(lines);
}

export function removeProduct(productId: string) {
  writeCart(readCart().filter((line) => line.productId !== productId));
}

export function clearCart() {
  writeCart([]);
}

export function cartTotal(lines: CartLine[]) {
  return lines.reduce(
    (total, line) => total + line.priceCents * line.quantity,
    0,
  );
}
