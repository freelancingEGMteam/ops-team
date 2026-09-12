import Stripe from "npm:stripe@22.6.1";
import { z } from "npm:zod@4.5.4";
import {
  functionError,
  handleOptions,
  json,
  readJson,
} from "../_shared/http.ts";
import { audit, requireUser } from "../_shared/auth.ts";

const bodySchema = z.object({ cartId: z.string().uuid() });

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  try {
    const { user, admin } = await requireUser(req);
    const { cartId } = await readJson(req, bodySchema);
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
      .select("variant_id,quantity")
      .eq("cart_id", cartId);
    if (!cartItems?.length) return json(req, { error: "Cart is empty" }, 400);
    const { data: variants } = await admin
      .from("product_variants")
      .select("*,products!inner(status,stripe_tax_code)")
      .in(
        "id",
        cartItems.map((item) => item.variant_id),
      )
      .eq("is_active", true)
      .eq("products.status", "published");
    if (!variants || variants.length !== cartItems.length)
      return json(req, { error: "One or more products are unavailable" }, 409);
    const { data: variantItems } = await admin
      .from("product_items")
      .select("variant_id")
      .in(
        "variant_id",
        variants.map((variant) => variant.id),
      );
    const variantsWithDownloads = new Set(
      (variantItems || []).map((item) => item.variant_id),
    );
    if (variantsWithDownloads.size !== variants.length)
      return json(
        req,
        {
          error:
            "One or more products are visible in the catalog but their downloadable files are still being prepared.",
        },
        409,
      );
    if (
      variants.some(
        (variant: any) =>
          variant.price_cents <= 0 ||
          !variant.stripe_price_id ||
          !variant.products?.stripe_tax_code,
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
      cartItems.map((item) => [item.variant_id, item.quantity]),
    );
    const site = Deno.env.get("SITE_URL") || "http://localhost:4321";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      automatic_tax: { enabled: true },
      billing_address_collection: "required",
      customer_update: { address: "auto", name: "auto" },
      line_items: variants.map((variant) => ({
        price: variant.stripe_price_id!,
        quantity: itemMap.get(variant.id) || 1,
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
