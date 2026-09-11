import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export default function ContactForm() {
  const [status, setStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return setMessage("Contact service is not configured yet.");
    setStatus("sending");
    const { error } = await supabase.functions.invoke("submit-contact", {
      body: {
        name: String(form.get("name") || "").trim() || null,
        email: String(form.get("email") || "").trim(),
        reason: String(form.get("reason") || "").trim() || null,
        message: String(form.get("message") || "").trim(),
        website: String(form.get("website") || ""),
      },
    });
    if (error) {
      setStatus("error");
      setMessage("We could not send that message. Please try again.");
      return;
    }
    event.currentTarget.reset();
    setStatus("success");
    setMessage("Your message has been sent.");
  }

  return (
    <form className="form-stack" onSubmit={submit}>
      <label className="field">
        Name
        <input name="name" autoComplete="name" />
      </label>
      <label className="field">
        Email
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label className="field">
        Reason
        <select name="reason" defaultValue="general">
          <option value="general">General question</option>
          <option value="order">Order support</option>
          <option value="licensing">Church or licensing</option>
          <option value="media">Media inquiry</option>
        </select>
      </label>
      <label className="field">
        Message
        <textarea name="message" required minLength={10} />
      </label>
      <label className="contact-honeypot" aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <button
        className="btn btn-solid"
        type="submit"
        disabled={status === "sending"}
      >
        {status === "sending" ? "Sending…" : "Send message"}
      </button>
      {message && (
        <p
          className={status === "success" ? "form-success" : "form-error"}
          role="status"
        >
          {message}
        </p>
      )}
      <style>{`.contact-honeypot{position:absolute!important;left:-10000px!important;width:1px!important;height:1px!important;overflow:hidden!important}`}</style>
    </form>
  );
}
