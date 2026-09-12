export interface CartLine {
  variantId: string;
  productSlug: string;
  productTitle: string;
  variantLabel: string | null;
  priceCents: number;
  quantity: number;
}

export interface CartVariant {
  id: string;
  price_cents: number;
  label: string | null;
}

export interface CartVariantProduct {
  slug: string;
  title: string;
}

const CART_KEY = "egh-cart-v3";

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

/**
 * Each variant is a one-per-cart digital license — adding one already in the
 * cart is a no-op rather than bumping quantity, since there's no UI to dial
 * it back down (these aren't goods you'd buy multiples of).
 */
export function addVariant(product: CartVariantProduct, variant: CartVariant) {
  const lines = readCart();
  if (lines.some((line) => line.variantId === variant.id)) return false;
  lines.push({
    variantId: variant.id,
    productSlug: product.slug,
    productTitle: product.title,
    variantLabel: variant.label,
    priceCents: variant.price_cents,
    quantity: 1,
  });
  writeCart(lines);
  return true;
}

export function removeVariant(variantId: string) {
  writeCart(readCart().filter((line) => line.variantId !== variantId));
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
