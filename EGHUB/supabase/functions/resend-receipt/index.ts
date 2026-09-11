import {
  functionError,
  handleOptions,
  json,
  readJson,
} from "../_shared/http.ts";
import { audit, requireStaff } from "../_shared/auth.ts";
import { receiptHtml, sendEmail } from "../_shared/email.ts";

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  try {
    const { user, admin } = await requireStaff(req, [
      "owner",
      "admin",
      "support",
    ]);
    const { orderId } = await readJson<{ orderId: string }>(req);
    const { data: order } = await admin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();
    if (!order) return json(req, { error: "Order not found" }, 404);
    const site = Deno.env.get("SITE_URL") || "http://localhost:4321";
    await sendEmail(
      order.email,
      `Your Eternal Grace Hub order ${order.order_number}`,
      receiptHtml(order, `${site}/account/downloads`),
    );
    await audit(admin, user.id, "receipt.resent", "orders", order.id);
    return json(req, { sent: true });
  } catch (error) {
    return functionError(req, error, "Email failed");
  }
});
