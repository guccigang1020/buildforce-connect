# BuildForce Makeover — Page-Pass Brief (for subagents)

## Mission
Convert every page to the new **light** design system — "calm, statusful, fast":
**Notion** (whitespace, content-first, hairline borders) + **Monday** (status
color pills as the information layer) + **Linear** (speed, crisp 1px borders, one
restrained blue accent). The previous design was DARK; the new `:root` tokens in
`src/styles.css` are LIGHT. Your job is the per-page residue: hardcoded dark
colors, fake content, clutter, missing validations, broken/unclear flows.

## Tokens & classes already available (USE these — do not invent colors)
- Colors via CSS vars: `bg-background`, `bg-card`, `text-foreground`,
  `text-muted-foreground`, `border-border`, `bg-primary text-primary-foreground`
  (deep blue #1D4ED8), `bg-muted`, `text-destructive`.
- Status pills: `.status-chip-live` (green/open), `.status-chip-pending` (amber),
  `.status-chip-approved` (green), `.status-chip-rejected` (red),
  `.status-chip-disputed`, `.status-chip-muted` (gray — closed/expired/soon).
- **Savings (the ONLY orange allowed in the app):** `.text-savings`,
  `.savings-badge`, `.bg-savings-soft`. Use for the savings ₪ hero number and
  "זול ב-X ₪/שעה" badges. NOTHING else may be orange.
- Cards: `.enterprise-card`, `.kpi-card`(+`-primary/-success/-warning`),
  `.kpi-icon-*`; `.empty-state` + `.empty-state-icon`; `.info-chip`;
  `.premium-table-header/-row`; `.pill-tabs/.pill-tab/.pill-tab-active`;
  `.skeleton*`; `.trend-up/-down/-neutral`; `.coming-soon-card`; `.role-badge`.
- Font is Rubik (loaded globally). RTL everywhere; prices/phones/IDs need
  `dir="ltr"` spans.

## Hard rules
1. **No hardcoded dark-theme colors.** Hunt and replace any inline
   `oklch(0.0x–0.3x …)` backgrounds, `bg-white/5`, `border-white/8`,
   `text-white`, glass-dark panels, etc. Exception: an intentional **dark
   marketing panel** (auth aside, landing hero) is allowed ONLY if it uses
   `bg-gradient-dark` and stays readable; prefer converting to light.
2. **No orange except savings.** No fake urgency colors.
3. **No fake content.** Remove invented stats ("47 תאגידים מאומתים",
   "12,500 עובדים", fake testimonials/logos). Real value props only.
4. **Question every element**: if a button/field/section serves no real flow,
   remove it. If a feature is unfinished, give it the polished coming-soon
   treatment: `.coming-soon-card` + `.status-chip-muted` "בקרוב" + one Hebrew
   sentence explaining what it WILL do + no dead buttons.
5. **Validations**: every form field gets inline Hebrew validation (zod +
   react-hook-form pattern already used in signup.tsx). No silent failures —
   server errors must surface as Hebrew toast (sonner) or inline error.
6. **Route guards**: any protected route you own must redirect
   `!loading && !session → /login` (pattern in dashboard.tsx). No empty shells.
7. **One primary CTA per screen.** Tap targets ≥44px on mobile. Keep changes
   RTL-correct.
8. Do NOT touch `src/styles.css`, other agents' files, business-logic server
   functions (except surfacing their errors), or add dependencies.

## Verification protocol (mandatory before you finish)
1. `npx tsc --noEmit` → must be 0 errors.
2. Dev server already runs on http://localhost:8080.
3. Screenshot your pages: `node scripts/shot.mjs <path> <name> 1440` and
   `node scripts/shot.mjs <path> <name>-mobile 375`
   (add `--login <email> <password>` for protected pages). Files land in
   /tmp/bf-shots/. LOOK at them (Read tool) and fix what looks wrong.
4. Report: what you changed, what you removed and why, console errors seen,
   anything broken you couldn't fix (be honest).

## Test logins (dev DB)
- Contractor: contractor.demo@buildforce.dev / Demo2026!
- Corporation: corp.demo@buildforce.dev / Demo2026!
- Admin: admin@buildforce.dev / BuildForce-Admin-2026!
(Older data accounts: idor980@gmail.com contractor with real requests;
demo.corp.beta@gmail.com / Demo2026! corporation with a submitted offer.)

## Role purity (already enforced — don't break it)
contractor / corporation / admin are exclusive. Admin sees only admin nav.
Never add UI that grants/mixes roles.
