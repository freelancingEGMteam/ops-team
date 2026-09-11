import { useEffect, useState } from "react";
import { cartTotal, readCart, type CartLine } from "@/lib/cart";
import { formatMoney } from "@/lib/catalog";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export default function CheckoutPage() {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(true);
  const [error, setError] = useState("");
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    setLines(readCart());
    if (!supabase) {
      setPending(false);
      setError("Checkout is not configured yet.");
      return;
    }
    void supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        window.location.href = `/login?next=${encodeURIComponent("/checkout")}`;
        return;
      }
      setEmail(data.user.email || "");
      setPending(false);
    });
  }, [supabase]);

  async function checkout() {
    if (!supabase || !lines.length) return;
    setPending(true);
    setError("");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      window.location.href = "/login?next=/checkout";
      return;
    }
    let { data: cart } = await supabase
      .from("carts")
      .select("*")
      .eq("user_id", auth.user.id)
      .eq("status", "active")
      .maybeSingle();
    if (!cart) {
      const created = await supabase
        .from("carts")
        .insert({ user_id: auth.user.id, status: "active" })
        .select("*")
        .single();
      if (created.error) {
        setPending(false);
        setError(created.error.message);
        return;
      }
      cart = created.data;
    }
    const cartId = cart?.id;
    if (!cartId) {
      setPending(false);
      setError("Could not prepare your cart.");
      return;
    }
    await supabase.from("cart_items").delete().eq("cart_id", cartId);
    const insert = await supabase.from("cart_items").insert(
      lines.map((line) => ({
        cart_id: cartId,
        product_id: line.productId,
        quantity: line.quantity,
      })),
    );
    if (insert.error) {
      setPending(false);
      setError(insert.error.message);
      return;
    }
    const result = await supabase.functions.invoke("create-checkout-session", {
      body: { cartId },
    });
    if (result.error || !result.data?.checkoutUrl) {
      setPending(false);
      setError(result.error?.message || "Could not start checkout.");
      return;
    }
    window.location.href = result.data.checkoutUrl;
  }

  return (
    <section className="content-page">
      <div className="container-narrow">
        <span className="eyebrow">Secure checkout</span>
        <h1>Complete your order.</h1>
        <div className="panel checkout-panel">
          <div>
            <h2>Signed-in account</h2>
            <p>{email || "Checking your account…"}</p>
          </div>
          <div>
            <h2>Order</h2>
            {lines.map((line) => (
              <div className="checkout-line" key={line.productId}>
                <span>
                  {line.title} × {line.quantity}
                </span>
                <strong>{formatMoney(line.priceCents * line.quantity)}</strong>
              </div>
            ))}
            <div className="checkout-total">
              <span>Subtotal</span>
              <strong>{formatMoney(cartTotal(lines))}</strong>
            </div>
            <p>
              Stripe calculates applicable tax from your billing address. You
              will return here after payment.
            </p>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="btn btn-solid"
            type="button"
            disabled={pending || !lines.length}
            onClick={() => void checkout()}
          >
            {pending ? "Preparing…" : "Continue to Stripe"}
          </button>
        </div>
      </div>
      <style>{`.checkout-panel{display:grid;gap:24px;margin-top:30px}.checkout-panel h2{font-size:1.2rem}.checkout-panel p{margin-top:8px;color:var(--ink-dim)}.checkout-line,.checkout-total{display:flex;justify-content:space-between;gap:20px;padding:11px 0;border-bottom:1px solid var(--line-soft)}.checkout-total{margin-top:8px;font-size:1.1rem}.checkout-panel .btn{justify-content:center}`}</style>
    </section>
  );
}
