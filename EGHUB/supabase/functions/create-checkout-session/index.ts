import Stripe from "npm:stripe@22.6.1";
import {
  functionError,
  handleOptions,
  json,
  readJson,
} from "../_shared/http.ts";
import { audit, requireUser } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  try {
    const { user, admin } = await requireUser(req);
    const { cartId } = await readJson<{ cartId: string }>(req);
    const { data: cart } = await admin
      .from("carts")
      .select("*")
      .eq("id", cartId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();
    if (!cart) return json(req, { error: "Cart not found" }, 404);
    const { data: cartItems } = await admin
      .from("cart_items")
      .select("product_id,quantity")
      .eq("cart_id", cartId);
    if (!cartItems?.length) return json(req, { error: "Cart is empty" }, 400);
    const { data: products } = await admin
      .from("products")
      .select("*")
      .in(
        "id",
        cartItems.map((item) => item.product_id),
      )
      .eq("status", "published");
    if (!products || products.length !== cartItems.length)
      return json(req, { error: "One or more products are unavailable" }, 409);
    const { data: productItems } = await admin
      .from("product_items")
      .select("product_id")
      .in(
        "product_id",
        products.map((product) => product.id),
      );
    const productsWithDownloads = new Set(
      (productItems || []).map((item) => item.product_id),
    );
    if (productsWithDownloads.size !== products.length)
      return json(
        req,
        {
          error:
            "One or more products are visible in the catalog but their downloadable files are still being prepared.",
        },
        409,
      );
    if (
      products.some(
        (product) =>
          product.price_cents <= 0 ||
          !product.stripe_price_id ||
          !product.stripe_tax_code,
      )
    )
      return json(
        req,
        {
          error:
            "Use the free-download flow for free items, or ask staff to finish Stripe setup.",
        },
        409,
      );
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
    const { data: profile } = await admin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile?.full_name || undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await admin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }
    const itemMap = new Map(
      cartItems.map((item) => [item.product_id, item.quantity]),
    );
    const site = Deno.env.get("SITE_URL") || "http://localhost:4321";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      automatic_tax: { enabled: true },
      billing_address_collection: "required",
      customer_update: { address: "auto", name: "auto" },
      line_items: products.map((product) => ({
        price: product.stripe_price_id!,
        quantity: itemMap.get(product.id) || 1,
      })),
      metadata: { user_id: user.id, cart_id: cartId },
      success_url: `${site}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/cart`,
    });
    await audit(admin, user.id, "checkout.created", "carts", cartId, {
      stripeSessionId: session.id,
    });
    return json(req, { checkoutUrl: session.url });
  } catch (error) {
    return functionError(req, error, "Checkout failed");
  }
});
