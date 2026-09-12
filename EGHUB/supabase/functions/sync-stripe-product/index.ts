import Stripe from "npm:stripe@22.6.1";
import { z } from "npm:zod@4.5.4";
import {
  functionError,
  handleOptions,
  json,
  readJson,
} from "../_shared/http.ts";
import { audit, requireStaff } from "../_shared/auth.ts";

const bodySchema = z.object({ productId: z.string().uuid() });

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  try {
    const { user, admin } = await requireStaff(req, ["owner", "admin"]);
    const { productId } = await readJson(req, bodySchema);
    const { data: product } = await admin
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();
    if (!product) return json(req, { error: "Product not found" }, 404);
    const { data: variants } = await admin
      .from("product_variants")
      .select("*")
      .eq("product_id", productId);
    const paidVariants = (variants || []).filter(
      (variant) => variant.price_cents > 0,
    );
    if (!paidVariants.length)
      return json(
        req,
        { error: "This product has no paid variants to sync" },
        400,
      );
    if (!product.stripe_tax_code)
      return json(req, { error: "Set a Stripe tax code first" }, 409);
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
    // One Stripe Product per parent — shared by every variant's Price, since
    // Stripe Tax attaches to the Product object, not the Price.
    let stripeProductId = product.stripe_product_id;
    if (!stripeProductId) {
      const created = await stripe.products.create({
        name: product.title,
        description: product.description || undefined,
        tax_code: product.stripe_tax_code,
        metadata: { egh_product_id: product.id },
      });
      stripeProductId = created.id;
    } else {
      await stripe.products.update(stripeProductId, {
        name: product.title,
        description: product.description || undefined,
        tax_code: product.stripe_tax_code,
        active: true,
      });
    }
    const syncedVariants = [];
    for (const variant of paidVariants) {
      const price = await stripe.prices.create(
        {
          product: stripeProductId,
          unit_amount: variant.price_cents,
          currency: "usd",
          tax_behavior: "exclusive",
          nickname: variant.label || undefined,
          metadata: { egh_product_id: product.id, egh_variant_id: variant.id },
        },
        {
          idempotencyKey: `price-${variant.id}-usd-${variant.price_cents}`,
        },
      );
      const { data: updated, error } = await admin
        .from("product_variants")
        .update({ stripe_price_id: price.id })
        .eq("id", variant.id)
        .select("*")
        .single();
      if (error) throw error;
      syncedVariants.push(updated);
    }
    const { error: productError } = await admin
      .from("products")
      .update({ stripe_product_id: stripeProductId })
      .eq("id", product.id);
    if (productError) throw productError;
    await audit(
      admin,
      user.id,
      "product.stripe_synced",
      "products",
      product.id,
      { stripeProductId, variantIds: syncedVariants.map((v) => v.id) },
    );
    return json(req, { stripeProductId, variants: syncedVariants });
  } catch (error) {
    return functionError(req, error, "Stripe sync failed");
  }
});
