# מערכת נוכחות ואישורים יומיים — BuildForce

הוספת מודול שלם של נוכחות, אישורים יומיים ודוחות חודשיים על בסיס הפלטפורמה הקיימת. נבנה ב-3 שלבים כדי לעלות לאוויר מהר ובאיכות.

---

## שלב 1 — תשתית נתונים וליבת זרימה (MVP פעיל)

### טבלאות חדשות (Lovable Cloud)
- `projects` — פרויקט חי שנוצר אוטומטית אחרי בחירת זוכה במכרז: שם, כתובת, קבלן, תאגיד, תאריך התחלה, סטטוס (active/paused/completed), כמות עובדים מתוכננת.
- `project_teams` — צוות בפרויקט: שם צוות, מנהל צוות (team_leader user_id), כמות עובדים מתוכננת, מחיר לשעה.
- `project_members` — שיוך משתמשים לפרויקט עם תפקיד (`site_manager`, `team_leader`).
- `attendance_records` — רשומה יומית אחת לכל צוות: project_id, team_id, date, workers_expected, workers_actual, start_time, end_time, status (`pending`, `approved`, `auto_approved`, `exception`, `rejected`, `correction_requested`), approved_by, approved_at, frozen_at.
- `attendance_events` — timeline של אירועים: סוג (start/end/exception/approval/correction), photo_url, gps_lat/lng, timestamp, actor_id, payload.
- `attendance_corrections` — בקשות תיקון אחרי הקפאה: reason, requested_change, status, decided_by.
- `attendance_audit` — לוג בלתי-משתנה לכל שינוי סטטוס.
- תפקיד חדש ב-`app_role`: `team_leader`, `site_manager`.

### Storage
- bucket `attendance-photos` (פרטי). כל קובץ תחת `{project_id}/{date}/{team_id}/{event_id}.jpg`.

### RLS
- קבלן רואה רשומות של הפרויקטים שלו בלבד.
- תאגיד רואה רשומות של הצוותים שלו.
- ראש צוות רואה את הרשומות שהוא יצר.
- אדמין רואה הכל.
- אחרי `frozen_at` — אין UPDATE על הרשומה (rule בטריגר), רק דרך `attendance_corrections`.

### Cron + Server Functions
- `auto-approve-attendance` (cron כל 15 דק') — סוגר אוטומטית רשומות שעברו את ה-timeout (ברירת מחדל 4 שעות מהשליחה) → `auto_approved`.
- `freeze-end-of-day` (cron יומי 23:59) — מקפיא רשומות שאושרו.
- `nightly-daily-summary` — בונה כרטיסי סיכום יומי.

---

## שלב 2 — חוויית משתמש מובייל-first

### מסכי ראש צוות (`/team-leader`)
- כפתור ענק **"התחל יום עבודה"** — פותח מצלמה חיה (`<input type="file" capture="environment">` נעול ל-camera, ללא גלריה), בוחר כמות עובדים, שולח GPS אוטומטי.
- ווטרמרק על התמונה: שם פרויקט / תאריך / שעה / GPS — נצרב ב-Canvas לפני העלאה.
- כפתור **"סיים יום עבודה"** באותו אופן.
- כפתור **"דווח חריגה"** — 6 כפתורים גדולים בלבד (יצא מוקדם / עזב חלקי / היעדרות / חצי יום / איחור / אחר).
- תור offline ב-IndexedDB: אם אין רשת, שומר ושולח ברגע שחוזרת (`navigator.onLine` + service worker basic).

### דשבורד קבלן (`/contractor`)
- כרטיס "היום": צוותים פעילים, ממתינים לאישור, חריגות.
- כפתור **"אשר הכל"** — אישור גורף.
- אישור בודד עם תצוגת תמונה ומפה.
- סיכום עלות יומית/חודשית.
- רשימת פרויקטים פעילים.

### דשבורד תאגיד (`/labor-supplier`)
- צוותים פעילים היום, אישורים שהתקבלו, חריגות, ימי עבודה מאושרים, סיכום מוכן-לחשבונית.

### עיצוב
- Mobile-first, RTL, כפתורים גדולים (h-16+), צבעי סטטוס: ירוק/צהוב/אדום/אפור.
- שפות: עברית עכשיו, מבנה i18n מוכן ל-EN/AR/RU בעתיד.

---

## שלב 3 — דוחות, התראות, התחברות לפלטפורמה

- **דוח חודשי PDF + Excel** (server fn): פרויקט, קבלן, תאגיד, צוות, ימים מאושרים/חצאי/חריגות, סך עלות.
- **התראות חכמות**: תזכורת בוקר אם לא נפתח יום עד 09:00, תזכורת ערב אם לא נסגר עד 18:00, התראת חריגה מיידית — דרך תור המייל הקיים + מייל אחד מאוחד ביום (לא ספאם).
- **חיבור לזכייה במכרז**: trigger על `job_awards` יוצר אוטומטית `project` + `project_team` + משייך את הקבלן והתאגיד. דשבורד הקבלן הקיים יציג כרטיס "פרויקט פעיל חדש" עם כניסה למודול הנוכחות.
- **Audit Trail**: שימוש ב-`audit_log` הקיים (כבר נבנה) לכל פעולת אישור/דחייה/תיקון.

---

## עקרונות שלא מתפשרים

- ראש צוות חייב מצלמה חיה — `capture="environment"` + ולידציה ב-server שיש GPS ו-EXIF סביר.
- אחרי הקפאה → רק דרך `correction_request`.
- שני הצדדים תמיד רואים את אותה הרשומה (single source of truth).
- כל פעולה ≤ 5 שניות, כפתור אחד.

---

## טכני (לסקירה מהירה)

```text
Routes חדשים:
  /team-leader           → start/end day, exceptions
  /team-leader/$projectId
  /contractor/attendance → daily approvals
  /labor-supplier/attendance
  /reports/$projectId    → monthly PDF/Excel
  api/public/hooks/auto-approve-attendance
  api/public/hooks/freeze-end-of-day

Server functions:
  startWorkday, endWorkday, reportException
  approveAttendance, approveAllPending, rejectAttendance
  requestCorrection, decideCorrection
  generateMonthlyReport (pdf + xlsx)

Tech:
  - exif-js / canvas watermark
  - jsPDF + sheetjs (כבר במערכת לחלקם)
  - IndexedDB queue ל-offline (idb-keyval)
  - שדרוג service worker ל-background-sync
```

---

## מה אבנה עכשיו (בסבב הבא, אם תאשר)

1. כל הסכמה (טבלאות + RLS + triggers + storage bucket).
2. שלוש זרימות הליבה: `startWorkday`, `endWorkday`, `approveAttendance` + auto-approve cron.
3. שלושה מסכים: ראש צוות, דשבורד קבלן (אישורים יומיים), דשבורד תאגיד.
4. דוח חודשי PDF (Excel בסבב 2).

תגיד "אשר תוכנית" ואני יוצא לדרך — סבב ראשון יסתיים בכך שתוכל באמת להריץ יום עבודה שלם מקצה לקצה במצב דמו.