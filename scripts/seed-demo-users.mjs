// Create clean single-role demo accounts for testing the makeover.
// Usage: node scripts/seed-demo-users.mjs
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

const USERS = [
  {
    email: "contractor.demo@buildforce.dev",
    role: "contractor",
    full_name: "דוד קבלן (דמו)",
    company_name: "בנייני דוד בע\"מ",
    business_name: "בנייני דוד בע\"מ",
    business_id: "512345678",
    city: "תל אביב",
    phone: "050-1112233",
  },
  {
    email: "corp.demo@buildforce.dev",
    role: "corporation",
    full_name: "תאגיד כוח אדם (דמו)",
    company_name: "כוח עבודה ישראל בע\"מ",
    business_name: "כוח עבודה ישראל בע\"מ",
    business_id: "513456789",
    city: "חיפה",
    phone: "052-4445566",
  },
];
const PASSWORD = "Demo2026!";

for (const u of USERS) {
  let uid;
  const { data: created, error } = await db.auth.admin.createUser({
    email: u.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: u.full_name, role: u.role },
  });
  if (error && !/already.*(registered|exists)/i.test(error.message)) throw error;
  if (created?.user) uid = created.user.id;
  else {
    const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
    uid = list.users.find((x) => x.email === u.email)?.id;
  }

  const profileData = {
    user_id: uid,
    full_name: u.full_name,
    company_name: u.company_name,
    business_name: u.business_name,
    business_id: u.business_id,
    city: u.city,
    phone: u.phone,
    verification_status: "approved",
    is_verified: true,
  };
  const { data: prof } = await db.from("profiles").select("id").eq("user_id", uid).maybeSingle();
  if (!prof) await db.from("profiles").insert(profileData);
  else await db.from("profiles").update(profileData).eq("user_id", uid);

  await db.from("user_roles").delete().eq("user_id", uid).neq("role", u.role);
  const { error: roleErr } = await db.from("user_roles").insert({ user_id: uid, role: u.role });
  if (roleErr && !/duplicate/i.test(roleErr.message)) throw roleErr;

  console.log(`✔ ${u.role}: ${u.email} / ${PASSWORD} (${uid})`);
}
console.log("Done.");
