// Provision the ONE dedicated admin account + enforce single-role accounts.
//
// Roles are exclusive in BuildForce: contractor XOR corporation XOR admin.
// Admin is never a signup option and never granted in-app — only here.
//
// Usage: node scripts/seed-admin.mjs
// Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

const ADMIN_EMAIL = "admin@buildforce.dev";
const ADMIN_PASSWORD = "BuildForce-Admin-2026!";

const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── 1. Create (or find) the dedicated admin user ──────────────────
let adminId;
{
  const { data: created, error } = await db.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "מנהל מערכת BuildForce" },
  });
  if (error && !/already.*(registered|exists)/i.test(error.message)) throw error;
  if (created?.user) {
    adminId = created.user.id;
    console.log(`✔ created admin user ${ADMIN_EMAIL} (${adminId})`);
  } else {
    const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
    adminId = list.users.find((u) => u.email === ADMIN_EMAIL)?.id;
    console.log(`✔ admin user already exists (${adminId})`);
  }
}

// Profile (the handle_new_user trigger may or may not have fired)
{
  const { data: prof } = await db.from("profiles").select("id").eq("user_id", adminId).maybeSingle();
  if (!prof) {
    const { error } = await db.from("profiles").insert({
      user_id: adminId,
      full_name: "מנהל מערכת BuildForce",
      verification_status: "approved",
      is_verified: true,
    });
    if (error) throw error;
    console.log("✔ created admin profile");
  } else {
    await db
      .from("profiles")
      .update({ verification_status: "approved", is_verified: true })
      .eq("user_id", adminId);
    console.log("✔ admin profile present (approved)");
  }
}

// Admin role — and ONLY admin
{
  await db.from("user_roles").delete().eq("user_id", adminId).neq("role", "admin");
  const { error } = await db.from("user_roles").insert({ user_id: adminId, role: "admin" });
  if (error && !/duplicate/i.test(error.message)) throw error;
  console.log("✔ admin role set (exclusive)");
}

// ── 2. Enforce single-role on every other account ──────────────────
// Priority when an account holds several roles: corporation > contractor.
// Admin role is stripped from any account that isn't the dedicated admin.
{
  const { data: rows, error } = await db.from("user_roles").select("user_id, role");
  if (error) throw error;
  const byUser = new Map();
  for (const r of rows) {
    if (!byUser.has(r.user_id)) byUser.set(r.user_id, []);
    byUser.get(r.user_id).push(r.role);
  }
  for (const [uid, roles] of byUser) {
    if (uid === adminId) continue;
    let keep;
    if (roles.includes("corporation")) keep = "corporation";
    else if (roles.includes("contractor")) keep = "contractor";
    else if (roles.includes("team_leader")) keep = "team_leader";
    else keep = roles[0];
    const drop = roles.filter((r) => r !== keep);
    if (roles.includes("admin")) console.log(`  ! stripping stray admin role from ${uid}`);
    if (drop.length) {
      const { error: delErr } = await db
        .from("user_roles")
        .delete()
        .eq("user_id", uid)
        .in("role", drop);
      if (delErr) throw delErr;
      console.log(`✔ ${uid}: kept '${keep}', removed [${drop.join(", ")}]`);
    }
  }
}

console.log("\nDone. Admin login:");
console.log(`  email:    ${ADMIN_EMAIL}`);
console.log(`  password: ${ADMIN_PASSWORD}`);
