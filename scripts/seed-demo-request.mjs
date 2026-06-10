// Seed an open demo request owned by contractor.demo@buildforce.dev
// Usage: node scripts/seed-demo-request.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
const contractor = list.users.find((u) => u.email === "contractor.demo@buildforce.dev");
if (!contractor) throw new Error("contractor.demo not found — run seed-demo-users.mjs first");

// Re-use an existing open demo request if present (idempotent-ish)
const { data: existing } = await db
  .from("job_requests")
  .select("id, status")
  .eq("user_id", contractor.id)
  .eq("status", "open")
  .limit(1);
if (existing?.length) {
  console.log(`open request already exists: ${existing[0].id}`);
  process.exit(0);
}

const start = new Date();
start.setDate(start.getDate() + 21);

const { data: req, error } = await db
  .from("job_requests")
  .insert({
    user_id: contractor.id,
    location: "תל אביב",
    start_date: start.toISOString().slice(0, 10),
    duration: "6 חודשים",
    commitment_months: 6,
    budget: "180-220",
    description: "פרויקט מגורים ברמת החייל — דרושים טפסנים וברזלנים לעבודה רציפה.",
    status: "open",
  })
  .select("id")
  .single();
if (error) throw error;

const { error: itemsErr } = await db.from("job_request_items").insert([
  { request_id: req.id, role: "טפסנים", nationality: "ללא העדפה", count: 6 },
  { request_id: req.id, role: "ברזלנים", nationality: "ללא העדפה", count: 4 },
]);
if (itemsErr) throw itemsErr;

const { error: contactErr } = await db.from("job_request_contacts").insert({
  request_id: req.id,
  contact_name: "דוד קבלן (דמו)",
  contact_phone: "050-1112233",
});
if (contactErr) throw contactErr;

console.log(`✔ seeded open request ${req.id} (10 workers, תל אביב)`);
