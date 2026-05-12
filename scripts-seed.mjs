import { createClient } from '@supabase/supabase-js';
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false }});

async function makeUser(email, password, meta, role) {
  const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: meta });
  if (error && !error.message.includes('already')) throw error;
  let uid = data?.user?.id;
  if (!uid) {
    const { data: list } = await sb.auth.admin.listUsers();
    uid = list.users.find(u => u.email === email)?.id;
  }
  await sb.from('profiles').update({ verification_status: 'approved', is_verified: true }).eq('user_id', uid);
  if (role === 'corporation') {
    await sb.from('user_roles').upsert({ user_id: uid, role: 'corporation' }, { onConflict: 'user_id,role' });
  }
  return uid;
}

const client = await makeUser('demo-client@buildforceprime.com', 'Demo1234!', { full_name: 'יזם דמו', phone: '050-0000001', company_name: 'יזמות דמו', city: 'תל אביב', role: 'contractor' }, 'contractor');
const corp1 = await makeUser('demo-corp1@buildforceprime.com', 'Demo1234!', { full_name: 'תאגיד אלפא', phone: '050-0000002', company_name: 'אלפא כוח אדם', city: 'תל אביב', business_id: '111111111', business_name: 'אלפא בע"מ', role: 'corporation' }, 'corporation');
const corp2 = await makeUser('demo-corp2@buildforceprime.com', 'Demo1234!', { full_name: 'תאגיד מובילים', phone: '050-0000003', company_name: 'מובילים גלובל', city: 'חיפה', business_id: '222222222', business_name: 'מובילים בע"מ', role: 'corporation' }, 'corporation');
const corp3 = await makeUser('demo-corp3@buildforceprime.com', 'Demo1234!', { full_name: 'תאגיד טופ', phone: '050-0000004', company_name: 'טופ ביצוע', city: 'ירושלים', business_id: '333333333', business_name: 'טופ בע"מ', role: 'corporation' }, 'corporation');

console.log({ client, corp1, corp2, corp3 });

// Create a job request
const { data: req, error: rerr } = await sb.from('job_requests').insert({
  user_id: client, location: 'תל אביב - מגדל יוקרה רוטשילד', start_date: '01/06/2026', duration: '4 חודשים', commitment_months: '6', budget: '180-220 ₪/שעה',
  description: 'פרויקט מגדל יוקרה 38 קומות. דרושים פועלים מיומנים לעבודות שלד וגמר.', contact_name: 'יזם דמו', contact_phone: '050-0000001'
}).select('id').single();
if (rerr) throw rerr;
await sb.from('job_request_items').insert([
  { request_id: req.id, role: 'טפסן', nationality: 'ישראלי', count: 8 },
  { request_id: req.id, role: 'ברזלן', nationality: 'אוקראיני', count: 6 },
  { request_id: req.id, role: 'רצף', nationality: 'תאילנדי', count: 4 },
]);
await sb.from('job_offers').insert([
  { request_id: req.id, corporation_id: corp1, price_per_hour: 185, available_workers: 18, start_date: '01/06/2026', response_time_hours: 24, warranty_days: 60, insurance: true, note: 'צוות מנוסה זמין מיידית, ביטוח מורחב.' },
  { request_id: req.id, corporation_id: corp2, price_per_hour: 192, available_workers: 18, start_date: '03/06/2026', response_time_hours: 12, warranty_days: 45, insurance: true, note: 'אחריות מורחבת ותגובה מהירה.' },
  { request_id: req.id, corporation_id: corp3, price_per_hour: 198, available_workers: 20, start_date: '01/06/2026', response_time_hours: 24, warranty_days: 90, insurance: true, note: 'אחריות 90 יום + מנהל עבודה צמוד.' },
]);
console.log('REQUEST_ID', req.id);
