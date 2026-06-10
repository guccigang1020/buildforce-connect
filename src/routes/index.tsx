import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  Hammer,
  Layers,
  PaintRoller,
  Wrench,
  Building2,
  Sparkles,
  ShieldCheck,
  Zap,
  Star,
  ArrowLeft,
  CheckCircle2,
  Mail,
  Users,
  Clock,
  TrendingUp,
  BadgeCheck,
  Lock,
  FileCheck2,
  Headphones,
  TrendingDown,
  Gavel,
  Trophy,
  MapPin,
  Camera,
  ClipboardCheck,
  Smile,
  Eye,
  MessageCircle,
  FileBarChart,
  HardHat,
  Briefcase,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero-construction.jpg";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { PlatformShowcase } from "@/components/platform-showcase";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) {
      void navigate({ to: "/dashboard" });
    }
  }, [loading, session, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <Hero />
      <LiveStatsBar />
      <TrustBar />
      <CompetitionAdvantage />
      <HowItWorks />
      <PlatformShowcase />
      <SiteAttendance />
      <PeaceOfMind />
      <Categories />
      <WhyTrust />
      <SavingsShowcase />
      <EarlyAccess />
      <CTABanner />
      <SiteFooter />
    </div>
  );
}

/* ---------- HERO ---------- */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={heroImg}
          alt="אתר בנייה"
          className="h-full w-full object-cover opacity-25"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/85 via-background/92 to-background" />
      </div>
      {/* Ambient mesh glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-24 right-[20%] h-[520px] w-[520px] rounded-full bg-primary/25 blur-[120px] animate-pulse"
          style={{ animationDuration: "6s" }}
        />
        <div
          className="absolute -bottom-32 left-[15%] h-[460px] w-[460px] rounded-full bg-primary/15 blur-[120px] animate-pulse"
          style={{ animationDuration: "8s", animationDelay: "1s" }}
        />
        <div className="absolute top-1/3 left-1/2 h-[380px] w-[380px] -translate-x-1/2 rounded-full bg-primary/10 blur-[140px]" />
      </div>
      {/* Subtle grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 md:px-6 md:py-28 lg:grid-cols-12 lg:py-36">
        <div className="lg:col-span-7">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary shadow-elegant backdrop-blur-md animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            מכרז חי · תאגידים נלחמים על העבודה שלך
          </div>
          <h1 className="text-5xl font-black leading-[1.02] tracking-tight md:text-7xl lg:text-8xl animate-fade-in">
            הם נלחמים.
            <br />
            <span className="text-gradient-primary">אתה מרוויח.</span>
            <br />
            <span className="opacity-90">במחיר הכי נמוך.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg lg:text-xl">
            פרסם בקשה אחת — תאגידי כוח אדם מאומתים מתחרים על הזכות לעבוד איתך. כל הצעה חדשה דוחפת את
            המחיר למטה. שקיפות מלאה, החלטה אצלך, ללא עמלה לקבלן.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="group relative h-14 overflow-hidden bg-gradient-primary px-8 text-base font-bold text-primary-foreground shadow-[0_0_40px_-8px_hsl(var(--primary)/0.6)] transition-all hover:scale-[1.02] hover:shadow-[0_0_50px_-4px_hsl(var(--primary)/0.8)]"
            >
              <Link to="/new-request">
                פרסם בקשת כוח אדם
                <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-14 border-border/60 bg-card/40 px-8 text-base font-semibold backdrop-blur-md hover:bg-card/80"
            >
              <Link to="/" hash="how">
                איך זה עובד
              </Link>
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" /> שימוש חינם לקבלנים
            </span>
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" /> תאגידים מאומתים בלבד
            </span>
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" /> נתונים מאובטחים בתקן בנקאי
            </span>
          </div>
        </div>

        {/* Sample request card */}
        <div className="lg:col-span-5">
          <div className="relative">
            {/* Halo glow */}
            <div className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-gradient-to-tr from-primary/30 via-primary/10 to-transparent blur-2xl" />
            <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-b from-primary/40 via-primary/10 to-transparent opacity-60 blur-sm" />
            <div className="glass-card relative rounded-2xl p-6 shadow-[0_30px_80px_-20px_hsl(var(--primary)/0.35)] ring-1 ring-primary/25 backdrop-blur-2xl animate-fade-in">
              <div className="absolute -top-3 right-6 inline-flex items-center gap-1.5 rounded-full bg-gradient-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow-elegant">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                </span>
                מכרז חי
              </div>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-medium text-muted-foreground">
                    בקשה <span dir="ltr">#BF-2847</span>
                  </div>
                  <h3 className="mt-1 text-lg font-bold">7 קבלני טפסנות · תל אביב</h3>
                  <p className="mt-1 text-sm text-muted-foreground">3 חודשים · התחלה 1 ביוני</p>
                </div>
                <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary/15 text-primary">
                  <Hammer className="h-6 w-6" />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-700">
                <span className="inline-flex items-center gap-1.5">
                  <TrendingDown className="h-3.5 w-3.5" /> המחיר ירד ב-7% מאז הפרסום
                </span>
                <span dir="ltr" className="savings-badge">
                  חיסכון: ₪14/שעה
                </span>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <span>הצעות שהתקבלו · 4</span>
                  <span className="inline-flex items-center gap-1 normal-case text-emerald-400">
                    <Trophy className="h-3 w-3" /> מובילה
                  </span>
                </div>
                {[
                  {
                    name: "ספק מאומת · BF-3947",
                    price: "₪185",
                    rating: 4.9,
                    badge: true,
                    best: true,
                  },
                  { name: "ספק מאומת · BF-5210", price: "₪192", rating: 4.8, badge: true },
                  { name: "ספק מאומת · BF-1864", price: "₪198", rating: 4.7, badge: false },
                ].map((c, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between gap-2 rounded-xl border p-3 transition-colors ${c.best ? "border-emerald-500/40 bg-emerald-500/5 ring-1 ring-emerald-500/20" : "border-border/60 bg-secondary/40 hover:border-primary/40"}`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-xs font-bold">
                        {c.name[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-sm font-semibold">
                          <span className="truncate" dir="ltr">
                            {c.name}
                          </span>
                          {c.badge && <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Star className="h-3 w-3 fill-primary text-primary" /> {c.rating}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-left" dir="ltr">
                        <div
                          className={`text-base font-extrabold ${c.best ? "text-emerald-400" : ""}`}
                        >
                          {c.price}
                        </div>
                        <div className="text-xs text-muted-foreground">לשעה / עובד</div>
                      </div>
                      <span
                        title="הזהות נחשפת רק אחרי בחירת זוכה"
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground ring-1 ring-border/60"
                      >
                        <Lock className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                asChild
                className="mt-5 w-full bg-gradient-primary text-primary-foreground hover:opacity-95"
              >
                <Link to="/signup">פתח חשבון וקבל הצעות</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- LIVE STATS BAR ---------- */
function LiveStatsBar() {
  const stats = [
    { value: "מכרז הפוך", label: "תאגידים מתחרים על המחיר שלך", icon: Users },
    { value: "מאומתים", label: "רק תאגידים שעברו בדיקה", icon: BadgeCheck },
    { value: "< 24h", label: "עד הצעה ראשונה", icon: Clock },
    { value: "₪0", label: "עלות לקבלן", icon: TrendingUp },
  ];
  return (
    <div className="border-y border-primary/20 bg-primary/5">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-0 px-4 md:grid-cols-4 md:px-6">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={`flex items-center gap-3 px-6 py-5 ${i < stats.length - 1 ? "border-l border-primary/15" : ""}`}
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-primary text-primary-foreground shadow-elegant">
              <s.icon className="h-4 w-4" />
            </div>
            <div>
              <div
                dir="ltr"
                className="text-end text-lg font-extrabold leading-none text-foreground md:text-xl"
              >
                {s.value}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">{s.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- COMPETITION ADVANTAGE ---------- */
function CompetitionAdvantage() {
  return (
    <section className="relative overflow-hidden py-16 md:py-20">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      <div className="relative mx-auto max-w-7xl px-4 md:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Gavel,
              title: "תאגיד אחד מפרסם — כולם מתחרים",
              desc: "במקום שאתה תרדוף אחרי הצעות, התאגידים מתחרים זה בזה על הזכות לעבוד איתך.",
            },
            {
              icon: TrendingDown,
              title: "המחיר רק יורד",
              desc: "כל הצעה חדשה רואה את המתחרות ושואפת להיות טובה יותר. אתה מקבל את המחיר האמיתי של השוק.",
            },
            {
              icon: Trophy,
              title: "אתה הבוחר היחיד",
              desc: "מחיר, דירוג, ניסיון, זמינות — אתה מחליט לפי מה שחשוב לך. בלי לחץ, בלי טלפונים.",
            },
          ].map((it) => (
            <div key={it.title} className="enterprise-card hover-lift rounded-2xl p-6">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-elegant">
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

/* ---------- TRUST BAR ---------- */
function TrustBar() {
  const items = [
    {
      icon: ShieldCheck,
      title: "תאגידים מאומתים",
      desc: "רישוי, ביטוח ותעודות נבדקים ידנית לפני אישור.",
    },
    { icon: Lock, title: "אבטחת נתונים", desc: "הצפנה מקצה לקצה והרשאות מבוססות תפקיד (RLS)." },
    { icon: FileCheck2, title: "תיעוד מלא", desc: "כל בקשה, הצעה ובחירה נשמרות עם חותמת זמן." },
    {
      icon: Headphones,
      title: "תמיכה אנושית",
      desc: "ליווי ישיר מצוות BuildForce בכל שלב בתהליך.",
    },
  ];
  return (
    <section className="border-y border-border/60 bg-card/40">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 md:grid-cols-4 md:px-6">
        {items.map((it) => (
          <div key={it.title} className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
              <it.icon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold">{it.title}</div>
              <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{it.desc}</div>
            </div>
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
    {
      n: "02",
      title: "קבל הצעות תחרותיות",
      desc: "תאגידים מאומתים שולחים הצעות איכות ומחיר ברורות.",
    },
    { n: "03", title: "השוואה חכמה", desc: "מחיר, דירוג, זמינות וחוות דעת — הכל במקום אחד." },
    {
      n: "04",
      title: "בחר ספק וצא לדרך",
      desc: "אישור בקליק, חוזה דיגיטלי וצ׳אט מאובטח בפלטפורמה — הכל מתועד ומוגן.",
    },
  ];
  return (
    <section id="how" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <SectionHeader
          eyebrow="התהליך"
          title="ארבעה שלבים. אפס סיבוכים."
          subtitle="תהליך עבודה ישיר ומאובטח שתוכנן לקצב של אתר בנייה אמיתי."
        />

        {/* Timeline layout */}
        <div className="relative mt-16">
          {/* Horizontal connector line — desktop only */}
          <div className="absolute right-[calc(12.5%)] left-[calc(12.5%)] top-8 hidden h-px bg-gradient-to-l from-primary/10 via-primary/50 to-primary/10 lg:block" />

          <div className="grid gap-0 lg:grid-cols-4">
            {steps.map((s, i) => (
              <div key={s.n} className="flex flex-col items-center">
                {/* Vertical connector — mobile only */}
                {i > 0 && (
                  <div className="h-8 w-px bg-gradient-to-b from-primary/50 to-primary/10 lg:hidden" />
                )}

                {/* Circle */}
                <div className="relative z-10 grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-primary text-xl font-extrabold text-primary-foreground shadow-glow transition-transform duration-200 hover:scale-110">
                  {s.n}
                  {/* Outer ring */}
                  <div className="absolute inset-0 rounded-full ring-4 ring-primary/20" />
                </div>

                {/* Content */}
                <div className="mt-5 px-4 text-center">
                  <h3 className="text-lg font-bold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- CATEGORIES ---------- */
function Categories() {
  const cats = [
    { icon: Hammer, name: "טפסנים", desc: "טפסנות מודולרית, יציקות, קונסטרוקציה." },
    { icon: Wrench, name: "ברזלנים", desc: "כיפוף, קשירה, רשתות, מוטות מאמץ." },
    { icon: Layers, name: "רצפים", desc: "קרמיקה, גרניט פורצלן, אבן טבעית." },
    { icon: PaintRoller, name: "טייחים", desc: "טיח פנים, חוץ, שכבות יסוד וגמר." },
    {
      icon: Building2,
      name: "עובדי גמר",
      desc: "גבס, צבע, מסגרות פנים, עבודות עדינות.",
    },
  ];

  return (
    <section id="categories" className="border-y border-border/60 bg-card/30 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        {/* Header row */}
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              תחומי התמחות
            </div>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
              כל בעלי המקצוע. תאגיד אחד.
            </h2>
          </div>
          {/* Value prop pill */}
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 px-6 py-4 text-center">
            <div className="text-lg font-black text-primary">כל מקצועות הבנייה</div>
            <div className="mt-0.5 text-xs text-muted-foreground">בפלטפורמה אחת</div>
          </div>
        </div>

        {/* Category rows */}
        <div className="mt-10 divide-y divide-border/40 rounded-2xl border border-border/60 bg-card">
          {cats.map((c, i) => (
            <div
              key={c.name}
              className="group flex items-center gap-4 px-6 py-5 transition-colors hover:bg-primary/3 first:rounded-t-2xl last:rounded-b-2xl"
            >
              {/* Rank number */}
              <div className="w-6 shrink-0 text-center text-sm font-bold text-muted-foreground">
                {i + 1}
              </div>
              {/* Icon */}
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-elegant">
                <c.icon className="h-5 w-5" />
              </div>
              {/* Name + desc */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="text-lg font-bold">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{c.desc}</span>
                </div>
              </div>
              {/* Verified chip */}
              <div className="shrink-0">
                <span className="status-chip-approved text-xs">מאומת</span>
              </div>
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
    {
      icon: ShieldCheck,
      title: "תאגידים מאומתים בלבד",
      desc: "כל תאגיד עובר בדיקת רישוי, אישורים, ביטוח ותקני בטיחות לפני אישור לפלטפורמה.",
    },
    {
      icon: Zap,
      title: "הצעות במהירות שיא",
      desc: "ממוצע של פחות מ-24 שעות מפרסום בקשה ועד קבלת 3+ הצעות תחרותיות.",
    },
    {
      icon: Star,
      title: "דירוגים אמיתיים",
      desc: "כל דירוג מגיע מקבלן שעבד בפועל. אין דירוגים מזויפים. שקיפות מלאה.",
    },
    {
      icon: Users,
      title: "ניהול במקום אחד",
      desc: "בקשות, חוזים, תקשורת ותשלומים — לוח בקרה אחד נקי לכל הפרויקטים שלך.",
    },
    {
      icon: Clock,
      title: "סטטוס זמינות חי",
      desc: "ראה מי זמין השבוע, החודש, או בתאריך ספציפי — בלי שיחות מיותרות.",
    },
    {
      icon: TrendingUp,
      title: "מחירי שוק שקופים",
      desc: "אנליטיקה מובנית שמראה לך אם ההצעה שקיבלת תחרותית או מחוץ לשוק.",
    },
  ];
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        {/* Split layout: left stats panel + right feature list */}
        <div className="grid items-start gap-12 lg:grid-cols-2">
          {/* Left: headline + proof numbers */}
          <div className="lg:sticky lg:top-24">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              למה BuildForce
            </div>
            <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight md:text-4xl xl:text-5xl">
              הפלטפורמה שתוכננה לקבלנים שלא מתפשרים.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
              לא לוח דרושים זול. תשתית רצינית לענף הבנייה הישראלי.
            </p>

            {/* Proof stats grid */}
            <div className="mt-8 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-5">
                <div className="text-2xl font-black text-primary md:text-3xl">מאומתים</div>
                <div className="mt-1.5 text-sm font-semibold text-foreground">תאגידים מאומתים</div>
                <div className="mt-0.5 text-xs text-muted-foreground">רישוי ביטוח ובטיחות</div>
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-5">
                <div className="text-4xl font-black text-emerald-600 md:text-5xl" dir="ltr">
                  &lt;24h
                </div>
                <div className="mt-1.5 text-sm font-semibold text-foreground">עד הצעה ראשונה</div>
                <div className="mt-0.5 text-xs text-muted-foreground">יעד השירות שלנו</div>
              </div>
              <div className="rounded-2xl border border-border/60 bg-card p-5">
                <div className="text-4xl font-black text-foreground md:text-5xl">₪0</div>
                <div className="mt-1.5 text-sm font-semibold text-foreground">עלות לקבלן</div>
                <div className="mt-0.5 text-xs text-muted-foreground">פרסום ושימוש חינמי</div>
              </div>
              <div className="rounded-2xl border border-border/60 bg-card p-5">
                <div className="text-4xl font-black text-foreground md:text-5xl">3+</div>
                <div className="mt-1.5 text-sm font-semibold text-foreground">הצעות לבקשה</div>
                <div className="mt-0.5 text-xs text-muted-foreground">תחרות אמיתית</div>
              </div>
            </div>
          </div>

          {/* Right: feature list with dividers */}
          <div>
            {items.map((it, i) => (
              <div
                key={it.title}
                className={`flex items-start gap-4 py-5 ${i < items.length - 1 ? "border-b border-border/40" : ""}`}
              >
                <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <it.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-bold">{it.title}</div>
                  <div className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {it.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- SAVINGS ENGINE ---------- */
function SavingsShowcase() {
  return (
    <section id="savings" className="border-y border-border/60 bg-card/30 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <SectionHeader
          eyebrow="מנוע החיסכון"
          title="הבידול האמיתי: אתה רואה בדיוק כמה חסכת."
          subtitle="המכרז ההפוך מוריד את המחיר — ומנוע החיסכון מתרגם את זה למספר אחד מוחשי, על כל הצעה ובסיכום החודשי."
        />

        <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-5">
          {/* Big number */}
          <div className="relative overflow-hidden rounded-3xl border border-savings/25 bg-savings-soft p-8 lg:col-span-3">
            <div className="savings-badge inline-flex items-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5" /> חיסכון חודשי לדוגמה
            </div>
            <div className="mt-4 text-6xl font-black tracking-tight text-savings md:text-7xl">
              <span dir="ltr">₪18,000</span>
              <span className="mr-2 align-middle text-2xl font-bold text-savings/90">
                / חודש
              </span>
            </div>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              לעומת ההצעה היקרה ביותר שקיבלת. כל ₪ של פער, כפול כל שעת עבודה — חוזר אליך.
            </p>
            <div className="mt-6 inline-flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-card/70 px-4 py-3 font-mono text-sm">
              <span className="font-bold">3,000 שעות</span>
              <span className="text-muted-foreground">×</span>
              <span className="font-bold">6 ₪ פער/שעה</span>
              <span className="text-muted-foreground">=</span>
              <span className="font-extrabold text-savings" dir="ltr">
                ₪18,000
              </span>
            </div>
          </div>

          {/* How it shows up */}
          <div className="flex flex-col gap-4 lg:col-span-2">
            <div className="rounded-2xl border border-border/60 bg-card p-5">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Sparkles className="h-4 w-4 text-primary" /> על כל הצעה
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                ”ההצעה הזו זולה ב-6 ₪/שעה מההצעה היקרה ביותר“ — כך הערך מוחשי לכל אורך הדרך.
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card p-5">
              <div className="flex items-center gap-2 text-sm font-bold">
                <FileBarChart className="h-4 w-4 text-primary" /> בסיכום החודשי
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                סך החיסכון שצברת מוצג בשקלים — ומגובה בנתוני נוכחות אמיתיים מהשטח.
              </p>
            </div>
            <Button
              asChild
              className="h-12 bg-gradient-primary text-base font-semibold text-primary-foreground shadow-elegant hover:opacity-95"
            >
              <Link to="/signup">
                התחל לחסוך — חינם לקבלן
                <ArrowLeft className="mr-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- EARLY ACCESS ---------- */
function EarlyAccess() {
  const benefits = [
    {
      icon: BadgeCheck,
      title: "ללא עלות בתקופת ההשקה",
      desc: "קבלנים משתמשים בפלטפורמה ללא עמלה ובלי הגבלת בקשות.",
    },
    {
      icon: Users,
      title: "ליווי אישי",
      desc: "צוות BuildForce מסייע בפרסום הבקשות הראשונות ובאיתור ספקים.",
    },
    {
      icon: TrendingUp,
      title: "השפעה על המוצר",
      desc: "המשובים שלכם מעצבים את הפיצ׳רים הבאים שייצאו לשוק.",
    },
  ];
  return (
    <section id="early-access" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <SectionHeader
          eyebrow="גישה מוקדמת"
          title="אנחנו עכשיו עולים לאוויר."
          subtitle="BuildForce בשלב השקה — מצטרפים מקבלים תנאים מועדפים, ליווי צמוד ויכולת להשפיע על המוצר."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="hover-lift rounded-2xl border border-border/60 bg-card p-6"
            >
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-gradient-primary text-primary-foreground shadow-elegant">
                <b.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold">{b.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.desc}</p>
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
            <Button
              asChild
              size="lg"
              className="h-12 bg-gradient-primary px-7 text-base font-semibold text-primary-foreground shadow-elegant hover:opacity-95"
            >
              <Link to="/new-request">
                פרסם בקשה עכשיו
                <ArrowLeft className="mr-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 border-border bg-card/60 px-7 text-base hover:bg-card"
            >
              <a href="mailto:support@buildforceprime.com" aria-label="צור קשר עם הצוות במייל">
                <Mail className="ml-2 h-4 w-4" /> צור קשר עם הצוות
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- HELPER ---------- */
function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
        {eyebrow}
      </div>
      <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight md:text-5xl text-gradient-primary">
        {title}
      </h2>
      {subtitle && <p className="mt-4 text-base text-muted-foreground md:text-lg">{subtitle}</p>}
    </div>
  );
}

/* ---------- SITE ATTENDANCE & GEOFENCE ---------- */
function SiteAttendance() {
  const steps = [
    {
      icon: MapPin,
      title: "הקבלן מסמן את מיקום האתר",
      desc: "מיד לאחר הזכייה במכרז, הקבלן ממלא את פרטי הפרויקט ומסמן את מיקום האתר על המפה. רק שם תתאפשר רישום כניסה ויציאה.",
    },
    {
      icon: Camera,
      title: "כניסה ויציאה רק באתר",
      desc: 'ראש הצוות לוחץ "פתח יום עבודה" — המערכת מאמתת GPS ומצלמת תמונה חיה עם חותמת זמן ומיקום. אין אפשרות לרשום נוכחות מהבית או מהדרך.',
    },
    {
      icon: ClipboardCheck,
      title: "אישור יומי משני הצדדים",
      desc: "בסוף כל יום הקבלן והתאגיד מאשרים את היום. הרשומה מוקפאת — מקור אמת אחד לשני הצדדים, בלי וויכוחים בסוף החודש.",
    },
    {
      icon: Smile,
      title: "אנחנו דואגים לסדר ולראש שקט",
      desc: "לא רק מספקים פועלים — אנחנו מספקים סדר, תיעוד יומי, דוחות חודשיים מאושרים, וראש שקט אמיתי לשני הצדדים.",
    },
  ];
  return (
    <section className="bg-gradient-to-b from-background to-muted/30 py-20 md:py-28">
      <div className="container mx-auto px-4">
        <SectionHeader
          eyebrow="נוכחות חכמה באתר"
          title="כניסה ויציאה רק מהאתר. אישור יומי משני הצדדים."
          subtitle="חוסכים לקבלן ולתאגיד וויכוחים, טלפונים מיותרים וטעויות אקסל בסוף החודש. הכל מתועד, חתום ומאושר — יום אחר יום."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div
              key={s.title}
              className="group relative rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
                <s.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 grid gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-6 md:grid-cols-3 md:p-8">
          <Benefit
            icon={ShieldCheck}
            title="בלי וויכוחים בסוף החודש"
            desc="כל יום סגור, מאושר ומוקפא. אי אפשר לשנות בדיעבד."
          />
          <Benefit
            icon={FileCheck2}
            title="דוח חודשי אחד אמין"
            desc="שני הצדדים רואים את אותו דוח. מוכן להנהלת חשבונות."
          />
          <Benefit
            icon={Headphones}
            title="ראש שקט אמיתי"
            desc="לא צריך לרדוף אחרי טלפונים, וואטסאפים ותמונות. הכל בפלטפורמה."
          />
        </div>
      </div>
    </section>
  );
}

function Benefit({
  icon: Icon,
  title,
  desc,
}: {
  icon: typeof MapPin;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-muted-foreground">{desc}</div>
      </div>
    </div>
  );
}

/* ---------- PEACE OF MIND — TWO-SIDED VALUE ---------- */
function PeaceOfMind() {
  const contractor = [
    {
      icon: Eye,
      title: "רואה כל יום מי הגיע, מתי ולכמה זמן",
      desc: "תמונה חיה של כל הצוות באתר עם שעה ומיקום. בלי ניחושים, בלי וואטסאפים.",
    },
    {
      icon: AlertTriangle,
      title: "חריגות מדווחות באותו רגע",
      desc: "פועל עזב? צוות יצא באמצע? מקבל התראה מיידית עם הסבר — לפני שזה הופך לדרמה בסוף החודש.",
    },
    {
      icon: FileBarChart,
      title: "דוח חודשי מוכן לחשבונית",
      desc: "כל יום מאושר משני הצדדים. בסוף החודש מוריד דוח אחד אמין — מוכן להנהלת חשבונות.",
    },
    {
      icon: TrendingDown,
      title: "חוסך אלפי שקלים בחודש",
      desc: "פחות שעות סרק, פחות חשבוניות מנופחות, פחות שעות של בירור.",
    },
  ];
  const supplier = [
    {
      icon: BadgeCheck,
      title: "כל יום נסגר ומאושר",
      desc: "ראש הצוות שלך מצלם, מדווח, והקבלן מאשר. אין מה לפרק את החודש בדיעבד.",
    },
    {
      icon: ShieldCheck,
      title: "הוכחת עבודה חתומה דיגיטלית",
      desc: "תמונות חיות + GPS + שעה. אם יש מחלוקת — יש ראיה.",
    },
    {
      icon: MessageCircle,
      title: "פחות שיחות, יותר עבודה",
      desc: "ראש הצוות לוחץ כפתור אחד. הקבלן מקבל הודעת WhatsApp ומאשר. זהו.",
    },
    {
      icon: TrendingUp,
      title: "תזרים ברור וצפוי",
      desc: "יודע בדיוק כמה הוא צובר כל יום. החשבונית בסוף החודש לא מפתיעה אף אחד.",
    },
  ];
  const flow = [
    {
      time: "07:00",
      title: "כניסה לאתר",
      desc: "ראש צוות מצלם תמונה חיה של כל הפועלים + עצמו. GPS מאמת שהוא באתר.",
    },
    {
      time: "07:02",
      title: "התראה למנהל האתר",
      desc: "WhatsApp עם מספר העובדים שהגיעו. אישור בלחיצה.",
    },
    {
      time: "16:00",
      title: "סיום יום",
      desc: "תמונה חיה ביציאה. שני הצדדים מאשרים. הרשומה מוקפאת.",
    },
    { time: "16:01", title: "בלי וויכוחים", desc: "היום נכנס לדוח החודשי המאושר. מקור אמת אחד." },
  ];
  return (
    <section className="bg-background py-20 md:py-28">
      <div className="container mx-auto px-4">
        <SectionHeader
          eyebrow="ראש שקט · סדר מופתי · שקיפות מלאה"
          title="שני הצדדים מרוויחים. כל יום."
          subtitle="לא רק ספקי כוח אדם — אנחנו ספקי סדר. כל יום עבודה נסגר, מאושר ומתועד מבלי שאף אחד יצטרך לרדוף אחרי תמונות בוואטסאפ או לבדוק חשבוניות בלילה."
        />

        {/* Two columns */}
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <SideCard
            icon={HardHat}
            audience="לקבלן"
            headline="שליטה מלאה במה שקורה באתר — בלי לעמוד שם בעצמך"
            color="primary"
            items={contractor}
          />
          <SideCard
            icon={Briefcase}
            audience="לתאגיד כוח האדם"
            headline="הוכחה דיגיטלית לכל יום עבודה — ותזרים שאי אפשר לערער עליו"
            color="emerald"
            items={supplier}
          />
        </div>

        {/* Daily flow strip */}
        <div className="mt-16">
          <h3 className="mb-6 text-center text-2xl font-bold">איך נראה יום עבודה אחד בפלטפורמה</h3>
          <div className="grid gap-4 md:grid-cols-4">
            {flow.map((f, i) => (
              <div key={f.time} className="relative rounded-2xl border border-border bg-card p-5">
                <div className="absolute -top-3 right-5 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                  {f.time}
                </div>
                <div className="mb-2 text-sm font-bold text-primary">שלב {i + 1}</div>
                <div className="font-semibold">{f.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Stat band */}
        <div className="mt-16 grid gap-6 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 md:grid-cols-3 md:p-10">
          <BigStat number="0" label="וויכוחים בסוף החודש" sub="כי הכל אושר ביום עצמו" />
          <BigStat number="100%" label="ימים מתועדים" sub="תמונות חיות, GPS, שעה" />
          <BigStat number="1" label="מקור אמת אחד" sub="לקבלן ולתאגיד באותו דוח" />
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            אנחנו לא רק מחברים בין קבלנים לתאגידי כוח אדם — אנחנו דואגים שהיום-יום שלכם יעבוד בלי
            בלגן, בלי שיחות מיותרות, ובלי הפתעות בסוף החודש.
          </p>
          <Link to="/signup" className="mt-6 inline-block">
            <Button size="lg" className="h-14 px-8 text-base">
              התחל לעבוד עם ראש שקט <ArrowLeft className="mr-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function SideCard({
  icon: Icon,
  audience,
  headline,
  items,
  color,
}: {
  icon: typeof MapPin;
  audience: string;
  headline: string;
  color: "primary" | "emerald";
  items: { icon: typeof MapPin; title: string; desc: string }[];
}) {
  const ring =
    color === "primary"
      ? "ring-primary/30 bg-primary/10 text-primary"
      : "ring-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
      <div className="flex items-center gap-3">
        <div className={`grid h-12 w-12 place-items-center rounded-xl ring-1 ${ring}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {audience}
          </div>
          <div className="text-lg font-bold leading-tight">{headline}</div>
        </div>
      </div>
      <ul className="mt-6 space-y-4">
        {items.map((it) => (
          <li key={it.title} className="flex items-start gap-3">
            <div className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ${ring}`}>
              <it.icon className="h-4 w-4" />
            </div>
            <div>
              <div className="font-semibold">{it.title}</div>
              <div className="text-sm text-muted-foreground">{it.desc}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BigStat({ number, label, sub }: { number: string; label: string; sub: string }) {
  return (
    <div className="text-center">
      <div className="text-5xl font-black text-primary md:text-6xl">{number}</div>
      <div className="mt-2 text-lg font-bold">{label}</div>
      <div className="mt-1 text-sm text-muted-foreground">{sub}</div>
    </div>
  );
}
