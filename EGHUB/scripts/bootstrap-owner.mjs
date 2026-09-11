import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const email = process.env.INITIAL_OWNER_EMAIL?.trim().toLowerCase();
if (!url || !secret || !email) {
  throw new Error(
    "Set SUPABASE_URL, SUPABASE_SECRET_KEY, and INITIAL_OWNER_EMAIL.",
  );
}
const admin = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data: profiles, error } = await admin
  .from("profiles")
  .select("id,email,role")
  .eq("email", email);
if (error) throw error;
if (profiles.length !== 1)
  throw new Error(
    `Expected one existing verified profile for ${email}; found ${profiles.length}.`,
  );
const { error: updateError } = await admin
  .from("profiles")
  .update({ role: "owner", status: "active" })
  .eq("id", profiles[0].id);
if (updateError) throw updateError;
await admin.from("audit_log").insert({
  actor_id: profiles[0].id,
  action: "owner.bootstrapped",
  entity_type: "profiles",
  entity_id: profiles[0].id,
  metadata: { source: "one-time-script" },
});
console.log(
  `Owner role assigned to ${email}. Remove INITIAL_OWNER_EMAIL after verification.`,
);
