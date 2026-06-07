import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "מדיניות פרטיות — BuildForce" },
      {
        name: "description",
        content:
          "מדיניות הפרטיות של פלטפורמת BuildForce — איזה מידע אנו אוספים, איך אנו משתמשים בו ומה הזכויות שלך.",
      },
      { property: "og:title", content: "מדיניות פרטיות — BuildForce" },
      {
        property: "og:description",
        content: "כיצד BuildForce מטפלת במידע אישי של לקוחות ותאגידים.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        <h1 className="text-3xl font-extrabold md:text-4xl">מדיניות פרטיות</h1>
        <p className="mt-2 text-sm text-muted-foreground">עודכן לאחרונה: מאי 2026</p>

        <div className="prose prose-invert mt-8 max-w-none space-y-6 text-sm leading-7 text-foreground/90">
          <Section title="1. מבוא">
            BuildForce ("הפלטפורמה", "אנחנו") מחויבת להגנה על פרטיות המשתמשים שלה — קבלנים, יזמים
            ותאגידי כוח אדם. מדיניות זו מסבירה איזה מידע אנו אוספים, איך אנו משתמשים בו ובאילו מקרים
            נשתף אותו.
          </Section>

          <Section title="2. מידע שאנו אוספים">
            <ul className="mr-5 list-disc space-y-1">
              <li>פרטי הרשמה: שם מלא, דוא״ל, טלפון, שם חברה, עיר.</li>
              <li>מסמכים עסקיים (לתאגידים): רישיון קבלן, ביטוחים, אישור ניהול ספרים.</li>
              <li>תוכן בקשות והצעות שאתה מפרסם או מגיש דרך הפלטפורמה.</li>
              <li>נתוני שימוש טכניים (כתובת IP, סוג דפדפן, פעולות בסיסיות).</li>
            </ul>
          </Section>

          <Section title="3. שימוש במידע">
            המידע משמש להפעלת הפלטפורמה, אימות תאגידים, התאמת בקשות והצעות, שליחת התראות במייל,
            שיפור השירות ועמידה בדרישות החוק.
          </Section>

          <Section title="4. שיתוף עם צדדים שלישיים">
            איננו מוכרים מידע אישי. נשתף מידע רק במקרים הבאים: ספקי תשתית (אחסון, מייל), דרישה
            משפטית, או הסכמה מפורשת מצידך (לדוגמה — חשיפת פרטי קשר אחרי בחירת זוכה במכרז).
          </Section>

          <Section title="5. אבטחת מידע">
            אנו משתמשים בהצפנה בתעבורה, בקרת גישה ברמת שורה (RLS) במסד הנתונים, וסביבת אחסון מאובטחת
            לקבצי מסמכים.
          </Section>

          <Section title="6. זכויות המשתמש">
            יש לך זכות לעיין במידע, לתקן אותו או לבקש את מחיקתו בכפוף לדין הישראלי ולתקנות ה-GDPR
            החלות. ניתן לפנות ל-privacy@buildforceprime.com.
          </Section>

          <Section title="7. עוגיות (Cookies)">
            אנו משתמשים בעוגיות חיוניות לתפעול הפלטפורמה (התחברות, העדפות). באמצעות באנר הקוקיז ניתן
            לאשר או לדחות עוגיות לא-חיוניות.
          </Section>

          <Section title="8. שינויים במדיניות">
            נעדכן מדיניות זו מעת לעת. עדכונים מהותיים יישלחו במייל ויפורסמו בעמוד זה.
          </Section>

          <Section title="9. יצירת קשר">לכל שאלה: privacy@buildforceprime.com</Section>
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
