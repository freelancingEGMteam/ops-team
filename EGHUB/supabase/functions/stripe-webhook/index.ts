import Stripe from "npm:stripe@22.6.1";
import { adminClient, audit } from "../_shared/auth.ts";
import { fulfillOrder } from "../_shared/orders.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST")
    return new Response("Method not allowed", { status: 405 });
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      await req.text(),
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch (error) {
    console.error("Invalid Stripe signature", error);
    return new Response("Invalid signature", { status: 400 });
  }
  const admin = adminClient();
  const { data: processed } = await admin
    .from("webhook_events")
    .select("id")
    .eq("id", event.id)
    .maybeSingle();
  if (processed) return Response.json({ received: true, duplicate: true });
  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object as Stripe.Checkout.Session;
      if (
        session.payment_status === "paid" ||
        event.type === "checkout.session.async_payment_succeeded"
      )
        await fulfillSession(admin, session);
    } else if (event.type === "checkout.session.async_payment_failed") {
      const session = event.data.object as Stripe.Checkout.Session;
      await audit(
        admin,
        session.metadata?.user_id || null,
        "checkout.failed",
        "carts",
        session.metadata?.cart_id || null,
        { stripeSessionId: session.id },
      );
    } else if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntent =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;
      if (paymentIntent) {
        const { data: order } = await admin
          .from("orders")
          .select("*")
          .eq("stripe_payment_intent_id", paymentIntent)
          .maybeSingle();
        if (order) {
          const full = charge.amount_refunded >= charge.amount;
          await admin
            .from("orders")
            .update({ status: full ? "refunded" : "partially_refunded" })
            .eq("id", order.id);
          if (full) {
            const { data: items } = await admin
              .from("order_items")
              .select("id")
              .eq("order_id", order.id);
            if (items?.length)
              await admin
                .from("download_entitlements")
                .update({
                  revoked_at: new Date().toISOString(),
                  revoked_reason: "Stripe refund",
                })
                .in(
                  "order_item_id",
                  items.map((item) => item.id),
                );
          }
          await audit(
            admin,
            null,
            "stripe.refund_observed",
            "orders",
            order.id,
            { full, amountRefunded: charge.amount_refunded },
          );
        }
      }
    }
    await admin.from("webhook_events").insert({
      id: event.id,
      provider: "stripe",
      event_type: event.type,
      payload: event as unknown as Record<string, unknown>,
    });
    return Response.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed", {
      eventId: event.id,
      error,
    });
    return new Response("Processing failed", { status: 500 });
  }
});

async function fulfillSession(
  admin: ReturnType<typeof adminClient>,
  session: Stripe.Checkout.Session,
) {
  const userId = session.metadata?.user_id;
  const cartId = session.metadata?.cart_id;
  if (!userId || !cartId) throw new Error("Checkout metadata is incomplete");
  const { data: cartItems } = await admin
    .from("cart_items")
    .select("product_id,quantity")
    .eq("cart_id", cartId);
  if (!cartItems?.length) throw new Error("Checkout cart is empty");
  const { data: products } = await admin
    .from("products")
    .select("id,title,price_cents")
    .in(
      "id",
      cartItems.map((item) => item.product_id),
    );
  if (!products || products.length !== cartItems.length)
    throw new Error("Checkout products are missing");
  const quantities = new Map(
    cartItems.map((item) => [item.product_id, item.quantity]),
  );
  const productLines = products.map((product) => ({
    ...product,
    quantity: quantities.get(product.id) || 1,
  }));
  const subtotal = productLines.reduce(
    (sum, product) => sum + product.price_cents * product.quantity,
    0,
  );
  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
  const { data: profile } = await admin
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .single();
  await fulfillOrder(admin, {
    userId,
    email: profile?.email || session.customer_details?.email || "",
    products: productLines,
    subtotalCents: subtotal,
    taxCents: session.total_details?.amount_tax || 0,
    totalCents: session.amount_total || subtotal,
    stripeSessionId: session.id,
    stripePaymentIntentId: paymentIntent || null,
  });
  await admin.from("carts").update({ status: "converted" }).eq("id", cartId);
}
