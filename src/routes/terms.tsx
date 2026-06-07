import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "תנאי שימוש — BuildForce" },
      {
        name: "description",
        content: "תנאי השימוש בפלטפורמת BuildForce עבור קבלנים, יזמים ותאגידי כוח אדם.",
      },
      { property: "og:title", content: "תנאי שימוש — BuildForce" },
      { property: "og:description", content: "התנאים המשפטיים לשימוש בפלטפורמת BuildForce." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        <h1 className="text-3xl font-extrabold md:text-4xl">תנאי שימוש</h1>
        <p className="mt-2 text-sm text-muted-foreground">עודכן לאחרונה: מאי 2026</p>

        <div className="prose prose-invert mt-8 max-w-none space-y-6 text-sm leading-7 text-foreground/90">
          <Section title="1. כללי">
            ברוכים הבאים ל-BuildForce. השימוש בפלטפורמה מהווה הסכמה לתנאים אלו. אם אינך מסכים — אנא
            הפסק את השימוש.
          </Section>

          <Section title="2. הרשאות וזכאות">
            הפלטפורמה מיועדת לעסקים בלבד: קבלני בנייה רשומים, יזמים ותאגידי כוח אדם בעלי רישיונות
            תקפים בישראל. עליך לוודא שהמידע שאתה מספק מדויק וכי יש לך הרשאה לפעול בשם החברה.
          </Section>

          <Section title="3. אימות תאגידים">
            תאגידי כוח אדם מאומתים על ידי צוות BuildForce בהתבסס על מסמכים שהוגשו (רישיון, ביטוח,
            אישור ניהול ספרים). אנו שומרים את הזכות לאשר, לדחות או להשעות תאגידים על פי שיקול דעתנו.
          </Section>

          <Section title="4. מכרזים והצעות">
            <ul className="mr-5 list-disc space-y-1">
              <li>בקשות עבודה מוצגות לתאגידים מאומתים בלבד.</li>
              <li>הצעות מחיר מחייבות את התאגיד המגיש לתקופת תוקף שצוינה.</li>
              <li>בחירת זוכה היא סופית ומיידית; פרטי קשר ייחשפו לזוכה בלבד.</li>
              <li>BuildForce אינה צד לחוזה ההעסקה בין הקבלן לתאגיד.</li>
            </ul>
          </Section>

          <Section title="5. עמלות ותשלומים">
            BuildForce גובה עמלת פלטפורמה מהתאגיד הזוכה (₪1.5 לשעת עובד, אלא אם צוין אחרת). פרטי
            החיוב יישלחו במייל לאחר תחילת הפרויקט.
          </Section>

          <Section title="6. תקשורת מחוץ לפלטפורמה">
            <p>
              כל התקשורת בין קבלן לתאגיד לפני בחירת זוכה חייבת להתבצע בתוך הפלטפורמה בלבד. אסור
              לחלוטין: שיתוף מספרי טלפון, אימייל, קישורים, שמות משתמש או כל ערוץ חיצוני (WhatsApp,
              Telegram, Instagram וכד׳) בהודעות מכרז, וכן יצירת קשר ישיר מחוץ לפלטפורמה אחרי שאותרת
              זהות הצד השני דרך BuildForce.
            </p>
            <p className="mt-2">
              <strong>קנס בגין עקיפה:</strong> תאגיד שייצור קשר ישיר עם קבלן ויסגור עסקה מחוץ
              לפלטפורמה יחויב בקנס בגובה <strong>פי 12 מהעמלה החודשית הצפויה</strong> של אותו פרויקט
              (לפי מספר העובדים × ₪2 לשעה × 176 שעות חודשיות × 12), בנוסף להשעיה מיידית מהפלטפורמה
              ושיפוי על נזקים נוספים. קנס זה מהווה פיצוי מוסכם מראש לפי סעיף 15 לחוק החוזים
              (תרופות).
            </p>
            <p className="mt-2">
              BuildForce מנטרת אוטומטית את תוכן ההודעות, שומרת לוגים מלאים של גישה ופעולות, ורשאית
              להסתמך עליהם כראיה משפטית.
            </p>
          </Section>

          <Section title="7. אחריות">
            BuildForce מספקת תשתית טכנולוגית בלבד. איננו אחראים לאיכות העבודה, סכסוכי שכר או נזקים
            בין הצדדים. השימוש בפלטפורמה הוא על אחריותך.
          </Section>

          <Section title="7א. הגנות משפטיות נוספות">
            <ul className="mr-5 list-disc space-y-1">
              <li>
                BuildForce אינה צד לעסקה בין קבלן לתאגיד ואינה אחראית למחדלי תשלום, מסים, ביטוח
                לאומי או רישוי עובדים.
              </li>
              <li>
                שימוש בפלטפורמה כפוף להסכמה מפורשת בעת ההרשמה — לחיצה על "הרשמה" מהווה חתימה
                אלקטרונית מחייבת לפי חוק חתימה אלקטרונית, התשס״א-2001.
              </li>
              <li>
                התאגיד מצהיר שכל העובדים שיסופקו מועסקים על-ידו כדין, עם כל האישורים, הביטוחים
                והרישיונות הנדרשים.
              </li>
              <li>
                BuildForce רשאית לשנות, להשעות או להפסיק כל חשבון בכל עת, לרבות במקרי חשד להונאה,
                עקיפה, או הפרת תנאים — ללא צורך בהתראה מוקדמת.
              </li>
              <li>
                אחריותה הכוללת של BuldForce, אם תקום, מוגבלת לסכום העמלות ששולמו על ידי הצד התובע
                ב-12 החודשים שקדמו לעילת התביעה.
              </li>
            </ul>
          </Section>

          <Section title="8. שינוי תנאים">
            ניתן לעדכן את התנאים מעת לעת. שימוש בפלטפורמה לאחר עדכון מהווה הסכמה לתנאים החדשים.
          </Section>

          <Section title="9. דין וסמכות שיפוט">
            על תנאים אלו יחול הדין הישראלי. סמכות השיפוט הבלעדית תהיה לבתי המשפט המוסמכים בתל
            אביב-יפו.
          </Section>

          <Section title="10. יצירת קשר">לכל שאלה: legal@buildforceprime.com</Section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
      <div className="mt-2 text-muted-foreground">{children}</div>
    </section>
  );
}
