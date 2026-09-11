import Stripe from "npm:stripe@22.6.1";
import {
  functionError,
  handleOptions,
  json,
  readJson,
} from "../_shared/http.ts";
import { audit, requireStaff } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  try {
    const { user, admin } = await requireStaff(req, ["owner", "admin"]);
    const { productId } = await readJson<{ productId: string }>(req);
    const { data: product } = await admin
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();
    if (!product) return json(req, { error: "Product not found" }, 404);
    if (product.price_cents <= 0)
      return json(req, { error: "Free products do not need Stripe" }, 400);
    if (!product.stripe_tax_code)
      return json(req, { error: "Set a Stripe tax code first" }, 409);
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
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
    const price = await stripe.prices.create(
      {
        product: stripeProductId,
        unit_amount: product.price_cents,
        currency: "usd",
        tax_behavior: "exclusive",
        metadata: { egh_product_id: product.id },
      },
      {
        idempotencyKey: `price-${product.id}-usd-${product.price_cents}`,
      },
    );
    const { data: updated, error } = await admin
      .from("products")
      .update({ stripe_product_id: stripeProductId, stripe_price_id: price.id })
      .eq("id", product.id)
      .select("*")
      .single();
    if (error) throw error;
    await audit(
      admin,
      user.id,
      "product.stripe_synced",
      "products",
      product.id,
      { stripeProductId, stripePriceId: price.id },
    );
    return json(req, { product: updated });
  } catch (error) {
    return functionError(req, error, "Stripe sync failed");
  }
});
