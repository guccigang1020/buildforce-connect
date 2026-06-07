import type { Corporation, Offer, WorkforceRequest } from "./mock-data";
import { PLATFORM_FEE_PER_HOUR, totalCorporationPays } from "./commission-config";

type Row = Offer & { corp: Corporation; score: number };

/**
 * Open a print-ready window with the comparison summary and trigger the
 * browser's print dialog. The user can pick "Save as PDF" — this is the
 * most reliable way to get a Hebrew-RTL PDF without bundling fonts.
 */
export function exportComparisonPdf(req: WorkforceRequest, rows: Row[]) {
  const win = window.open("", "_blank", "width=900,height=1000");
  if (!win) {
    alert("חלון הייצוא נחסם — אפשר חלונות קופצים ונסה שוב.");
    return;
  }

  const title = `BuildForce — סיכום השוואת הצעות #${req.id}`;
  const date = new Date().toLocaleDateString("he-IL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const itemsBlock =
    req.items && req.items.length > 0
      ? `<ul class="items">${req.items
          .map(
            (it) =>
              `<li><b>${it.count} ×</b> ${escapeHtml(it.role)} · <span class="nat">${escapeHtml(it.nationality)}</span></li>`,
          )
          .join("")}</ul>`
      : "";

  const tableRows = rows
    .map((r, i) => {
      const total = totalCorporationPays(r.pricePerHour);
      return `
        <tr${i === 0 ? ' class="best"' : ""}>
          <td class="rank">${i + 1}</td>
          <td><b>${escapeHtml(r.corp.name)}</b>${r.corp.verified ? ' <span class="vf">✓ מאומת</span>' : ""}<div class="sub">${escapeHtml(r.corp.regions)}</div></td>
          <td class="num"><b>${r.score}</b>/100</td>
          <td class="num">★ ${r.corp.rating}<div class="sub">(${r.corp.reviews})</div></td>
          <td class="num"><b>₪${r.pricePerHour}</b><div class="sub">+₪${PLATFORM_FEE_PER_HOUR} = ₪${total}</div></td>
          <td>${escapeHtml(r.startDate)}</td>
          <td class="num">${r.availableWorkers}/${req.count}</td>
          <td class="num">${r.responseTimeHours}ש׳</td>
          <td>${r.insurance ? "כן" : "לא"}</td>
          <td class="num">${r.warrantyDays} ימים</td>
        </tr>
      `;
    })
    .join("");

  const html = `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  @page { size: A4 landscape; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: "Heebo", "Arial Hebrew", Arial, sans-serif; color: #111; margin: 0; padding: 24px; background: #fff; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #2563eb; padding-bottom: 12px; }
  .brand { font-size: 22px; font-weight: 800; }
  .brand span { color: #2563eb; }
  .meta { font-size: 11px; color: #555; text-align: left; }
  h1 { font-size: 20px; margin: 16px 0 4px; }
  .info { font-size: 12px; color: #444; margin-bottom: 8px; }
  .info b { color: #111; }
  .items { display: flex; flex-wrap: wrap; gap: 6px; list-style: none; padding: 0; margin: 6px 0 14px; font-size: 11px; }
  .items li { background: #f3f4f6; padding: 4px 10px; border-radius: 6px; }
  .nat { color: #2563eb; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { padding: 8px 6px; border-bottom: 1px solid #e5e7eb; text-align: right; vertical-align: top; }
  th { background: #f9fafb; font-weight: 700; color: #374151; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
  td.num { white-space: nowrap; }
  td.rank { font-weight: 800; color: #2563eb; width: 28px; }
  tr.best { background: #eff6ff; }
  .sub { font-size: 9px; color: #6b7280; margin-top: 1px; }
  .vf { color: #2563eb; font-size: 10px; font-weight: 600; }
  .footer { margin-top: 18px; font-size: 10px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 10px; }
  .footer b { color: #111; }
  @media print { body { padding: 0; } .noprint { display: none; } }
  .actions { margin-top: 16px; text-align: center; }
  .actions button { background: #2563eb; color: #fff; border: 0; padding: 10px 20px; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 14px; font-family: inherit; }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">Build<span>Force</span></div>
    <div class="meta">סיכום הופק ב-${date}<br/>בקשה #${escapeHtml(req.id)}</div>
  </div>

  <h1>${req.count} ${escapeHtml(req.role)} · ${escapeHtml(req.location)}</h1>
  <div class="info">
    <b>התחלה:</b> ${escapeHtml(req.startDate)} &nbsp;·&nbsp;
    <b>משך:</b> ${escapeHtml(req.duration)}
    ${req.commitmentMonths ? ` &nbsp;·&nbsp; <b>התחייבות:</b> ${req.commitmentMonths} חודשים` : ""}
    ${req.budget ? ` &nbsp;·&nbsp; <b>תקציב:</b> ${escapeHtml(req.budget)}` : ""}
  </div>
  ${itemsBlock}

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>תאגיד</th>
        <th>ציון</th>
        <th>דירוג</th>
        <th>מחיר/שעה</th>
        <th>התחלה</th>
        <th>צוות</th>
        <th>תגובה</th>
        <th>ביטוח</th>
        <th>אחריות</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>

  <div class="footer">
    <b>מודל עמלה:</b> תעריף לקבלן + ₪${PLATFORM_FEE_PER_HOUR} עמלת פלטפורמה לשעת עובד · משולם ע״י התאגיד.<br/>
    <b>הסכמת אי-עקיפה:</b> כל ההצעות תקפות אך ורק דרך BuildForce. התקשרות ישירה לאחר חשיפת ספק מהווה הפרה.<br/>
    מסמך זה הופק אוטומטית מ-BuildForce — שוק כוח האדם החכם לענף הבנייה.
  </div>

  <div class="actions noprint">
    <button onclick="window.print()">🖨 הדפס / שמור כ-PDF</button>
  </div>

  <script>
    window.addEventListener("load", function () {
      setTimeout(function () { window.print(); }, 300);
    });
  </script>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
