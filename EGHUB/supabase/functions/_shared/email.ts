export async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM_EMAIL");
  if (!apiKey || !from) {
    console.warn("Email skipped: Resend is not configured", { to, subject });
    return;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!response.ok)
    throw new Error(
      `Email delivery failed: ${response.status} ${await response.text()}`,
    );
}

export function receiptHtml(
  order: { order_number: string; total_cents: number; status: string },
  accountUrl: string,
) {
  return `<h1>Thank you for your order</h1><p>Order <strong>${escapeHtml(order.order_number)}</strong> is ${escapeHtml(order.status)}.</p><p>Total: $${(order.total_cents / 100).toFixed(2)} USD</p><p><a href="${accountUrl}">Open your Eternal Grace Hub library</a></p>`;
}

export function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[char]!,
  );
}
