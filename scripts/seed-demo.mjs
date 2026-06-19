// Seed a complete demo environment — one user per app_role, plus a fully
// completed flow (request → offer → award → project → members → workers →
// attendance). Re-run safe (idempotent on email / passport / unique keys).
//
// Phone-OTP actors (team_leader / site_manager / operations_manager) are
// created as ordinary email+password accounts with a synthetic email
// (`tl-0500000001@demo.test` etc.) so they can sign in WITHOUT Twilio.
// The login UI mocks OTP "123456" for the three demo phones — see
// src/routes/login.tsx -> DEMO_PHONES.
//
// Usage (from this sandbox / any env with the service role key):
//   node scripts/seed-demo.mjs

import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}

const db = createClient(URL, KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_TAG = "DEMO-SEED";
const PASSWORD = "Test123456";

// 6 demo accounts. Phone roles use a synthetic email so we can sign them in
// with email+password from the mocked-OTP form.
const ACCOUNTS = [
  {
    key: "admin",
    email: "admin@demo.test",
    role: "admin",
    full_name: "מנהל מערכת",
    phone: null,
    extras: {},
  },
  {
    key: "corporation",
    email: "corp@demo.test",
    role: "corporation",
    full_name: "תאגיד דמו",
    phone: "050-7000001",
    extras: {
      company_name: 'כוח אדם דמו בע"מ',
      business_name: 'כוח אדם דמו בע"מ',
      business_id: "513000001",
      city: "חיפה",
    },
  },
  {
    key: "contractor",
    email: "builder@demo.test",
    role: "contractor",
    full_name: "קבלן דמו",
    phone: "050-7000002",
    extras: {
      company_name: 'בנייני דמו בע"מ',
      business_name: 'בנייני דמו בע"מ',
      business_id: "513000002",
      city: "תל אביב",
      contractor_license_number: "DEMO-100",
      contractor_classification: 'ק/100 ראשי',
    },
  },
  {
    key: "team_leader",
    email: "tl-0500000001@demo.test",
    role: "team_leader",
    full_name: "מתאם",
    phone: "0500000001",
    extras: {},
  },
  {
    key: "site_manager",
    email: "fm-0500000002@demo.test",
    role: "site_manager",
    full_name: "מנהל אתר",
    phone: "0500000002",
    extras: {},
  },
  {
    key: "operations_manager",
    email: "om-0500000003@demo.test",
    role: "operations_manager",
    full_name: "מנהל תפעול",
    phone: "0500000003",
    extras: {},
  },
];

async function findUserIdByEmail(email) {
  // Auth admin listUsers paginates; one page is enough for a seeded project.
  let page = 1;
  while (page < 20) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const u = data.users.find((x) => x.email?.toLowerCase() === email.toLowerCase());
    if (u) return u.id;
    if (data.users.length < 200) return null;
    page++;
  }
  return null;
}

async function ensureUser(acc) {
  let uid = await findUserIdByEmail(acc.email);
  if (!uid) {
    const { data, error } = await db.auth.admin.createUser({
      email: acc.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: acc.full_name, role: acc.role, demo: true },
    });
    if (error) throw error;
    uid = data.user.id;
    console.log(`✔ created auth user ${acc.email}`);
  } else {
    // Reset password so re-running the seed always restores the known login.
    await db.auth.admin.updateUserById(uid, { password: PASSWORD, email_confirm: true });
    console.log(`• auth user ${acc.email} present`);
  }

  // profile (upsert)
  const profile = {
    user_id: uid,
    full_name: acc.full_name,
    phone: acc.phone,
    email: acc.email,
    verification_status: "approved",
    is_verified: true,
    admin_notes: DEMO_TAG,
    ...acc.extras,
  };
  const { data: prof } = await db.from("profiles").select("id").eq("user_id", uid).maybeSingle();
  if (!prof) {
    const { error } = await db.from("profiles").insert(profile);
    if (error) throw error;
  } else {
    const { error } = await db.from("profiles").update(profile).eq("user_id", uid);
    if (error) throw error;
  }

  // single role: clear any others, set the one we want
  await db.from("user_roles").delete().eq("user_id", uid).neq("role", acc.role);
  const { error: rerr } = await db
    .from("user_roles")
    .insert({ user_id: uid, role: acc.role });
  if (rerr && !/duplicate/i.test(rerr.message)) throw rerr;

  return uid;
}

const ids = {};
for (const acc of ACCOUNTS) {
  ids[acc.key] = await ensureUser(acc);
}
console.log("\nIDs:", ids);

// ── Job request (contractor) ──────────────────────────────────────
let { data: req } = await db
  .from("job_requests")
  .select("id, status")
  .eq("user_id", ids.contractor)
  .eq("description", `${DEMO_TAG}: פרויקט דמו ברמת החייל`)
  .maybeSingle();

if (!req) {
  const start = new Date();
  start.setDate(start.getDate() + 14);
  const { data, error } = await db
    .from("job_requests")
    .insert({
      user_id: ids.contractor,
      location: "תל אביב",
      start_date: start.toISOString().slice(0, 10),
      duration: "6 חודשים",
      commitment_months: "6",
      budget: "180-220",
      description: `${DEMO_TAG}: פרויקט דמו ברמת החייל`,
      status: "open",
    })
    .select("id, status")
    .single();
  if (error) throw error;
  req = data;
  await db.from("job_request_items").insert([
    { request_id: req.id, role: "טפסנים", nationality: "ללא העדפה", count: 6 },
    { request_id: req.id, role: "ברזלנים", nationality: "ללא העדפה", count: 4 },
  ]);
  await db.from("job_request_contacts").insert({
    request_id: req.id,
    contact_name: "קבלן דמו",
    contact_phone: "050-7000002",
  });
  console.log(`✔ created job_request ${req.id}`);
} else {
  console.log(`• job_request present ${req.id} (status=${req.status})`);
}

// ── Offer (corporation) ───────────────────────────────────────────
let { data: offer } = await db
  .from("job_offers")
  .select("id, status")
  .eq("request_id", req.id)
  .eq("corporation_id", ids.corporation)
  .maybeSingle();

if (!offer) {
  const { data, error } = await db
    .from("job_offers")
    .insert({
      request_id: req.id,
      corporation_id: ids.corporation,
      price_per_hour: 195,
      available_workers: 10,
      start_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      response_time_hours: 24,
      warranty_days: 30,
      insurance: true,
      note: `${DEMO_TAG}: הצעת דמו`,
      status: "submitted",
    })
    .select("id, status")
    .single();
  if (error) throw error;
  offer = data;
  console.log(`✔ created job_offer ${offer.id}`);
} else {
  console.log(`• job_offer present ${offer.id} (status=${offer.status})`);
}

// ── Award ─────────────────────────────────────────────────────────
let { data: award } = await db
  .from("job_awards")
  .select("id")
  .eq("request_id", req.id)
  .maybeSingle();

if (!award) {
  // The request status must be 'open' for the award trigger; if a previous
  // partial seed left it 'awarded' without an award row, normalise it.
  await db.from("job_requests").update({ status: "open" }).eq("id", req.id);
  await db.from("job_offers").update({ status: "submitted" }).eq("id", offer.id);
  const { data, error } = await db
    .from("job_awards")
    .insert({
      request_id: req.id,
      offer_id: offer.id,
      corporation_id: ids.corporation,
      awarded_by: ids.contractor,
    })
    .select("id")
    .single();
  if (error) throw error;
  award = data;
  console.log(`✔ created job_award ${award.id}`);
} else {
  console.log(`• job_award present ${award.id}`);
}

// ── Project ───────────────────────────────────────────────────────
let { data: project } = await db
  .from("projects")
  .select("id")
  .eq("source_award_id", award.id)
  .maybeSingle();

if (!project) {
  const { data, error } = await db
    .from("projects")
    .insert({
      name: `${DEMO_TAG}: פרויקט רמת החייל`,
      address: "רמת החייל, תל אביב",
      contractor_id: ids.contractor,
      corporation_id: ids.corporation,
      source_request_id: req.id,
      source_award_id: award.id,
      start_date: new Date().toISOString().slice(0, 10),
      status: "active",
      expected_workers: 10,
      hourly_rate: 195,
      site_manager_name: "מנהל אתר",
      site_manager_phone: "0500000002",
    })
    .select("id")
    .single();
  if (error) throw error;
  project = data;
  console.log(`✔ created project ${project.id}`);
} else {
  console.log(`• project present ${project.id}`);
}

// ── Project members ───────────────────────────────────────────────
const memberRows = [
  { role: "contractor", uid: ids.contractor, name: "קבלן דמו", phone: "050-7000002" },
  { role: "corporation", uid: ids.corporation, name: "תאגיד דמו", phone: "050-7000001" },
  { role: "team_leader", uid: ids.team_leader, name: "מתאם", phone: "0500000001" },
  { role: "site_manager", uid: ids.site_manager, name: "מנהל אתר", phone: "0500000002" },
  { role: "operations_manager", uid: ids.operations_manager, name: "מנהל תפעול", phone: "0500000003" },
];
for (const m of memberRows) {
  const { error } = await db.from("project_members").upsert(
    {
      project_id: project.id,
      user_id: m.uid,
      role: m.role,
      name: m.name,
      phone: m.phone,
    },
    { onConflict: "project_id,user_id,role" },
  );
  if (error) throw error;
}
console.log(`✔ project_members upserted (${memberRows.length})`);

// ── Project team (led by team_leader) ─────────────────────────────
let { data: team } = await db
  .from("project_teams")
  .select("id")
  .eq("project_id", project.id)
  .eq("team_leader_id", ids.team_leader)
  .maybeSingle();
if (!team) {
  const { data, error } = await db
    .from("project_teams")
    .insert({
      project_id: project.id,
      name: "צוות דמו",
      team_leader_id: ids.team_leader,
      team_leader_name: "מתאם",
      team_leader_phone: "0500000001",
      expected_workers: 10,
      hourly_rate: 195,
    })
    .select("id")
    .single();
  if (error) throw error;
  team = data;
  console.log(`✔ created project_team ${team.id}`);
} else {
  console.log(`• project_team present ${team.id}`);
}

// ── Workers (idempotent on (project_id, passport_number)) ─────────
const workers = [
  { first_name: "Ahmed",  last_name: "Khaled",  passport_number: "DEMO-W-001", nationality: "Palestinian" },
  { first_name: "Yusuf",  last_name: "Hassan",  passport_number: "DEMO-W-002", nationality: "Palestinian" },
  { first_name: "Tariq",  last_name: "Saleh",   passport_number: "DEMO-W-003", nationality: "Palestinian" },
  { first_name: "Omar",   last_name: "Nasser",  passport_number: "DEMO-W-004", nationality: "Palestinian" },
  { first_name: "Karim",  last_name: "Abdo",    passport_number: "DEMO-W-005", nationality: "Palestinian" },
];
const { error: wErr } = await db.from("project_workers").upsert(
  workers.map((w) => ({
    ...w,
    project_id: project.id,
    corporation_id: ids.corporation,
    status: "active",
    added_by_role: "corporation",
  })),
  { onConflict: "project_id,passport_number" },
);
if (wErr) throw wErr;
console.log(`✔ project_workers upserted (${workers.length})`);

// ── Attendance: yesterday (approved) + today (pending) ────────────
function dayIso(offsetDays, hours, minutes = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

const attRows = [
  {
    work_date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
    workers_expected: 10,
    workers_actual: 9,
    start_time: dayIso(-1, 7, 0),
    end_time: dayIso(-1, 16, 0),
    status: "approved",
    hourly_rate: 195,
  },
  {
    work_date: new Date().toISOString().slice(0, 10),
    workers_expected: 10,
    workers_actual: 8,
    start_time: dayIso(0, 7, 5),
    end_time: null,
    status: "pending",
    hourly_rate: 195,
  },
];

for (const r of attRows) {
  const { data: existing } = await db
    .from("attendance_records")
    .select("id")
    .eq("project_id", project.id)
    .eq("team_id", team.id)
    .eq("work_date", r.work_date)
    .maybeSingle();
  if (existing) {
    console.log(`• attendance ${r.work_date} present`);
    continue;
  }
  const { error } = await db.from("attendance_records").insert({
    project_id: project.id,
    team_id: team.id,
    team_leader_id: ids.team_leader,
    contractor_id: ids.contractor,
    corporation_id: ids.corporation,
    ...r,
  });
  if (error) throw error;
  console.log(`✔ attendance ${r.work_date} (${r.status})`);
}

console.log("\n✓ Demo seed complete. Logins:");
for (const a of ACCOUNTS) {
  if (a.phone && a.role !== "corporation" && a.role !== "contractor") {
    console.log(`  ${a.role.padEnd(20)} phone ${a.phone}  →  OTP 123456 (mocked)`);
  } else {
    console.log(`  ${a.role.padEnd(20)} ${a.email}  /  ${PASSWORD}`);
  }
}