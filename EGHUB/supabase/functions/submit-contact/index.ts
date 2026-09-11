import { adminClient, audit } from "../_shared/auth.ts";
import { escapeHtml, sendEmail } from "../_shared/email.ts";
import { handleOptions, json, readJson } from "../_shared/http.ts";

interface ContactRequest {
  name?: string | null;
  email: string;
  reason?: string | null;
  message: string;
  website?: string;
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  if (req.method !== "POST")
    return json(req, { error: "Method not allowed" }, 405);

  try {
    const body = await readJson<ContactRequest>(req);
    if (body.website) return json(req, { accepted: true });
    const email = body.email?.trim().toLowerCase();
    const message = body.message?.trim();
    const name = body.name?.trim() || null;
    const reason = body.reason?.trim() || "general";
    if (!email || !/^\S+@\S+\.\S+$/.test(email))
      return json(req, { error: "Enter a valid email address" }, 400);
    if (!message || message.length < 10 || message.length > 10_000)
      return json(
        req,
        { error: "Message must be between 10 and 10,000 characters" },
        400,
      );

    const admin = adminClient();
    const { data: contact, error } = await admin
      .from("contact_messages")
      .insert({ name, email, reason, message, status: "new" })
      .select("id")
      .single();
    if (error) throw error;

    const staffEmail = Deno.env.get("STAFF_ALERT_EMAIL");
    const deliveries = [
      sendEmail(
        email,
        "We received your Eternal Grace Hub message",
        `<h1>Thank you for reaching out</h1><p>We received your message about <strong>${escapeHtml(reason)}</strong>. Our team will reply as soon as possible.</p>`,
      ),
    ];
    if (staffEmail) {
      deliveries.push(
        sendEmail(
          staffEmail,
          `New Eternal Grace Hub contact: ${reason}`,
          `<h1>New contact request</h1><p><strong>From:</strong> ${escapeHtml(name || "Guest")} &lt;${escapeHtml(email)}&gt;</p><p><strong>Reason:</strong> ${escapeHtml(reason)}</p><p>${escapeHtml(message).replaceAll("\n", "<br>")}</p>`,
        ),
      );
    }
    const results = await Promise.allSettled(deliveries);
    if (results.some((result) => result.status === "rejected")) {
      await audit(
        admin,
        null,
        "contact.delivery_failed",
        "contact_messages",
        contact.id,
      );
    }
    await audit(
      admin,
      null,
      "contact.submitted",
      "contact_messages",
      contact.id,
    );
    return json(req, { accepted: true });
  } catch (error) {
    console.error(error);
    return json(req, { error: "Contact submission failed" }, 500);
  }
});
