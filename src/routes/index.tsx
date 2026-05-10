import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  HardHat, Hammer, Layers, PaintRoller, Wrench, Building2,
  ShieldCheck, Zap, Star, MessageCircle, ArrowLeft, CheckCircle2,
  Users, Clock, TrendingUp, BadgeCheck, Quote, Menu, X, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero-construction.jpg";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <Hero />
      <Stats />
      <HowItWorks />
      <Categories />
      <WhyTrust />
      <Corporations />
      <Testimonials />
      <CTABanner />
      <Footer />
    </div>
  );
}

/* ---------- NAV ---------- */
function Nav() {
  const [open, setOpen] = useState(false);
  const links = [
    { label: "איך זה עובד", href: "#how" },
    { label: "תחומים", href: "#categories" },
    { label: "תאגידים מאומתים", href: "#corps" },
    { label: "לקוחות", href: "#testimonials" },
  ];
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        <a href="#" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-primary shadow-elegant">
            <HardHat className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-extrabold tracking-tight">
            Build<span className="text-primary">Force</span>
          </span>
        </a>
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" size="sm">התחברות</Button>
          <Button size="sm" className="bg-gradient-primary text-primary-foreground shadow-elegant hover:opacity-95">
            פרסום בקשה
          </Button>
        </div>
        <button onClick={() => setOpen(!open)} className="md:hidden text-foreground" aria-label="תפריט">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-border/60 bg-background md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
            {links.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                {l.label}
              </a>
            ))}
            <Button className="mt-2 bg-gradient-primary text-primary-foreground">פרסום בקשה</Button>
          </div>
        </div>
      )}
    </header>
  );
}

/* ---------- HERO ---------- */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img src={heroImg} alt="אתר בנייה" className="h-full w-full object-cover opacity-40" width={1920} height={1080} />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/85 to-background" />
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 md:px-6 md:py-28 lg:grid-cols-12 lg:py-36">
        <div className="lg:col-span-7">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            הפלטפורמה המובילה לכוח אדם בבנייה בישראל
          </div>
          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight md:text-6xl lg:text-7xl">
            כוח האדם הנכון.<br />
            <span className="text-gradient-primary">במחיר הנכון.</span><br />
            תוך שעות.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
            פרסם בקשה אחת, קבל הצעות תחרותיות מתאגידי כוח אדם מאומתים בלבד.
            השוואה חכמה, דירוגים אמיתיים, ושליטה מלאה — בלי טלפונים ובלי זמן מבוזבז.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" className="bg-gradient-primary text-primary-foreground shadow-elegant hover:opacity-95 h-12 px-7 text-base font-semibold">
              פרסם בקשת כוח אדם
              <ArrowLeft className="mr-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="h-12 border-border bg-card/50 px-7 text-base backdrop-blur hover:bg-card">
              איך זה עובד
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> ללא עמלה לקבלן</span>
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> תאגידים מאומתים בלבד</span>
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> הצעות תוך 24 שעות</span>
          </div>
        </div>

        {/* Sample request card */}
        <div className="lg:col-span-5">
          <div className="glass-card relative rounded-2xl p-6 shadow-card">
            <div className="absolute -top-3 right-6 rounded-full bg-gradient-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow-elegant">
              בקשה פעילה
            </div>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-medium text-muted-foreground">בקשה #BF-2847</div>
                <h3 className="mt-1 text-lg font-bold">7 קבלני טפסנות · תל אביב</h3>
                <p className="mt-1 text-sm text-muted-foreground">3 חודשים · התחלה 1 ביוני</p>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary/15 text-primary">
                <Hammer className="h-6 w-6" />
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">הצעות שהתקבלו · 4</div>
              {[
                { name: "כוח אדם דניאל בע״מ", price: "₪185", rating: 4.9, badge: true },
                { name: "אלקטרה מנפאואר", price: "₪192", rating: 4.8, badge: true },
                { name: "מצדה כוח אדם", price: "₪198", rating: 4.7, badge: false },
              ].map((c, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl border border-border/60 bg-secondary/40 p-3 transition-colors hover:border-primary/40">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-muted text-xs font-bold">{c.name[0]}</div>
                    <div>
                      <div className="flex items-center gap-1.5 text-sm font-semibold">
                        {c.name}
                        {c.badge && <BadgeCheck className="h-4 w-4 text-primary" />}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="h-3 w-3 fill-primary text-primary" /> {c.rating}
                      </div>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-base font-extrabold">{c.price}</div>
                    <div className="text-[10px] text-muted-foreground">לשעה / עובד</div>
                  </div>
                </div>
              ))}
            </div>

            <Button className="mt-5 w-full bg-gradient-primary text-primary-foreground hover:opacity-95">
              השוואת הצעות מלאה
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- STATS ---------- */
function Stats() {
  const stats = [
    { value: "+340", label: "תאגידי כוח אדם מאומתים" },
    { value: "12,400", label: "עובדים זמינים השבוע" },
    { value: "<24h", label: "זמן ממוצע לקבלת הצעות" },
    { value: "98%", label: "שביעות רצון קבלנים" },
  ];
  return (
    <section className="border-y border-border/60 bg-card/40">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 md:grid-cols-4 md:px-6">
        {stats.map((s) => (
          <div key={s.label} className="text-center md:text-right">
            <div className="text-3xl font-extrabold tracking-tight md:text-4xl">{s.value}</div>
            <div className="mt-1 text-xs text-muted-foreground md:text-sm">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- HOW IT WORKS ---------- */
function HowItWorks() {
  const steps = [
    { n: "01", title: "פרסם בקשה", desc: "תחום, מספר עובדים, אתר ומועד התחלה — דקה ופחות." },
    { n: "02", title: "קבל הצעות תחרותיות", desc: "תאגידים מאומתים שולחים הצעות איכות ומחיר ברורות." },
    { n: "03", title: "השוואה חכמה", desc: "מחיר, דירוג, זמינות וחוות דעת — הכל במקום אחד." },
    { n: "04", title: "בחר ספק וצא לדרך", desc: "אישור בקליק, חוזה דיגיטלי, תקשורת ישירה ב-WhatsApp." },
  ];
  return (
    <section id="how" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <SectionHeader eyebrow="התהליך" title="ארבעה שלבים. אפס סיבוכים." subtitle="תהליך עבודה ישיר ומאובטח שתוכנן לקצב של אתר בנייה אמיתי." />
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.n} className="hover-lift group relative rounded-2xl border border-border/60 bg-card p-6">
              <div className="text-5xl font-extrabold text-primary/20 transition-colors group-hover:text-primary/40">{s.n}</div>
              <h3 className="mt-3 text-lg font-bold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              {i < steps.length - 1 && (
                <div className="absolute -left-3 top-1/2 hidden h-px w-6 bg-gradient-to-l from-primary/40 to-transparent lg:block" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- CATEGORIES ---------- */
function Categories() {
  const cats = [
    { icon: Hammer, name: "טפסנים", count: "3,200+ עובדים", desc: "טפסנות מודולרית, יציקות, קונסטרוקציה." },
    { icon: Wrench, name: "ברזלנים", count: "2,800+ עובדים", desc: "כיפוף, קשירה, רשתות, מוטות מאמץ." },
    { icon: Layers, name: "רצפים", count: "1,950+ עובדים", desc: "קרמיקה, גרניט פורצלן, אבן טבעית." },
    { icon: PaintRoller, name: "טייחים", count: "1,500+ עובדים", desc: "טיח פנים, חוץ, שכבות יסוד וגמר." },
    { icon: Building2, name: "עובדי גמר", count: "2,100+ עובדים", desc: "גבס, צבע, מסגרות פנים, עבודות עדינות." },
  ];
  return (
    <section id="categories" className="border-y border-border/60 bg-card/30 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <SectionHeader eyebrow="תחומי התמחות" title="כל בעלי המקצוע. תאגיד אחד." subtitle="פילוח מדויק לפי תחום וניסיון, כדי שתקבל בדיוק את הצוות שאתה צריך." />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cats.map((c) => (
            <div key={c.name} className="hover-lift group cursor-pointer rounded-2xl border border-border/60 bg-card p-6">
              <div className="flex items-start justify-between">
                <div className="grid h-14 w-14 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-elegant">
                  <c.icon className="h-7 w-7" />
                </div>
                <ArrowLeft className="h-5 w-5 -rotate-180 text-muted-foreground transition-transform group-hover:-translate-x-1 group-hover:text-primary" />
              </div>
              <h3 className="mt-5 text-xl font-bold">{c.name}</h3>
              <p className="mt-1 text-xs font-semibold text-primary">{c.count}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- WHY TRUST ---------- */
function WhyTrust() {
  const items = [
    { icon: ShieldCheck, title: "תאגידים מאומתים בלבד", desc: "כל תאגיד עובר בדיקת רישוי, אישורים, ביטוח ותקני בטיחות לפני אישור לפלטפורמה." },
    { icon: Zap, title: "הצעות במהירות שיא", desc: "ממוצע של פחות מ-24 שעות מפרסום בקשה ועד קבלת 3+ הצעות תחרותיות." },
    { icon: Star, title: "דירוגים אמיתיים", desc: "כל דירוג מגיע מקבלן שעבד בפועל. אין דירוגים מזויפים. שקיפות מלאה." },
    { icon: Users, title: "ניהול במקום אחד", desc: "בקשות, חוזים, תקשורת ותשלומים — לוח בקרה אחד נקי לכל הפרויקטים שלך." },
    { icon: Clock, title: "סטטוס זמינות חי", desc: "ראה מי זמין השבוע, החודש, או בתאריך ספציפי — בלי שיחות מיותרות." },
    { icon: TrendingUp, title: "מחירי שוק שקופים", desc: "אנליטיקה מובנית שמראה לך אם ההצעה שקיבלת תחרותית או מחוץ לשוק." },
  ];
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <SectionHeader eyebrow="למה BuildForce" title="הפלטפורמה שתוכננה לקבלנים שלא מתפשרים." subtitle="לא לוח דרושים זול. תשתית רצינית לענף הבנייה הישראלי." />
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <div key={it.title} className="rounded-2xl border border-border/60 bg-card p-6 hover-lift">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/15 text-primary">
                <it.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold">{it.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{it.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- VERIFIED CORPORATIONS ---------- */
function Corporations() {
  const corps = [
    { name: "כוח אדם דניאל", workers: "1,240", rating: 4.9, regions: "מרכז · שפלה" },
    { name: "אלקטרה מנפאואר", workers: "2,100", rating: 4.8, regions: "ארצי" },
    { name: "מצדה כוח אדם", workers: "890", rating: 4.7, regions: "צפון · חיפה" },
    { name: "אורט בנייה", workers: "650", rating: 4.8, regions: "ירושלים · דרום" },
  ];
  return (
    <section id="corps" className="border-y border-border/60 bg-card/30 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <SectionHeader eyebrow="תאגידים מאומתים" title="ספקים שעוברים בדיקה. שיעבדו בלי הפתעות." subtitle="כל תאגיד מסומן באישור BuildForce עבר בדיקת רישוי, ביטוח, ותקני בטיחות." />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {corps.map((c) => (
            <div key={c.name} className="hover-lift rounded-2xl border border-border/60 bg-card p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-primary text-lg font-extrabold text-primary-foreground shadow-elegant">
                  {c.name[0]}
                </div>
                <div>
                  <div className="flex items-center gap-1 text-sm font-bold">
                    {c.name} <BadgeCheck className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 fill-primary text-primary" /> {c.rating}
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border/60 pt-4 text-xs">
                <div>
                  <div className="text-muted-foreground">עובדים</div>
                  <div className="font-bold">{c.workers}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">אזורים</div>
                  <div className="font-bold">{c.regions}</div>
                </div>
              </div>
              <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> זמין השבוע
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- TESTIMONIALS ---------- */
function Testimonials() {
  const items = [
    { quote: "תוך פחות מיממה היו לי 5 הצעות איכותיות. החלפתי קבלן משנה תוך יום. שינה לי את האתר.", name: "אבי ש׳", role: "מנהל פרויקט · רמת גן", rating: 5 },
    { quote: "שקיפות מלאה במחירים. סוף סוף יודעים אם משלמים יותר מדי. חוסך לי לפחות 12% בחודש.", name: "רונן מ׳", role: "קבלן ראשי · נתניה", rating: 5 },
    { quote: "הדירוגים אמיתיים. עבדתי עם תאגיד שדורג 4.9 ובאמת קיבלתי צוות מקצועי בזמן.", name: "דנה ל׳", role: "יזמית · תל אביב", rating: 5 },
  ];
  return (
    <section id="testimonials" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <SectionHeader eyebrow="מה אומרים עלינו" title="קבלנים מובילים כבר עברו ל-BuildForce." subtitle="" />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {items.map((t, i) => (
            <div key={i} className="hover-lift relative rounded-2xl border border-border/60 bg-card p-6">
              <Quote className="absolute left-5 top-5 h-8 w-8 text-primary/15" />
              <div className="flex gap-0.5">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-primary text-primary" />
                ))}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-foreground/90">״{t.quote}״</p>
              <div className="mt-6 flex items-center gap-3 border-t border-border/60 pt-4">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-muted text-sm font-bold">{t.name[0]}</div>
                <div>
                  <div className="text-sm font-bold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- CTA BANNER ---------- */
function CTABanner() {
  return (
    <section className="px-4 pb-20 md:px-6 md:pb-28">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-card via-card to-secondary p-8 shadow-elegant md:p-14">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-extrabold leading-tight md:text-5xl">
              מוכן לקבל את הצוות הבא שלך?
            </h2>
            <p className="mt-4 max-w-lg text-base text-muted-foreground md:text-lg">
              פרסום בקשה לוקח 60 שניות. הצעות הראשונות מגיעות תוך שעות. פתיחת חשבון חינם.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Button size="lg" className="h-12 bg-gradient-primary px-7 text-base font-semibold text-primary-foreground shadow-elegant hover:opacity-95">
              פרסם בקשה עכשיו
              <ArrowLeft className="mr-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="h-12 border-border bg-card/60 px-7 text-base hover:bg-card">
              <MessageCircle className="ml-2 h-4 w-4" /> דבר איתנו ב-WhatsApp
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- FOOTER ---------- */
function Footer() {
  return (
    <footer className="border-t border-border/60 bg-card/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-4 md:px-6">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-primary">
              <HardHat className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-extrabold">Build<span className="text-primary">Force</span></span>
          </div>
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            שוק כוח האדם החכם של ענף הבנייה בישראל. מחבר קבלנים ויזמים עם תאגידי כוח אדם מאומתים.
          </p>
        </div>
        <div>
          <div className="text-sm font-bold">הפלטפורמה</div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><a href="#how" className="hover:text-foreground">איך זה עובד</a></li>
            <li><a href="#categories" className="hover:text-foreground">תחומים</a></li>
            <li><a href="#corps" className="hover:text-foreground">תאגידים</a></li>
          </ul>
        </div>
        <div>
          <div className="text-sm font-bold">צור קשר</div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>support@buildforce.co.il</li>
            <li>03-000-0000</li>
            <li>תל אביב, ישראל</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} BuildForce. כל הזכויות שמורות.
      </div>
    </footer>
  );
}

/* ---------- HELPER ---------- */
function SectionHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
        {eyebrow}
      </div>
      <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight md:text-5xl">{title}</h2>
      {subtitle && <p className="mt-4 text-base text-muted-foreground md:text-lg">{subtitle}</p>}
    </div>
  );
}
