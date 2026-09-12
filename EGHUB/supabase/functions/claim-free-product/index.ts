import { z } from "npm:zod@4.5.4";
import {
  functionError,
  handleOptions,
  json,
  readJson,
} from "../_shared/http.ts";
import { requireUser } from "../_shared/auth.ts";
import { fulfillOrder } from "../_shared/orders.ts";

const bodySchema = z.object({ variantId: z.string().uuid() });

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  try {
    const { user, admin } = await requireUser(req);
    const { variantId } = await readJson(req, bodySchema);
    const { data: variant } = await admin
      .from("product_variants")
      .select("*,products!inner(title,status)")
      .eq("id", variantId)
      .eq("is_active", true)
      .eq("price_cents", 0)
      .eq("products.status", "published")
      .single();
    if (!variant) return json(req, { error: "Free product not found" }, 404);
    const { data: prior } = await admin
      .from("order_items")
      .select("order_id,orders!inner(user_id,status)")
      .eq("variant_id", variant.id)
      .eq("orders.user_id", user.id)
      .eq("orders.status", "paid")
      .limit(1)
      .maybeSingle();
    if (prior) return json(req, { orderId: prior.order_id, existing: true });
    const title = variant.label
      ? `${(variant as any).products.title} — ${variant.label}`
      : (variant as any).products.title;
    const order = await fulfillOrder(admin, {
      userId: user.id,
      email: user.email!,
      variants: [{ id: variant.id, title, price_cents: 0, quantity: 1 }],
      subtotalCents: 0,
      taxCents: 0,
      totalCents: 0,
    });
    return json(req, { orderId: order.id });
  } catch (error) {
    return functionError(req, error, "Claim failed");
  }
});
