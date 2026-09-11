import {
  functionError,
  handleOptions,
  json,
  readJson,
} from "../_shared/http.ts";
import { requireUser } from "../_shared/auth.ts";
import { fulfillOrder } from "../_shared/orders.ts";

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  try {
    const { user, admin } = await requireUser(req);
    const { productId } = await readJson<{ productId: string }>(req);
    const { data: product } = await admin
      .from("products")
      .select("*")
      .eq("id", productId)
      .eq("status", "published")
      .eq("price_cents", 0)
      .single();
    if (!product) return json(req, { error: "Free product not found" }, 404);
    const { data: prior } = await admin
      .from("order_items")
      .select("order_id,orders!inner(user_id,status)")
      .eq("product_id", product.id)
      .eq("orders.user_id", user.id)
      .eq("orders.status", "paid")
      .limit(1)
      .maybeSingle();
    if (prior) return json(req, { orderId: prior.order_id, existing: true });
    const order = await fulfillOrder(admin, {
      userId: user.id,
      email: user.email!,
      products: [
        { id: product.id, title: product.title, price_cents: 0, quantity: 1 },
      ],
      subtotalCents: 0,
      taxCents: 0,
      totalCents: 0,
    });
    return json(req, { orderId: order.id });
  } catch (error) {
    return functionError(req, error, "Claim failed");
  }
});
