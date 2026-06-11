import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, type ElementType } from "react";
import { useAuth } from "@/hooks/use-auth";
import ConstructionIcon from "@mui/icons-material/Construction";
import LayersIcon from "@mui/icons-material/Layers";
import FormatPaintIcon from "@mui/icons-material/FormatPaint";
import BuildIcon from "@mui/icons-material/Build";
import ApartmentIcon from "@mui/icons-material/Apartment";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import BoltIcon from "@mui/icons-material/Bolt";
import StarIcon from "@mui/icons-material/Star";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import MailOutlineIcon from "@mui/icons-material/MailOutlined";
import GroupIcon from "@mui/icons-material/Group";
import ScheduleIcon from "@mui/icons-material/Schedule";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import VerifiedIcon from "@mui/icons-material/Verified";
import LockIcon from "@mui/icons-material/Lock";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import GavelIcon from "@mui/icons-material/Gavel";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import PlaceIcon from "@mui/icons-material/Place";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import SentimentSatisfiedIcon from "@mui/icons-material/SentimentSatisfied";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutlined";
import AssessmentIcon from "@mui/icons-material/Assessment";
import EngineeringIcon from "@mui/icons-material/Engineering";
import WorkIcon from "@mui/icons-material/Work";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero-construction.jpg";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { PlatformShowcase } from "@/components/platform-showcase";

export const Route = createFileRoute("/")({
  component: Home,
});

// Role-aware primary CTA: logged-out visitors go to signup (never to a
// protected page that bounces them with an error); logged-in users go to the
// action that fits their single role.
function usePrimaryCta(): "/signup" | "/admin" | "/corporation-dashboard" | "/new-request" {
  const { session, hasRole } = useAuth();
  if (!session) return "/signup";
  if (hasRole("admin")) return "/admin";
  if (hasRole("corporation")) return "/corporation-dashboard";
  return "/new-request";
}

function Home() {
  // Logged-in users may browse the landing page freely — the nav and CTAs
  // route them to their own area (the old auto-redirect bounced admins
  // through the contractor dashboard and broke back-navigation).
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
  const heroCta = usePrimaryCta();
  return (
    <section className="relative overflow-hidden">
      {/* Background image with flat overlay */}
      <div className="absolute inset-0">
        <img
          src={heroImg}
          alt="אתר בנייה"
          className="h-full w-full object-cover opacity-20"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-background/80" />
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 md:px-6 md:py-28 lg:grid-cols-12 lg:py-32">
        <div className="lg:col-span-7">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/8 px-4 py-1.5 text-xs font-semibold text-primary animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            מכרז חי · תאגידים נלחמים על העבודה שלך
          </div>
          <h1 className="text-display animate-fade-in">
            הם נלחמים.
            <br />
            <span className="text-gradient-accent">אתה מרוויח.</span>
            <br />
            <span className="opacity-90">במחיר הכי נמוך.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
            פרסם בקשה אחת — תאגידי כוח אדם מאומתים מתחרים על הזכות לעבוד איתך. כל הצעה חדשה דוחפת את
            המחיר למטה. שקיפות מלאה, החלטה אצלך, ללא עמלה לקבלן.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-12 px-8 text-base font-semibold shadow-elegant">
              <Link to={heroCta}>
                פרסם בקשת כוח אדם
                <ArrowBackIcon sx={{ fontSize: 16 }} className="mr-2 transition-transform group-hover:-translate-x-1" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 px-8 text-base font-semibold"
            >
              <Link to="/" hash="how">
                איך זה עובד
              </Link>
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <CheckCircleIcon sx={{ fontSize: 16 }} className="text-primary" /> שימוש חינם לקבלנים
            </span>
            <span className="inline-flex items-center gap-2">
              <CheckCircleIcon sx={{ fontSize: 16 }} className="text-primary" /> תאגידים מאומתים בלבד
            </span>
            <span className="inline-flex items-center gap-2">
              <CheckCircleIcon sx={{ fontSize: 16 }} className="text-primary" /> נתונים מאובטחים בתקן בנקאי
            </span>
          </div>
        </div>

        {/* Sample request card — masked-bidders hero card */}
        <div className="lg:col-span-5">
          <div className="relative rounded-2xl border border-border bg-card p-6 shadow-sm animate-fade-in">
            <div className="absolute -top-3 right-6 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-foreground opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-foreground" />
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
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <ConstructionIcon sx={{ fontSize: 20 }} />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/8 px-3 py-2 text-xs font-semibold text-status-approved">
              <span className="inline-flex items-center gap-1.5">
                <TrendingDownIcon sx={{ fontSize: 14 }} /> המחיר ירד ב-7% מאז הפרסום
              </span>
              <span dir="ltr" className="savings-badge">
                חיסכון: ₪14/שעה
              </span>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span>הצעות שהתקבלו · 4</span>
                <span className="inline-flex items-center gap-1 normal-case text-status-approved">
                  <EmojiEventsIcon sx={{ fontSize: 12 }} /> מובילה
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
                  className={`flex items-center justify-between gap-2 rounded-lg border p-3 transition-colors ${c.best ? "border-emerald-500/40 bg-emerald-500/10" : "border-border/60 bg-secondary/40 hover:border-primary/40"}`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-muted text-xs font-bold">
                      {c.name[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-sm font-semibold">
                        <span className="truncate" dir="ltr">
                          {c.name}
                        </span>
                        {c.badge && <VerifiedIcon sx={{ fontSize: 16 }} className="shrink-0 text-primary" />}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <StarIcon sx={{ fontSize: 12 }} className="text-primary" /> {c.rating}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-left" dir="ltr">
                      <div
                        className={`text-base font-bold tabular-nums ${c.best ? "text-status-approved" : ""}`}
                      >
                        {c.price}
                      </div>
                      <div className="text-xs text-muted-foreground">לשעה / עובד</div>
                    </div>
                    <span
                      title="הזהות נחשפת רק אחרי בחירת זוכה"
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-secondary text-muted-foreground ring-1 ring-border/60"
                    >
                      <LockIcon sx={{ fontSize: 16 }} />
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <Button asChild className="mt-5 w-full">
              <Link to="/signup">פתח חשבון וקבל הצעות</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- LIVE STATS BAR ---------- */
function LiveStatsBar() {
  const stats = [
    { value: "מכרז הפוך", label: "תאגידים מתחרים על המחיר שלך", icon: GroupIcon },
    { value: "מאומתים", label: "רק תאגידים שעברו בדיקה", icon: VerifiedIcon },
    { value: "< 24h", label: "עד הצעה ראשונה", icon: ScheduleIcon },
    { value: "₪0", label: "עלות לקבלן", icon: TrendingUpIcon },
  ];
  return (
    <div className="border-y border-border bg-card/50">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-0 px-4 md:grid-cols-4 md:px-6">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={`flex items-center gap-3 px-6 py-5 ${i < stats.length - 1 ? "border-l border-border/60" : ""}`}
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <s.icon sx={{ fontSize: 16 }} />
            </div>
            <div>
              <div
                dir="ltr"
                className="text-end text-lg font-bold leading-none text-foreground md:text-xl"
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
    <section className="section-pad">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: GavelIcon,
              title: "תאגיד אחד מפרסם — כולם מתחרים",
              desc: "במקום שאתה תרדוף אחרי הצעות, התאגידים מתחרים זה בזה על הזכות לעבוד איתך.",
            },
            {
              icon: TrendingDownIcon,
              title: "המחיר רק יורד",
              desc: "כל הצעה חדשה רואה את המתחרות ושואפת להיות טובה יותר. אתה מקבל את המחיר האמיתי של השוק.",
            },
            {
              icon: EmojiEventsIcon,
              title: "אתה הבוחר היחיד",
              desc: "מחיר, דירוג, ניסיון, זמינות — אתה מחליט לפי מה שחשוב לך. בלי לחץ, בלי טלפונים.",
            },
          ].map((it) => (
            <div key={it.title} className="enterprise-card rounded-2xl p-6">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <it.icon sx={{ fontSize: 20 }} />
              </div>
              <h3 className="mt-4 text-base font-semibold">{it.title}</h3>
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
      icon: VerifiedUserIcon,
      title: "תאגידים מאומתים",
      desc: "רישוי, ביטוח ותעודות נבדקים ידנית לפני אישור.",
    },
    { icon: LockIcon, title: "אבטחת נתונים", desc: "הצפנה מקצה לקצה והרשאות מבוססות תפקיד (RLS)." },
    { icon: FactCheckIcon, title: "תיעוד מלא", desc: "כל בקשה, הצעה ובחירה נשמרות עם חותמת זמן." },
    {
      icon: SupportAgentIcon,
      title: "תמיכה אנושית",
      desc: "ליווי ישיר מצוות BuildForce בכל שלב בתהליך.",
    },
  ];
  return (
    <section className="border-y border-border/60 bg-card/40">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 md:grid-cols-4 md:px-6">
        {items.map((it) => (
          <div key={it.title} className="flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <it.icon sx={{ fontSize: 16 }} />
            </div>
            <div>
              <div className="text-sm font-semibold">{it.title}</div>
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
    <section id="how" className="section-pad">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <SectionHeader
          eyebrow="התהליך"
          title="ארבעה שלבים. אפס סיבוכים."
          subtitle="תהליך עבודה ישיר ומאובטח שתוכנן לקצב של אתר בנייה אמיתי."
        />

        <div className="relative mt-16">
          {/* Horizontal connector line — desktop only */}
          <div className="absolute right-[calc(12.5%)] left-[calc(12.5%)] top-8 hidden h-px bg-border lg:block" />

          <div className="grid gap-0 lg:grid-cols-4">
            {steps.map((s, i) => (
              <div key={s.n} className="flex flex-col items-center">
                {i > 0 && (
                  <div className="h-8 w-px bg-border lg:hidden" />
                )}

                <div className="relative z-10 grid h-16 w-16 shrink-0 place-items-center rounded-full bg-primary text-xl font-bold text-primary-foreground transition-transform duration-200 hover:scale-105">
                  {s.n}
                </div>

                <div className="mt-5 px-4 text-center">
                  <h3 className="text-base font-semibold">{s.title}</h3>
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
    { icon: ConstructionIcon, name: "טפסנים", desc: "טפסנות מודולרית, יציקות, קונסטרוקציה." },
    { icon: BuildIcon, name: "ברזלנים", desc: "כיפוף, קשירה, רשתות, מוטות מאמץ." },
    { icon: LayersIcon, name: "רצפים", desc: "קרמיקה, גרניט פורצלן, אבן טבעית." },
    { icon: FormatPaintIcon, name: "טייחים", desc: "טיח פנים, חוץ, שכבות יסוד וגמר." },
    {
      icon: ApartmentIcon,
      name: "עובדי גמר",
      desc: "גבס, צבע, מסגרות פנים, עבודות עדינות.",
    },
  ];

  return (
    <section id="categories" className="border-y border-border/60 bg-card/30 section-pad">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">
              תחומי התמחות
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">
              כל בעלי המקצוע. תאגיד אחד.
            </h2>
          </div>
          <div className="rounded-lg border border-border bg-card px-6 py-4 text-center">
            <div className="text-base font-bold text-primary">כל מקצועות הבנייה</div>
            <div className="mt-0.5 text-xs text-muted-foreground">בפלטפורמה אחת</div>
          </div>
        </div>

        <div className="mt-10 divide-y divide-border/40 rounded-xl border border-border bg-card">
          {cats.map((c, i) => (
            <div
              key={c.name}
              className="group flex items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/30 first:rounded-t-xl last:rounded-b-xl"
            >
              <div className="w-6 shrink-0 text-center text-sm font-medium text-muted-foreground">
                {i + 1}
              </div>
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <c.icon sx={{ fontSize: 16 }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="text-sm font-semibold">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{c.desc}</span>
                </div>
              </div>
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
      icon: VerifiedUserIcon,
      title: "תאגידים מאומתים בלבד",
      desc: "כל תאגיד עובר בדיקת רישוי, אישורים, ביטוח ותקני בטיחות לפני אישור לפלטפורמה.",
    },
    {
      icon: BoltIcon,
      title: "הצעות במהירות שיא",
      desc: "ממוצע של פחות מ-24 שעות מפרסום בקשה ועד קבלת 3+ הצעות תחרותיות.",
    },
    {
      icon: StarIcon,
      title: "דירוגים אמיתיים",
      desc: "כל דירוג מגיע מקבלן שעבד בפועל. אין דירוגים מזויפים. שקיפות מלאה.",
    },
    {
      icon: GroupIcon,
      title: "ניהול במקום אחד",
      desc: "בקשות, חוזים, תקשורת ותשלומים — לוח בקרה אחד נקי לכל הפרויקטים שלך.",
    },
    {
      icon: ScheduleIcon,
      title: "סטטוס זמינות חי",
      desc: "ראה מי זמין השבוע, החודש, או בתאריך ספציפי — בלי שיחות מיותרות.",
    },
    {
      icon: TrendingUpIcon,
      title: "מחירי שוק שקופים",
      desc: "אנליטיקה מובנית שמראה לך אם ההצעה שקיבלת תחרותית או מחוץ לשוק.",
    },
  ];
  return (
    <section className="section-pad">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="grid items-start gap-12 lg:grid-cols-2">
          <div className="lg:sticky lg:top-24">
            <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">
              למה BuildForce
            </div>
            <h2 className="mt-4 text-2xl font-bold leading-tight tracking-tight md:text-3xl xl:text-4xl">
              הפלטפורמה שתוכננה לקבלנים שלא מתפשרים.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              לא לוח דרושים זול. תשתית רצינית לענף הבנייה הישראלי.
            </p>

            {/* Proof stats grid */}
            <div className="mt-8 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-card p-5">
                <div className="text-2xl font-bold text-primary">מאומתים</div>
                <div className="mt-1.5 text-sm font-semibold text-foreground">תאגידים מאומתים</div>
                <div className="mt-0.5 text-xs text-muted-foreground">רישוי ביטוח ובטיחות</div>
              </div>
              <div className="rounded-lg border border-border bg-card p-5">
                <div className="text-2xl font-bold text-status-approved md:text-3xl tabular-nums" dir="ltr">
                  &lt;24h
                </div>
                <div className="mt-1.5 text-sm font-semibold text-foreground">עד הצעה ראשונה</div>
                <div className="mt-0.5 text-xs text-muted-foreground">יעד השירות שלנו</div>
              </div>
              <div className="rounded-lg border border-border bg-card p-5">
                <div className="text-3xl font-bold text-foreground tabular-nums">₪0</div>
                <div className="mt-1.5 text-sm font-semibold text-foreground">עלות לקבלן</div>
                <div className="mt-0.5 text-xs text-muted-foreground">פרסום ושימוש חינמי</div>
              </div>
              <div className="rounded-lg border border-border bg-card p-5">
                <div className="text-3xl font-bold text-foreground tabular-nums">3+</div>
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
                <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <it.icon sx={{ fontSize: 16 }} />
                </div>
                <div>
                  <div className="text-sm font-semibold">{it.title}</div>
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
    <section id="savings" className="border-y border-border/60 bg-card/30 section-pad">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <SectionHeader
          eyebrow="מנוע החיסכון"
          title="הבידול האמיתי: אתה רואה בדיוק כמה חסכת."
          subtitle="המכרז ההפוך מוריד את המחיר — ומנוע החיסכון מתרגם את זה למספר אחד מוחשי, על כל הצעה ובסיכום החודשי."
        />

        <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-5">
          {/* Big number — the ONLY hero-sized orange metric on screen */}
          <div className="relative overflow-hidden rounded-2xl border border-savings/25 bg-savings-soft p-8 lg:col-span-3">
            <div className="savings-badge inline-flex items-center gap-1.5">
              <TrendingDownIcon sx={{ fontSize: 14 }} /> חיסכון חודשי לדוגמה
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
            <div className="mt-6 inline-flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-card/70 px-4 py-3 font-mono text-sm">
              <span className="font-bold">3,000 שעות</span>
              <span className="text-muted-foreground">×</span>
              <span className="font-bold">6 ₪ פער/שעה</span>
              <span className="text-muted-foreground">=</span>
              <span className="font-bold text-savings" dir="ltr">
                ₪18,000
              </span>
            </div>
          </div>

          {/* How it shows up */}
          <div className="flex flex-col gap-4 lg:col-span-2">
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <AutoAwesomeIcon sx={{ fontSize: 16 }} className="text-primary" /> על כל הצעה
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                "ההצעה הזו זולה ב-6 ₪/שעה מההצעה היקרה ביותר" — כך הערך מוחשי לכל אורך הדרך.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <AssessmentIcon sx={{ fontSize: 16 }} className="text-primary" /> בסיכום החודשי
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                סך החיסכון שצברת מוצג בשקלים — ומגובה בנתוני נוכחות אמיתיים מהשטח.
              </p>
            </div>
            <Button asChild size="lg" className="h-12 text-sm font-semibold">
              <Link to="/signup">
                התחל לחסוך — חינם לקבלן
                <ArrowBackIcon sx={{ fontSize: 16 }} className="mr-2" />
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
      icon: VerifiedIcon,
      title: "ללא עלות בתקופת ההשקה",
      desc: "קבלנים משתמשים בפלטפורמה ללא עמלה ובלי הגבלת בקשות.",
    },
    {
      icon: GroupIcon,
      title: "ליווי אישי",
      desc: "צוות BuildForce מסייע בפרסום הבקשות הראשונות ובאיתור ספקים.",
    },
    {
      icon: TrendingUpIcon,
      title: "השפעה על המוצר",
      desc: "המשובים שלכם מעצבים את הפיצ׳רים הבאים שייצאו לשוק.",
    },
  ];
  return (
    <section id="early-access" className="section-pad">
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
              className="enterprise-card rounded-xl p-6"
            >
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <b.icon sx={{ fontSize: 20 }} />
              </div>
              <h3 className="mt-4 text-base font-semibold">{b.title}</h3>
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
  const bannerCta = usePrimaryCta();
  return (
    <section className="px-4 pb-20 md:px-6 md:pb-28">
      <div className="mx-auto max-w-7xl rounded-2xl border border-border bg-card p-8 md:p-14">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-2xl font-bold leading-tight md:text-4xl">
              מוכן לקבל את הצוות הבא שלך?
            </h2>
            <p className="mt-4 max-w-lg text-base text-muted-foreground">
              פרסום בקשה לוקח 60 שניות. הצעות הראשונות מגיעות תוך שעות. פתיחת חשבון חינם.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Button asChild size="lg" className="h-12 px-7 text-base font-semibold">
              <Link to={bannerCta}>
                פרסם בקשה עכשיו
                <ArrowBackIcon sx={{ fontSize: 16 }} className="mr-2" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 px-7 text-base"
            >
              <a href="mailto:support@buildforceprime.com" aria-label="צור קשר עם הצוות במייל">
                <MailOutlineIcon sx={{ fontSize: 16 }} className="ml-2" /> צור קשר עם הצוות
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
      <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">
        {eyebrow}
      </div>
      <h2 className="mt-4 text-2xl font-bold leading-tight tracking-tight md:text-3xl">
        {title}
      </h2>
      {subtitle && <p className="mt-4 text-base text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

/* ---------- SITE ATTENDANCE & GEOFENCE ---------- */
function SiteAttendance() {
  const steps = [
    {
      icon: PlaceIcon,
      title: "הקבלן מסמן את מיקום האתר",
      desc: "מיד לאחר הזכייה במכרז, הקבלן ממלא את פרטי הפרויקט ומסמן את מיקום האתר על המפה. רק שם תתאפשר רישום כניסה ויציאה.",
    },
    {
      icon: PhotoCameraIcon,
      title: "כניסה ויציאה רק באתר",
      desc: 'ראש הצוות לוחץ "פתח יום עבודה" — המערכת מאמתת GPS ומצלמת תמונה חיה עם חותמת זמן ומיקום. אין אפשרות לרשום נוכחות מהבית או מהדרך.',
    },
    {
      icon: AssignmentTurnedInIcon,
      title: "אישור יומי משני הצדדים",
      desc: "בסוף כל יום הקבלן והתאגיד מאשרים את היום. הרשומה מוקפאת — מקור אמת אחד לשני הצדדים, בלי וויכוחים בסוף החודש.",
    },
    {
      icon: SentimentSatisfiedIcon,
      title: "אנחנו דואגים לסדר ולראש שקט",
      desc: "לא רק מספקים פועלים — אנחנו מספקים סדר, תיעוד יומי, דוחות חודשיים מאושרים, וראש שקט אמיתי לשני הצדדים.",
    },
  ];
  return (
    <section className="bg-muted/10 section-pad">
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
              className="enterprise-card rounded-xl p-6 transition-all hover:-translate-y-1"
            >
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <s.icon sx={{ fontSize: 20 }} />
              </div>
              <h3 className="mt-4 text-sm font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 grid gap-4 rounded-xl border border-border bg-card p-6 md:grid-cols-3 md:p-8">
          <Benefit
            icon={VerifiedUserIcon}
            title="בלי וויכוחים בסוף החודש"
            desc="כל יום סגור, מאושר ומוקפא. אי אפשר לשנות בדיעבד."
          />
          <Benefit
            icon={FactCheckIcon}
            title="דוח חודשי אחד אמין"
            desc="שני הצדדים רואים את אותו דוח. מוכן להנהלת חשבונות."
          />
          <Benefit
            icon={SupportAgentIcon}
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
  icon: ElementType;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon sx={{ fontSize: 16 }} />
      </div>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-0.5 text-sm text-muted-foreground">{desc}</div>
      </div>
    </div>
  );
}

/* ---------- PEACE OF MIND — TWO-SIDED VALUE ---------- */
function PeaceOfMind() {
  const contractor = [
    {
      icon: VisibilityIcon,
      title: "רואה כל יום מי הגיע, מתי ולכמה זמן",
      desc: "תמונה חיה של כל הצוות באתר עם שעה ומיקום. בלי ניחושים, בלי וואטסאפים.",
    },
    {
      icon: WarningAmberIcon,
      title: "חריגות מדווחות באותו רגע",
      desc: "פועל עזב? צוות יצא באמצע? מקבל התראה מיידית עם הסבר — לפני שזה הופך לדרמה בסוף החודש.",
    },
    {
      icon: AssessmentIcon,
      title: "דוח חודשי מוכן לחשבונית",
      desc: "כל יום מאושר משני הצדדים. בסוף החודש מוריד דוח אחד אמין — מוכן להנהלת חשבונות.",
    },
    {
      icon: TrendingDownIcon,
      title: "חוסך אלפי שקלים בחודש",
      desc: "פחות שעות סרק, פחות חשבוניות מנופחות, פחות שעות של בירור.",
    },
  ];
  const supplier = [
    {
      icon: VerifiedIcon,
      title: "כל יום נסגר ומאושר",
      desc: "ראש הצוות שלך מצלם, מדווח, והקבלן מאשר. אין מה לפרק את החודש בדיעבד.",
    },
    {
      icon: VerifiedUserIcon,
      title: "הוכחת עבודה חתומה דיגיטלית",
      desc: "תמונות חיות + GPS + שעה. אם יש מחלוקת — יש ראיה.",
    },
    {
      icon: ChatBubbleOutlineIcon,
      title: "פחות שיחות, יותר עבודה",
      desc: "ראש הצוות לוחץ כפתור אחד. הקבלן מקבל הודעת WhatsApp ומאשר. זהו.",
    },
    {
      icon: TrendingUpIcon,
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
    <section className="bg-background section-pad">
      <div className="container mx-auto px-4">
        <SectionHeader
          eyebrow="ראש שקט · סדר מופתי · שקיפות מלאה"
          title="שני הצדדים מרוויחים. כל יום."
          subtitle="לא רק ספקי כוח אדם — אנחנו ספקי סדר. כל יום עבודה נסגר, מאושר ומתועד מבלי שאף אחד יצטרך לרדוף אחרי תמונות בוואטסאפ או לבדוק חשבוניות בלילה."
        />

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <SideCard
            icon={EngineeringIcon}
            audience="לקבלן"
            headline="שליטה מלאה במה שקורה באתר — בלי לעמוד שם בעצמך"
            color="primary"
            items={contractor}
          />
          <SideCard
            icon={WorkIcon}
            audience="לתאגיד כוח האדם"
            headline="הוכחה דיגיטלית לכל יום עבודה — ותזרים שאי אפשר לערער עליו"
            color="emerald"
            items={supplier}
          />
        </div>

        {/* Daily flow strip */}
        <div className="mt-16">
          <h3 className="mb-6 text-center text-lg font-semibold">איך נראה יום עבודה אחד בפלטפורמה</h3>
          <div className="grid gap-4 md:grid-cols-4">
            {flow.map((f, i) => (
              <div key={f.time} className="relative rounded-xl border border-border bg-card p-5">
                <div className="absolute -top-3 right-5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  {f.time}
                </div>
                <div className="mb-2 text-xs font-medium text-muted-foreground">שלב {i + 1}</div>
                <div className="text-sm font-semibold">{f.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Stat band */}
        <div className="mt-16 grid gap-6 rounded-xl border border-border bg-card p-6 md:grid-cols-3 md:p-10">
          <BigStat number="0" label="וויכוחים בסוף החודש" sub="כי הכל אושר ביום עצמו" />
          <BigStat number="100%" label="ימים מתועדים" sub="תמונות חיות, GPS, שעה" />
          <BigStat number="1" label="מקור אמת אחד" sub="לקבלן ולתאגיד באותו דוח" />
        </div>

        <div className="mt-12 text-center">
          <p className="mx-auto max-w-2xl text-base text-muted-foreground">
            אנחנו לא רק מחברים בין קבלנים לתאגידי כוח אדם — אנחנו דואגים שהיום-יום שלכם יעבוד בלי
            בלגן, בלי שיחות מיותרות, ובלי הפתעות בסוף החודש.
          </p>
          <Link to="/signup" className="mt-6 inline-block">
            <Button size="lg" className="h-12 px-8 text-base">
              התחל לעבוד עם ראש שקט <ArrowBackIcon sx={{ fontSize: 20 }} className="mr-2" />
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
  icon: ElementType;
  audience: string;
  headline: string;
  color: "primary" | "emerald";
  items: { icon: ElementType; title: string; desc: string }[];
}) {
  const iconCls =
    color === "primary"
      ? "bg-primary/10 text-primary"
      : "bg-emerald-500/10 text-status-approved";
  return (
    <div className="enterprise-card rounded-xl p-6 md:p-8">
      <div className="flex items-center gap-3">
        <div className={`grid h-10 w-10 place-items-center rounded-lg ${iconCls}`}>
          <Icon sx={{ fontSize: 20 }} />
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {audience}
          </div>
          <div className="text-base font-semibold leading-tight">{headline}</div>
        </div>
      </div>
      <ul className="mt-6 space-y-4">
        {items.map((it) => (
          <li key={it.title} className="flex items-start gap-3">
            <div className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${iconCls}`}>
              <it.icon sx={{ fontSize: 16 }} />
            </div>
            <div>
              <div className="text-sm font-semibold">{it.title}</div>
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
      <div className="text-4xl font-bold text-primary tabular-nums">{number}</div>
      <div className="mt-2 text-base font-semibold">{label}</div>
      <div className="mt-1 text-sm text-muted-foreground">{sub}</div>
    </div>
  );
}
