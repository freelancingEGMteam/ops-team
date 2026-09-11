import { useEffect, useState } from "react";
import { clearCart } from "@/lib/cart";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { Order } from "@/types/domain";

export default function OrderConfirmation() {
  const [order, setOrder] = useState<Order | null>(null);
  const [message, setMessage] = useState("Confirming your payment…");
  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get(
      "session_id",
    );
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !sessionId) {
      setMessage(
        "Your payment is processing. Your library will update when Stripe confirms it.",
      );
      return;
    }
    let attempts = 0;
    const load = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("stripe_checkout_session_id", sessionId)
        .maybeSingle();
      if (data) {
        clearCart();
        setOrder(data as Order);
        setMessage("");
        return;
      }
      attempts += 1;
      if (attempts < 8) window.setTimeout(load, 1500);
      else
        setMessage(
          "Payment was received, but fulfillment is still processing. Check your account shortly.",
        );
    };
    void load();
  }, []);
  return (
    <section className="content-page">
      <div className="container-narrow">
        <span className="eyebrow">Order status</span>
        <h1>{order ? "Your order is ready." : "Thank you."}</h1>
        <p className="lead">
          {message ||
            `Order ${order?.order_number} is available in your account.`}
        </p>
        <div className="button-row">
          <a className="btn btn-solid" href="/account/downloads">
            Open my downloads
          </a>
          <a className="btn btn-ghost" href="/account/orders">
            View orders
          </a>
        </div>
      </div>
      <style>{`.button-row{margin-top:28px}`}</style>
    </section>
  );
}
