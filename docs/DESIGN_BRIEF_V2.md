# Makeover Round 2 — STRUCTURAL Redesign Brief

The owner's feedback on round 1: **"looks the same, just light mode."** Round 2
changes the SHAPES and STRUCTURE, not colors. Tokens are done (flat solids,
small radii, hairline shadows, gray sidebar / white content). Your job is to
rebuild page anatomy so it reads like Linear/Notion — professional, dense,
typographic — instead of a recolored template.

## The patterns (use these exact shapes)

### 1. Page header (replaces ALL "hero greeting cards")
No more gradient-wash welcome cards. A page starts with plain typography:
```
<div class="border-b border-border pb-5 mb-6">
  <h2 class="text-xl font-semibold text-foreground">ערב טוב, דוד</h2>
  <p class="mt-1 text-sm text-muted-foreground">0 בקשות פתוחות · 5 הצעות שהתקבלו</p>
</div>
```
Title ≤ text-xl font-semibold (NEVER text-3xl/extrabold/black). Secondary line
muted. Actions sit on the same row (justify-between) when present.

### 2. Stat row (replaces icon-bubble KPI cards)
NO icon squares, NO per-card icons, NO colored card backgrounds. A single
bordered container divided into cells:
```
<div class="grid grid-cols-2 lg:grid-cols-4 rounded-lg border border-border divide-x divide-x-reverse divide-border">
  <div class="px-5 py-4">
    <div class="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">סה"כ בקשות</div>
    <div class="mt-1 text-2xl font-semibold tabular-nums" dir="ltr">4</div>
    <div class="mt-0.5 text-xs text-muted-foreground">כל הזמנים</div>  <!-- optional -->
  </div>
  ...
</div>
```
One stat MAY carry a status color on the number (e.g. green for "זכיות").

### 3. Data tables (replaces stacked "offer cards" / "user cards" on desktop)
Lists of comparable rows (offers, requests, pending corporations) become real
tables on ≥768px using `.premium-table-header` / `.premium-table-row`:
columns with uppercase 11px headers, rows h-12/h-14, numbers tabular-nums
dir="ltr", status as `.status-chip-*`, row hover, action button at row end.
On <768px degrade to compact stacked rows (not big cards).

### 4. Section titles
`<h3 class="text-sm font-semibold">` + optional count, with a thin border-b.
NO icon-in-gradient-square section headers (delete `.section-header-icon` usage).

### 5. Buttons & spacing
Primary CTA: default shadcn Button (now flat blue). Never add shadow-elegant /
bg-gradient-primary / rounded-xl overrides — strip them where you find them.
Vertical rhythm: space-y-6 between page sections; cards padding p-5.

### 6. Typography discipline
UI text 13-14px; numbers tabular-nums; ONE big number max per screen (the
savings ₪ stays hero-sized in orange — that's intentional and stays).

## Hard rules (carry over from round 1)
- Hebrew RTL; prices/phones/IDs in dir="ltr" spans.
- Status pills `.status-chip-*` are the ONLY pills; info tags are square.
- Orange = savings only. No fake content. No new dependencies.
- Don't touch src/styles.css, app-shell.tsx, coming-soon pages, other agents' files.
- `npx tsc --noEmit` must pass; screenshot 1440 + 375 via scripts/shot.mjs
  (server running on :8080, do NOT restart); LOOK at your screenshots and fix.

## Test logins
contractor.demo@buildforce.dev / corp.demo@buildforce.dev (Demo2026!) ·
admin@buildforce.dev (BuildForce-Admin-2026!).
Contractor has 4 requests incl. awarded ones; my-requests/95ba9e1b-943c-4a7e-9f02-82d2cf38f700 has 2 offers + award.
