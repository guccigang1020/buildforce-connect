import { Link } from "@tanstack/react-router";
import { Flame, ShieldCheck, Users, ArrowLeft, PlayCircle, TrendingDown, Eye } from "lucide-react";
import featureAuction from "@/assets/feature-auction.jpg";
import featureWorkers from "@/assets/feature-workers.jpg";
import featureChat from "@/assets/feature-secure-chat.jpg";
import platformVideo from "@/assets/platform-hero.mp4.asset.json";

const VIDEO_URL = (platformVideo as { url: string }).url;

const FEATURES = [
  {
    eyebrow: "מכרז הפוך · LIVE",
    title: "תאגידים נלחמים על המחיר שלך",
    body: "פותח בקשה אחת — ועשרות תאגידים מתחילים להוריד הצעות זה מול זה. אתה רואה את המחיר יורד בזמן אמת, עם טיימר 48 שעות וגרף חי שמראה כל הורדה.",
    image: featureAuction,
    bullets: [
      { icon: Flame, text: "ספירה לאחור חיה — ככל שמתקרבים לדדליין, ההצעות הופכות אגרסיביות יותר" },
      { icon: TrendingDown, text: "גרף ירידת מחיר אנימטיבי בזמן אמת" },
      { icon: Eye, text: "ראה כמה תאגידים צופים בבקשה שלך עכשיו" },
    ],
    accent: "from-orange-500 to-amber-400",
    glow: "shadow-[0_30px_120px_-20px_rgba(232,93,58,0.55)]",
  },
  {
    eyebrow: "עובדים אמיתיים · ספקים מאומתים",
    title: "פועלים שמגיעים לאתר. נקודה.",
    body: "כל ספק ב-BuildForce עובר אימות מקצועי, ביטוחי ורגולטורי. אם פועל לא הופיע — אנחנו שולחים מחליף תוך 4 שעות, על חשבון התאגיד.",
    image: featureWorkers,
    bullets: [
      { icon: ShieldCheck, text: "ביטוח חוסר-הופעה — מחליף בתוך 4 שעות" },
      { icon: Users, text: "דירוג פועל-לפי-פועל, לא רק תאגיד" },
      { icon: Flame, text: '"Crew Memory" — בקש את אותו צוות שוב בלחיצה' },
    ],
    accent: "from-emerald-500 to-teal-400",
    glow: "shadow-[0_30px_120px_-20px_rgba(45,212,168,0.45)]",
  },
  {
    eyebrow: "צ׳אט מאובטח · אנונימיות מלאה",
    title: "השליטה אצלך — תמיד",
    body: "מספרי טלפון, מיילים וקישורים נחסמים אוטומטית בצ׳אט עד החתימה. שיחות עוברות דרך מספרים וירטואליים שלנו. אף אחד לא עוקף אותך.",
    image: featureChat,
    bullets: [
      { icon: ShieldCheck, text: "מסיכת זהות עד חתימת הסכם" },
      { icon: Flame, text: "חסימה אוטומטית של פרטי קשר חיצוניים" },
      { icon: Eye, text: "Audit trail מלא: זמן, IP, חתימה דיגיטלית" },
    ],
    accent: "from-fuchsia-500 to-violet-400",
    glow: "shadow-[0_30px_120px_-20px_rgba(217,70,239,0.45)]",
  },
];

export function PlatformShowcase() {
  return (
    <section
      id="platform"
      className="relative overflow-hidden border-y border-border/60 py-24 md:py-32"
      style={{
        background:
          "radial-gradient(ellipse at top, color-mix(in oklab, var(--primary) 18%, transparent), transparent 60%), linear-gradient(to bottom, color-mix(in oklab, var(--background) 100%, transparent), color-mix(in oklab, var(--primary) 6%, var(--background)))",
      }}
    >
      {/* Glow orbs */}
      <div className="pointer-events-none absolute -left-32 top-40 h-96 w-96 rounded-full bg-orange-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-40 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 md:px-6">
        {/* Section header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-primary">
            <PlayCircle className="h-3.5 w-3.5" /> פלטפורמה בפעולה
          </div>
          <h2 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight md:text-5xl">
            איך BuildForce{" "}
            <span className="bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-400 bg-clip-text text-transparent">
              משנה את המשחק
            </span>
          </h2>
          <p className="mt-4 text-base text-muted-foreground md:text-lg">
            שלוש מערכות שעובדות יחד כדי שהשליטה תישאר אצלך, והמחיר ימשיך לרדת.
          </p>
        </div>

        {/* Video hero strip */}
        <div className="relative mt-12 overflow-hidden rounded-3xl border border-border/60 shadow-elegant">
          <video
            src={VIDEO_URL}
            className="h-[260px] w-full object-cover md:h-[420px]"
            autoPlay
            muted
            loop
            playsInline
            poster={featureWorkers}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300 backdrop-blur">
              <span className="relative grid h-2 w-2 place-items-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/70" />
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              247 בקשות פעילות עכשיו
            </div>
            <h3 className="mt-3 max-w-2xl text-2xl font-extrabold md:text-4xl">
              קבלן אחד. הצעות אינסוף. מחיר שיורד.
            </h3>
          </div>
        </div>

        {/* Zigzag features */}
        <div className="mt-20 space-y-24 md:space-y-32">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`grid gap-10 md:grid-cols-2 md:items-center md:gap-16 ${i % 2 === 1 ? "md:[&>div:first-child]:order-2" : ""}`}
            >
              {/* Image card */}
              <div
                className={`relative overflow-hidden rounded-3xl border border-border/60 ${f.glow}`}
              >
                <img
                  src={f.image}
                  alt={f.title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  width={1280}
                  height={896}
                />
                <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${f.accent}`} />
                <div className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur">
                  <span className={`h-2 w-2 rounded-full bg-gradient-to-br ${f.accent}`} />
                  {f.eyebrow}
                </div>
              </div>

              {/* Copy */}
              <div>
                <div
                  className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r ${f.accent} bg-clip-text px-0 py-0 text-[11px] font-extrabold uppercase tracking-wider text-transparent`}
                >
                  {f.eyebrow}
                </div>
                <h3 className="mt-2 text-2xl font-extrabold leading-tight md:text-4xl">
                  {f.title}
                </h3>
                <p className="mt-3 text-base text-muted-foreground md:text-lg">{f.body}</p>
                <ul className="mt-6 space-y-3">
                  {f.bullets.map(({ icon: Icon, text }) => (
                    <li
                      key={text}
                      className="flex items-start gap-3 rounded-2xl border border-border/40 bg-card/60 p-3 backdrop-blur-sm"
                    >
                      <span
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${f.accent} text-white shadow-elegant`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="pt-1.5 text-sm font-medium">{text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-24 text-center">
          <Link
            to="/new-request"
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500 px-8 py-4 text-base font-extrabold text-white shadow-elegant transition-transform hover:scale-105"
          >
            פתח בקשה ותראה איך תאגידים נלחמים עליך
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
