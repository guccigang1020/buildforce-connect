# Business Plan Alignment Review — BuildForce

> Source of truth: `BuildForce Business Plan.docx` (Hebrew, investor document, 2026).
> This review treats the plan as primary and challenges the current build against it.
> Focus: what best communicates the vision for the **upcoming demo**.

---

## 1. Product Vision (from the plan)

**What it is:** A digital marketplace that *regulates* Israel's construction-labor
market — today run through manual, opaque brokering.

**Core value proposition:** Turn opaque brokering into a **transparent reverse
auction (מכרז הפוך)**. Contractors post a labor request; manpower **corporations
compete by lowering price-per-hour**. Bids are **sealed and anonymous** (masked
IDs like `BF-3947`) until award — which prevents platform circumvention. After
award: a project opens, a crew is formed, and **attendance is verified on-site
with GPS + photo**, turning every worked hour into evidence and producing a
**transparent daily account** for both sides.

**The #1 differentiator — the Savings Engine (מנוע החיסכון):** the plan calls this
"the heart of the value." It translates the reverse auction into a single number
the contractor sees: how much they save vs. the **most expensive** offer —
**per-offer** ("this offer is 6₪/hr cheaper than the highest") **and monthly**
(e.g., 3,000 hrs × 6₪ = **18,000₪/month saved**).

**Business model:** 2–3₪ commission per work-hour through the platform +
corporation subscription. First 6 months free to reduce friction and build volume.

**Competitive moat:** anonymity (anti-circumvention) · real GPS+photo attendance
data · two-sided network effect · field relationships (incl. the Chinese
construction community in Israel).

---

## 2. User Types (from the plan)

| Role | Plan definition | In the build |
|---|---|---|
| **Contractor (קבלן)** | Posts requests, picks winner, sees savings, gets monthly invoice | ✅ exists (signup, dashboard, new-request, award) |
| **Corporation (תאגיד)** | Supplies workers; **must be admin-approved before bidding**; submits price + delivery days | ✅ exists (`verification_status`, corp dashboard, offer form) |
| **Team Leader (ראש צוות)** | Daily check-in/out with GPS + photo | ✅ exists (`team-leader.tsx`, `getGps`, `watermarkImage`) |
| **Admin** | Approves corporations; oversight | ✅ exists (`admin.tsx` pending/approved/rejected tabs) |

All four roles from the plan are present in the schema/UI. Note: signup only
self-selects contractor/corporation; team-leader/admin are provisioned
separately — consistent with the plan (corp approval is admin-gated).

---

## 3. Core User Journeys — plan vs. build

### J1. Tender → Offers → Award (the marketplace core) — **DEMO PRIORITY: CRITICAL**
- **Plan:** contractor posts (worker type, qty, site, date, hours) → approved corps
  notified → each submits sealed price/hr + delivery days → contractor sees them
  sorted by price then delivery, **masked names** → picks winner → **contact details
  revealed only now**.
- **Current:** Works end-to-end (verified live this session): post wizard → corp
  bids → contractor sees anonymized analysis → awards. Sealed/masked bidding works.
- **Problems:**
  1. 🔴 **Winner identity never revealed after award** — directly contradicts the
     plan ("contact details revealed only now"). Root cause: `getJobRequestWithOffers`
     never returns the winning corp's profile/contact. The award completes but the
     contractor still sees "תאגיד אנונימי".
  2. 🟠 The competitive view shows **min/avg/max**, not the plan's **savings framing**
     (see J2).
- **Recommended:** fix winner reveal (server fn returns winner name + contact once
  `awarded`); re-frame the analysis around savings.

### J2. The Savings Engine (the differentiator) — **DEMO PRIORITY: CRITICAL**
- **Plan:** the hero metric. Per-offer savings vs. highest, plus a monthly ₪ total.
  "The tool that differentiates BuildForce from a simple meeting place."
- **Current:** ❌ **Exists only as dead code.** `auction-panel.tsx` implements the
  full engine (opening→lowest drop, "חיסכון חודשי", `BF-XXXX` masking) but **is not
  rendered on any page.** The live request page shows generic "ניתוח תחרותי"
  (min/avg/max, "% of max") — close, but missing the signature ₪-saved number.
- **Problems:** the plan's #1 differentiator is invisible to a demo viewer.
- **Recommended (highest-leverage demo change):**
  1. Per-offer: show "**ההצעה הזו זולה ב-X₪/שעה מההצעה היקרה ביותר**" on each bid.
  2. Hero number on the request page: **estimated monthly savings** = (highest −
     chosen) × workers × hours/month.
  3. Surface a **monthly savings summary** on the contractor dashboard / daily account.
  Either revive `auction-panel.tsx` into the real flow or port its math into
  `my-requests.$id.tsx`.

### J3. Attendance (GPS + photo) — **DEMO PRIORITY: HIGH**
- **Plan:** team leader daily check-in/out with GPS + photo; "every hour becomes
  documented evidence"; feeds the hours calculation.
- **Current:** ✅ Real implementation exists (`team-leader.tsx` captures photo +
  GPS lat/lng, watermarks the image, submits). Not yet verified end-to-end this
  session.
- **Recommended:** verify the full capture→approve→hours path works for the demo;
  ensure the GPS+photo "evidence" is visibly shown (it's a moat point investors
  will want to see).

### J4. Daily transparent account → monthly invoice — **DEMO PRIORITY: HIGH**
- **Plan:** both sides see daily what's owed; month-end invoice is pre-built and
  attendance-backed; "no end-of-month disputes."
- **Current:** routes exist (`contractor.accounts`, `corporation.accounts`,
  `daily_approved_accounts` table). Depth/wiring not yet verified.
- **Recommended:** confirm the daily account aggregates approved attendance × rate,
  and shows a month-end total. This is half the value prop (the "no disputes" half).

### J5. Registration + corp approval — **DEMO PRIORITY: MEDIUM**
- **Plan:** open account, pick role; **corp needs admin approval before bidding**.
- **Current:** ✅ signup + admin approval UI both exist. This session exposed that
  approval gating is real (an unapproved corp can't bid).
- **Problems:** ⚠️ role assignment glitch found — `ensure_user_bootstrap` re-added
  a default `contractor` role to users, so accounts ended up with both roles.
- **Recommended:** make role assignment respect the chosen role; show a clear
  "pending approval" state for corps in the demo.

---

## 4. Feature Alignment Review (keep / simplify / cut for the demo)

| Area | Supports plan? | Demo-critical? | Action |
|---|---|---|---|
| Reverse-auction post→bid→award | ✅ core | ✅ | **Keep & polish** (fix winner reveal) |
| **Savings Engine** | ✅ **the differentiator** | ✅ | **Wire it into the live flow** (currently dead code) |
| Sealed/anonymous bids + `BF-XXXX` | ✅ moat | ✅ | Keep; ensure masking consistent everywhere |
| Attendance GPS + photo | ✅ moat | ✅ | Verify & make the "evidence" visible |
| Daily account → monthly invoice | ✅ core value | ✅ | Verify aggregation works |
| Admin corp approval | ✅ flow gate | 🟡 | Keep; show pending state |
| Landing page (currently mock `CORPORATIONS`) | ⚠️ marketing | 🟡 | Make it communicate the value prop; replace mock with believable demo content |
| Real-time chat, push/WhatsApp, ratings, full mobile | Phase 3 in plan | ❌ | **Don't polish for this demo** |
| `corporation_workforce` inventory | secondary | ❌ | Currently 404s on prod DB — low demo value, defer |

---

## 5. Demo narrative the plan implies (what to rehearse)

The plan's story, in order — build the demo to hit these beats:
1. **The problem** — opaque brokering, inflated prices, end-of-month disputes.
2. **Contractor posts a request** (fast, clear).
3. **Corporations bid; price drops** — show competition live.
4. **The Savings Engine** — "you're saving ₪X/month vs. the highest offer." *(This
   is the money moment — currently missing.)*
5. **Award → identity revealed** — sealed→revealed transition. *(Currently broken.)*
6. **On-site attendance with GPS + photo** — "every hour is evidence."
7. **Daily account → ready monthly invoice** — "no disputes."
8. **Revenue** — 2–3₪/hour × volume.

Beats **4 and 5 are the weakest in the current build** and are exactly the
emotional core of the pitch. They should be the top priority.

---

## 6. Prioritized recommendations for the demo

**P0 — must fix (they ARE the pitch):**
1. **Surface the Savings Engine** in the live contractor flow (per-offer + monthly ₪).
2. **Fix winner-identity reveal** after award (server fn returns winner + contact).

**P1 — verify/solidify core value:**
3. Verify attendance GPS+photo end-to-end and make the evidence visible.
4. Verify daily account → monthly invoice aggregation.
5. Fix role assignment so corp/contractor roles are clean (no auto-dual-role).

**P2 — supporting polish:**
6. Landing page communicates the value prop (replace mock data / label it as demo).
7. Consistent `BF-XXXX` masking across all surfaces; clean tender IDs (not raw UUIDs).

**Explicitly NOT for this demo (Phase 3 per plan):** real-time chat, push/WhatsApp,
ratings system, full mobile responsiveness, `corporation_workforce` inventory.

---

## 7. Biggest single insight

The build has **all the right pieces**, but its **#1 differentiator (the Savings
Engine) is dead code**, and the **emotional climax of the flow (award → identity
reveal) is broken**. Fixing just those two makes the live product finally *feel*
like the vision the plan sells — which is exactly the stated goal. Everything else
is already closer to the plan than expected.
