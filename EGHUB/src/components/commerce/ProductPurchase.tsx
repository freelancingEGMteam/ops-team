import { useMemo, useState } from "react";
import type { CatalogProduct, CatalogProductVariant } from "@/lib/catalog";
import { formatMoney } from "@/lib/catalog";
import { addVariant } from "@/lib/cart";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export default function ProductPurchase({
  product,
}: {
  product: CatalogProduct;
}) {
  const variants = product.variants;
  const purchasable = useMemo(
    () => variants.filter((variant) => variant.is_active),
    [variants],
  );
  const defaultVariant =
    purchasable.find((variant) => variant.download_count > 0) || purchasable[0];
  const [selectedId, setSelectedId] = useState(defaultVariant?.id || "");
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  const selected = purchasable.find((variant) => variant.id === selectedId);
  const anyDownloadable = purchasable.some(
    (variant) => variant.download_count > 0,
  );

  async function claimFree() {
    if (!selected) return;
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
      { body: { variantId: selected.id } },
    );
    setPending(false);
    if (error) return setStatus(error.message);
    window.location.href = `/account/orders/${data.orderId}`;
  }

  function add() {
    if (!selected) return;
    const added = addVariant(
      { slug: product.slug, title: product.title },
      {
        id: selected.id,
        price_cents: selected.price_cents,
        label: selected.label,
      },
    );
    setStatus(added ? "Added to cart." : "Already in your cart.");
  }

  function buyNow() {
    if (!selected) return;
    addVariant(
      { slug: product.slug, title: product.title },
      {
        id: selected.id,
        price_cents: selected.price_cents,
        label: selected.label,
      },
    );
    window.location.href = "/checkout";
  }

  if (!purchasable.length || !anyDownloadable) {
    return (
      <div className="buy-box-actions">
        <button className="btn btn-ghost" type="button" disabled>
          Files coming soon
        </button>
        <span>
          This release is public in the catalog while its downloadable files are
          being prepared.
        </span>
        <PurchaseStyles />
      </div>
    );
  }

  return (
    <div className="buy-box-actions">
      {purchasable.length > 1 && (
        <fieldset className="variant-picker">
          <legend>Choose an option</legend>
          {purchasable.map((variant) => (
            <VariantOption
              key={variant.id}
              variant={variant}
              checked={variant.id === selectedId}
              onSelect={() => setSelectedId(variant.id)}
            />
          ))}
        </fieldset>
      )}
      {selected && (
        <strong className="buy-box-price">
          {formatMoney(selected.price_cents)}
        </strong>
      )}
      {selected && selected.download_count === 0 ? (
        <span>This option's files are still being prepared.</span>
      ) : selected && selected.price_cents === 0 ? (
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
          <button className="btn btn-solid" type="button" onClick={buyNow}>
            Buy now
          </button>
          <button className="btn btn-ghost" type="button" onClick={add}>
            Add to cart
          </button>
        </>
      )}
      {status && <span role="status">{status}</span>}
      <PurchaseStyles />
    </div>
  );
}

function PurchaseStyles() {
  return (
    <style>{`
      .buy-box-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:20px}
      .buy-box-actions span{width:100%;color:var(--ink-dim);font-size:.9rem}
      .buy-box-actions .btn{width:100%;justify-content:center}
      .variant-picker{width:100%;border:0;padding:0;margin:0 0 4px;display:grid;gap:8px}
      .variant-picker legend{padding:0 0 8px;color:var(--ink-soft);font-size:.8rem;text-transform:uppercase;letter-spacing:.04em}
      .variant-option{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--line);border-radius:8px;cursor:pointer}
      .variant-option:has(input:checked){border-color:var(--gold);background:var(--bg-elev)}
      .variant-option.is-disabled{opacity:.55;cursor:not-allowed}
      .variant-option-label{flex:1}
      .variant-option-price{color:var(--ink-dim);font-size:.9rem}
    `}</style>
  );
}

function VariantOption({
  variant,
  checked,
  onSelect,
}: {
  variant: CatalogProductVariant;
  checked: boolean;
  onSelect: () => void;
}) {
  const disabled = variant.download_count === 0;
  return (
    <label className={`variant-option${disabled ? " is-disabled" : ""}`}>
      <input
        type="radio"
        name="variant"
        checked={checked}
        disabled={disabled}
        onChange={onSelect}
      />
      <span className="variant-option-label">
        {variant.label || "Standard"}
      </span>
      <span className="variant-option-price">
        {disabled ? "Coming soon" : formatMoney(variant.price_cents)}
      </span>
    </label>
  );
}
