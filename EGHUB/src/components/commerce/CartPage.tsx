import { useEffect, useState } from "react";
import {
  cartTotal,
  readCart,
  removeProduct,
  writeCart,
  type CartLine,
} from "@/lib/cart";
import { formatMoney } from "@/lib/catalog";

export default function CartPage() {
  const [lines, setLines] = useState<CartLine[]>([]);
  useEffect(() => setLines(readCart()), []);

  function change(productId: string, quantity: number) {
    const next = lines.map((line) =>
      line.productId === productId
        ? { ...line, quantity: Math.max(1, quantity) }
        : line,
    );
    setLines(next);
    writeCart(next);
  }
  function remove(productId: string) {
    removeProduct(productId);
    setLines(readCart());
  }

  return (
    <section className="content-page">
      <div className="container">
        <span className="eyebrow">Cart</span>
        <h1>Your digital resources.</h1>
        {lines.length ? (
          <div className="cart-layout">
            <div className="panel cart-lines">
              {lines.map((line) => (
                <article className="cart-line" key={line.productId}>
                  <div>
                    <strong>{line.title}</strong>
                    <a href={`/resources/${line.slug}`}>View product</a>
                  </div>
                  <label>
                    Quantity
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={line.quantity}
                      onChange={(event) =>
                        change(line.productId, Number(event.target.value))
                      }
                    />
                  </label>
                  <strong>
                    {formatMoney(line.priceCents * line.quantity)}
                  </strong>
                  <button type="button" onClick={() => remove(line.productId)}>
                    Remove
                  </button>
                </article>
              ))}
            </div>
            <aside className="panel cart-summary">
              <h2>Order summary</h2>
              <div>
                <span>Items</span>
                <strong>{lines.reduce((n, x) => n + x.quantity, 0)}</strong>
              </div>
              <div>
                <span>Subtotal</span>
                <strong>{formatMoney(cartTotal(lines))}</strong>
              </div>
              <p>Tax is calculated securely by Stripe at checkout.</p>
              <a className="btn btn-solid" href="/checkout">
                Continue to checkout
              </a>
            </aside>
          </div>
        ) : (
          <div className="empty-state">
            <span>✦</span>
            <h2>Your cart is empty.</h2>
            <p>
              Browse the worship library to add an album, chord book, or digital
              bundle.
            </p>
            <a className="btn btn-solid" href="/resources">
              Browse worship
            </a>
          </div>
        )}
      </div>
      <style>{`.cart-layout{display:grid;grid-template-columns:1fr 320px;gap:20px;margin-top:32px}.cart-lines{margin-top:0}.cart-line{display:grid;grid-template-columns:1fr 90px 110px auto;gap:18px;align-items:center;padding:14px 0;border-bottom:1px solid var(--line-soft)}.cart-line:last-child{border:0}.cart-line a,.cart-line button{display:block;margin-top:5px;color:var(--gold);font-size:.82rem}.cart-line label{color:var(--ink-soft);font-size:.75rem}.cart-line input{width:72px;min-height:38px;margin-top:4px;padding:5px;border:1px solid var(--line);background:var(--bg);color:var(--ink)}.cart-summary{margin-top:0;align-self:start}.cart-summary>div{display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--line-soft)}.cart-summary p{margin-top:14px;color:var(--ink-soft);font-size:.83rem}.cart-summary .btn{width:100%;justify-content:center;margin-top:20px}@media(max-width:800px){.cart-layout{grid-template-columns:1fr}.cart-line{grid-template-columns:1fr auto}.cart-line label{grid-column:1}.cart-line>strong{grid-column:2;grid-row:1}.cart-line button{grid-column:2;grid-row:2}}`}</style>
    </section>
  );
}
