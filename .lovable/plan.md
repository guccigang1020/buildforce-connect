# תשתית מכרזים מלאה — BuildForce

המערכת הקיימת של ההצעות בנויה כולה על **mock data**. הצעדים הבאים יחברו את כל זה למסד אמיתי, עם מיילים, סטטוסים, ובעלות נכונה.

## 1. סכמת מסד נתונים (migration אחת)

### טבלאות חדשות
- **`job_offers`** — הצעת תאגיד לבקשה
  - `request_id`, `corporation_id` (user_id של תאגיד), `price_per_hour`, `available_workers`, `start_date`, `response_time_hours`, `warranty_days`, `insurance` (bool), `note`
  - `status`: `submitted` | `withdrawn` | `awarded` | `rejected`
  - `created_at`, `updated_at`
  - UNIQUE(`request_id`, `corporation_id`) — הצעה אחת לכל תאגיד לכל בקשה
- **`job_awards`** — בחירת זוכה
  - `request_id` (UNIQUE), `offer_id`, `corporation_id`, `awarded_by` (user_id), `awarded_at`
- **`job_request_messages`** — צ'אט בקשה⇄תאגיד (אחד-לאחד)
  - `request_id`, `corporation_id`, `sender_id`, `body`, `created_at`

### עדכונים קיימים
- `job_requests.status`: `open` | `awarded` | `closed` | `cancelled` (מוגבל ב-CHECK)
- `job_requests.deadline_at` (timestamptz, nullable) — סגירה אוטומטית של מכרז (default: 48 שעות מ-`created_at`)

### RLS
| טבלה | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `job_offers` | בעל הבקשה + התאגיד שהגיש + admin | רק תאגיד מאומת על בקשה במצב `open` | התאגיד שהגיש (לפני זכייה) | לא |
| `job_awards` | בעל הבקשה + התאגיד הזוכה + admin | בעל הבקשה בלבד | לא | לא |
| `job_request_messages` | בעל הבקשה + התאגיד הספציפי + admin | אחד מהם | לא | לא |

### טריגרים
- כשנכנס שורה ב-`job_awards` → עדכן `job_requests.status='awarded'` והצעה זוכה ל-`awarded`, השאר ל-`rejected`.

## 2. Server Functions (`src/lib/`)

### `job-offers.functions.ts`
- `submitOffer({ requestId, pricePerHour, availableWorkers, startDate, responseTimeHours, warrantyDays, insurance, note })` — תאגיד מאומת מגיש; מייל לבעל הבקשה ("התקבלה הצעה חדשה").
- `withdrawOffer({ offerId })` — התאגיד מבטל לפני זכייה.
- `listOffersForRequest({ requestId })` — בעל הבקשה רואה הכל; תאגיד רואה רק את שלו.
- `awardOffer({ offerId })` — בעל הבקשה מכריז זוכה; שולח שני מיילים: לזוכה ("זכית בבקשה") ולמפסידים ("הבקשה נסגרה").

### `job-requests.functions.ts` (תוספות)
- `listMyJobRequests()` — לפי תפקיד: קבלן רואה את שלו, תאגיד רואה בקשות פתוחות שמתאימות, אדמין רואה הכל.
- `getJobRequestWithOffers({ id })` — מחזיר בקשה + פריטים + הצעות (מוסתר/חשוף לפי תפקיד).
- `closeJobRequest({ id })` — בעל הבקשה סוגר ידנית.

### `job-messages.functions.ts`
- `sendJobMessage({ requestId, corporationId, body })`
- `listJobMessages({ requestId, corporationId })`

## 3. תבניות מייל חדשות (`src/lib/email-templates/`)
- `offer-submitted.tsx` — לבעל הבקשה כשמתקבלת הצעה (תאגיד אנונימי, מחיר, זמינות).
- `offer-awarded.tsx` — לתאגיד שזכה (פרטי קשר חשופים, הוראות המשך).
- `offer-rejected.tsx` — לתאגידים שלא זכו (התראה מנומסת).

כולן רשומות ב-`registry.ts`.

## 4. שינויי UI (מינימליים, ממוקדים)

### `requests.$id.tsx`
- במקום `getRequest()` mock → `getJobRequestWithOffers` server function ב-loader (תחת `_authenticated`).
- שמירה על כל ה-UI (השוואה/דירוג/סינון) — ה-types נשארים תואמים.
- כפתור "בחר זוכה" → קורא ל-`awardOffer`.

### `corporation-dashboard.tsx`
- הצגת בקשות פתוחות שתאגיד יכול להגיש להן.
- טופס "הגש הצעה" (Sheet/Dialog) → `submitOffer`.

### `dashboard.tsx`
- הוספת רשימת הבקשות האמיתיות של הקבלן עם סטטוס וסיכום הצעות (`open` / `awarded` / `closed`).

## 5. הערות טכניות
- כל הפעולות עוברות `requireSupabaseAuth`.
- `submitOffer` בודק:
  1. המשתמש בעל role=`corporation` ו-`verification_status='approved'`
  2. הבקשה במצב `open`
  3. אין הצעה קיימת מאותו תאגיד (UNIQUE)
- `awardOffer` בודק שהמשתמש הוא בעל הבקשה.
- מיילים נשלחים דרך `sendTransactionalEmail` עם `idempotencyKey` ייחודי לכל אירוע.
- `mock-data.ts` נשאר זמנית כ-fallback ל-corporations שטרם נרשמו (לתצוגה בעמודי שיווק בלבד).

## מה לא נכלל בסבב הזה
- Realtime updates (אפשר להוסיף מאוחר יותר עם Supabase Realtime).
- מערכת תשלומים/escrow (תלוי במחבר תשלומים נפרד).
- ייצוא PDF לבקשה האמיתית — פונקציית הייצוא הקיימת תעבוד אוטומטית כי ה-types תואמים.

---

**גודל משוער:** migration אחת + ~6 קבצי server functions/templates + 3 קבצי UI מעודכנים. אחרי אישור — אבצע הכל ברצף.