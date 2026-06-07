# בדיקה מקיפה — תוצאות

✅ **תקין**: Cloud פעיל, אין שגיאות runtime, מבנה DB תקין (4 משתמשים, 4 פרופילים, 1 מכרז, 3 הצעות), כל המסכים נבנים ללא שגיאות, RLS מופעל על כל הטבלאות.

❌ **נמצאו 28 ממצאים** (8 קריטיים, 9 אזהרות, השאר אינפורמטיביים).

---

# הפלאן: לתקן את 8 הבעיות הקריטיות

## 1. 🔴 חסר רישום middleware — כל server functions שבורות פוטנציאלית

`src/start.ts` לא רושם את `attachSupabaseAuth` כ-`functionMiddleware`. בלי זה — כל קריאה מהדפדפן לפונקציה מוגנת יוצאת ללא Bearer token ונופלת ב-401.
**תיקון**: הוספת `functionMiddleware: [attachSupabaseAuth]` ל-`createStart`.

## 2. 🔴 חשיפת פרטי קשר במכרזים

שדות `contact_name` ו-`contact_phone` בטבלת `job_requests` נראים לכל תאגיד שמגיש הצעה — מאפשר לעקוף את הפלטפורמה.
**תיקון**: העברת השדות לטבלה נפרדת `job_request_contacts` שנגישה רק אחרי זכייה (RLS על `job_awards`).

## 3. 🔴 חשיפת שדות רגישים בפרופיל

`admin_notes`, `business_id`, `contractor_license_number`, מסמכים — נחשפים לצד הנגדי במכרז.
**תיקון**: יצירת view `public_profiles` ללא השדות הרגישים, ועדכון RLS לחשוף רק אותו לצדדים נגדיים.

## 4. 🔴 שני endpoints ציבוריים ללא אימות

- `/api/public/hooks/auto-approve-attendance` — תוקף יכול לאשר אוטומטית את כל רשומות הנוכחות.
- `/api/public/hooks/contractor-daily-reminder` — תוקף יכול להציף את טבלת ההתראות.
  **תיקון**: הוספת בדיקת `Bearer token` עם `timingSafeEqual` (זהה לדפוס ב-`close-expired-requests.ts`).

## 5. 🔴 הזרקת הודעות בצ'אט המכרז

`sendJobMessage` ו-`listJobMessages` מקבלים `corporationId` מהלקוח ללא אימות שייכות. כל משתמש מאומת יכול לשלוח הודעות בשם תאגיד אחר ולקרוא שיחות פרטיות.
**תיקון**: וידוא ב-server שה-`userId` שייך ל-`corporationId` או הוא בעל ה-request.

## 6. 🔴 חשיפת רשומות נוכחות + תמונות חתומות

`getAttendanceRecord` מחזיר רשומה מלאה + Signed URLs לכל משתמש מאומת ללא בדיקת בעלות.
`requestCorrection` מאפשר לכל משתמש להגיש בקשת תיקון על כל רשומה.
**תיקון**: הוספת בדיקת `userId === team_leader_id|contractor_id|corporation_id` לפני החזרת/עדכון נתונים.

## 7. 🔴 מדיניות Storage שבורות

שתי מדיניויות (`Parties read attendance photos`, `Team leader uploads`) משתמשות ב-`storage.foldername(p.name)` במקום ב-`storage.objects.name` — הבדיקה כמעט תמיד תיכשל ותחסום גישה לגיטימית.
**תיקון**: עדכון המדיניויות לחלץ מהנתיב של הקובץ עצמו.

## 8. 🔴 Realtime פתוח לכל המשתמשים

`attendance_records` ו-`attendance_events` משודרים ב-Realtime ללא RLS על `realtime.messages` — כל משתמש מאומת יכול להאזין לרשומות נוכחות של אחרים.
**תיקון**: RLS על `realtime.messages` שמגביל לפי project membership.

---

# בעיות חמורות (warn) — מומלץ אך לא חוסם השקה

- 🟡 פאנל אדמין מסתמך על בדיקה client-side בלבד (פעולות בטוחות בזכות RLS אבל עדיף server fn).
- 🟡 `corporation_workforce`, `job_request_items`, `job_ratings` נראים לכל משתמש מאומת.
- 🟡 `recipient_phone` בהתראות SMS/in-app נחשף לכל הצדדים ברשומה.

אטפל בהם בסבב נפרד אחרי ההשקה אם תרצה.

---

# סדר ביצוע (אחרי אישור)

```text
1. מיגרציה אחת מאוחדת:
   - העברת contact_name/phone לטבלה נפרדת + RLS
   - יצירת public_profiles view + RLS
   - תיקון 2 storage policies
   - RLS על realtime.messages
2. עדכון src/start.ts — רישום attachSupabaseAuth
3. עדכון 2 endpoints ציבוריים — בדיקת Bearer
4. עדכון job-messages.functions.ts — אימות שייכות
5. עדכון attendance.functions.ts — getAttendanceRecord + requestCorrection
6. הרצת בדיקת אבטחה חוזרת לוודא 0 errors
7. SMS4Free (כשתסיים למלא את הסודות)
```

זמן משוער: 15–20 דקות עבודה רצופה. אחרי האישור שלך — נכנסים לבנייה.
