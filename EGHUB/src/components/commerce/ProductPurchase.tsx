import { useState } from "react";
import type { Product } from "@/types/domain";
import { addProduct } from "@/lib/cart";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export default function ProductPurchase({
  product,
  downloadCount = 0,
}: {
  product: Product;
  downloadCount?: number;
}) {
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  const hasDownloads = downloadCount > 0;

  async function claimFree() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return setStatus("Account service is not configured yet.");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      window.location.href = `/login?next=${encodeURIComponent(`/resources/${product.slug}`)}`;
      return;
    }
    setPending(true);
    const { data, error } = await supabase.functions.invoke(
      "claim-free-product",
      { body: { productId: product.id } },
    );
    setPending(false);
    if (error) return setStatus(error.message);
    window.location.href = `/account/orders/${data.orderId}`;
  }

  function add() {
    addProduct(product);
    setStatus("Added to cart.");
  }

  return (
    <div className="purchase-actions">
      {!hasDownloads ? (
        <>
          <button className="btn btn-ghost" type="button" disabled>
            Files coming soon
          </button>
          <span>
            This release is public in the catalog while its downloadable files
            are being prepared.
          </span>
        </>
      ) : product.price_cents === 0 ? (
        <button
          className="btn btn-solid"
          type="button"
          onClick={() => void claimFree()}
          disabled={pending}
        >
          {pending ? "Preparing…" : "Add to my library"}
        </button>
      ) : (
        <>
          <button className="btn btn-solid" type="button" onClick={add}>
            Add to cart
          </button>
          <a className="btn btn-ghost" href="/cart">
            View cart
          </a>
        </>
      )}
      {status && <span role="status">{status}</span>}
      <style>{`.purchase-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:24px}.purchase-actions span{width:100%;color:var(--ink-dim);font-size:.9rem}`}</style>
    </div>
  );
}
