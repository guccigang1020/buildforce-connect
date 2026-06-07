import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  BadgeCheck,
  Star,
  MapPin,
  Users,
  Calendar,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  Briefcase,
  Quote,
  Lock,
  FileCheck2,
  Award,
  Clock,
  Zap,
  X,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { getCorporation, REQUESTS } from "@/lib/mock-data";

export const Route = createFileRoute("/corporations/$id")({
  loader: ({ params }) => {
    const corp = getCorporation(params.id);
    if (!corp) throw notFound();
    return { corp };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.corp.name ?? "תאגיד"} — BuildForce` },
      {
        name: "description",
        content: loaderData?.corp.description ?? "תאגיד כוח אדם מאומת ב-BuildForce.",
      },
    ],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 py-24 text-center md:px-6">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-muted/50">
          <Briefcase className="h-10 w-10 text-muted-foreground/40" />
        </div>
        <h1 className="mt-6 text-4xl font-extrabold">תאגיד לא נמצא</h1>
        <p className="mt-3 text-muted-foreground">ייתכן שהקישור שגוי או שהתאגיד הוסר מהפלטפורמה.</p>
        <Button asChild className="mt-6 bg-gradient-primary text-primary-foreground shadow-elegant">
          <Link to="/">חזרה לדף הבית</Link>
        </Button>
      </main>
      <SiteFooter />
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 py-24 text-center md:px-6">
        <h1 className="text-3xl font-extrabold">שגיאה בטעינת התאגיד</h1>
        <p className="mt-3 text-sm text-muted-foreground">{error.message}</p>
      </main>
      <SiteFooter />
    </div>
  ),
  component: CorporationPage,
});

function CorporationPage() {
  const { corp } = Route.useLoaderData();
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const activeRequests = REQUESTS.filter((r) => r.status === "active").slice(0, 3);
  const yearsActive = new Date().getFullYear() - corp.founded;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 md:px-6 md:pt-10">
        {/* Breadcrumb */}
        <Link
          to="/"
          hash="corps"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
          כל התאגידים המאומתים
        </Link>

        {/* ── Hero Card ─────────────────────────────────────────── */}
        <div className="mt-4 overflow-hidden rounded-3xl border border-border/60 bg-card shadow-card">
          {/* Cover */}
          <div className="relative h-36 bg-gradient-to-br from-primary/40 via-primary/15 to-card md:h-48">
            {/* Mesh glows */}
            <div className="absolute -left-10 -top-10 h-48 w-48 rounded-full bg-primary/30 blur-3xl" />
            <div className="absolute -bottom-8 right-12 h-36 w-36 rounded-full bg-primary/20 blur-2xl" />
            {/* Subtle grid */}
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />
            {/* Verified ribbon */}
            {corp.verified && (
              <div className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
                <BadgeCheck className="h-3.5 w-3.5" />
                BuildForce Verified
              </div>
            )}
          </div>

          {/* Avatar + identity */}
          <div className="relative px-6 pb-6 md:px-8 md:pb-8">
            <div className="-mt-12 flex flex-wrap items-end justify-between gap-4">
              <div className="flex items-end gap-5">
                <div className="relative grid h-24 w-24 shrink-0 place-items-center rounded-2xl border-4 border-card bg-gradient-primary text-3xl font-extrabold text-primary-foreground shadow-glow">
                  {corp.name[0]}
                  {corp.verified && (
                    <div className="absolute -bottom-2 -left-2 grid h-7 w-7 place-items-center rounded-full border-2 border-card bg-emerald-500 text-white shadow-sm">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
                <div className="pb-1">
                  <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{corp.name}</h1>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      <span className="font-bold text-foreground">{corp.rating}</span>
                      <span className="text-muted-foreground">({corp.reviews} דירוגים)</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {corp.regions}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> פעיל משנת {corp.founded}
                    </span>
                  </div>
                </div>
              </div>

              {/* Desktop CTA */}
              <div className="hidden flex-col items-end gap-2 sm:flex">
                <Button
                  onClick={() => setShowOfferModal(true)}
                  size="lg"
                  className="h-12 bg-gradient-primary px-6 text-primary-foreground shadow-elegant hover:opacity-95"
                >
                  הגש הצעה
                </Button>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Lock className="h-3 w-3" /> תקשורת מאובטחת דרך הפלטפורמה בלבד
                </div>
              </div>
            </div>
          </div>

          {/* Stats ribbon */}
          <div className="grid grid-cols-2 divide-x divide-x-reverse divide-border/40 border-t border-border/40 md:grid-cols-4">
            {[
              { icon: Users, label: "עובדים זמינים", value: corp.workers },
              { icon: MapPin, label: "אזורי פעילות", value: corp.regions },
              { icon: Star, label: "דירוג ממוצע", value: `${corp.rating} / 5` },
              { icon: Award, label: "שנות ניסיון", value: `${yearsActive}+` },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3 px-5 py-4">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <s.icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-base font-extrabold leading-none">{s.value}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Body ──────────────────────────────────────────────── */}
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* Main content */}
          <div className="space-y-6 lg:col-span-2">
            {/* About */}
            <section className="rounded-2xl border border-border/60 bg-card p-6 md:p-8">
              <h2 className="text-lg font-bold">אודות התאגיד</h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">{corp.description}</p>
              {corp.specialties?.length > 0 && (
                <div className="mt-5">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    תחומי התמחות
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(corp.specialties as string[]).map((s) => (
                      <span
                        key={s}
                        className="rounded-full border border-primary/30 bg-primary/8 px-3 py-1 text-xs font-semibold text-primary"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Certifications */}
            <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 md:p-8">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-bold text-emerald-900">אימות BuildForce</h2>
                  <p className="text-xs text-emerald-700">עבר בדיקות רישוי, ביטוח ובטיחות</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  { icon: FileCheck2, label: "רישיון עסק בתוקף" },
                  { icon: ShieldCheck, label: "ביטוח אחריות מקצועית" },
                  { icon: Award, label: "תקן בטיחות ISO" },
                ].map((c) => (
                  <div
                    key={c.label}
                    className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span className="text-sm font-semibold text-emerald-800">{c.label}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Active tenders */}
            {activeRequests.length > 0 && (
              <section className="rounded-2xl border border-border/60 bg-card p-6 md:p-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">מכרזים פתוחים שמתאימים</h2>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-700">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                    {activeRequests.length} פתוחים
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {activeRequests.map((r) => (
                    <Link
                      key={r.id}
                      to="/requests/$id"
                      params={{ id: r.id }}
                      className="group block rounded-xl border border-border/60 bg-secondary/30 p-4 transition-all hover:border-primary/30 hover:bg-primary/3 hover:shadow-card"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold">
                              {r.count} {r.role}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> פתוח
                            </span>
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {r.location}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> {r.startDate}
                            </span>
                            {r.budget && (
                              <span className="inline-flex items-center gap-1">
                                <TrendingDown className="h-3 w-3 text-emerald-600" />{" "}
                                תקציב: {r.budget}
                              </span>
                            )}
                          </div>
                        </div>
                        <ArrowLeft className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-1 group-hover:text-primary" />
                      </div>
                    </Link>
                  ))}
                </div>
                <Button
                  onClick={() => setShowOfferModal(true)}
                  className="mt-4 w-full bg-gradient-primary text-primary-foreground shadow-elegant"
                >
                  הגש הצעה על אחד מהמכרזים
                </Button>
              </section>
            )}

            {/* Testimonials */}
            <section className="rounded-2xl border border-border/60 bg-card p-6 md:p-8">
              <h2 className="text-lg font-bold">חוות דעת מקבלנים</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {[
                  {
                    quote:
                      "צוות מקצועי שהגיע בזמן ועמד בכל היעדים. אעבוד איתם שוב בלי היסוס. המחיר היה הכי תחרותי שקיבלנו.",
                    name: "אבי ש׳",
                    role: "קבלן ראשי · תל אביב",
                    rating: 5,
                  },
                  {
                    quote:
                      "מחיר תחרותי ושירות יוצא דופן. הצ׳אט המאובטח בפלטפורמה היה זמין לאורך כל הפרויקט. ממליץ בחום.",
                    name: "רונן מ׳",
                    role: "קבלן שיפוצים · חיפה",
                    rating: 5,
                  },
                ].map((t, i) => (
                  <div
                    key={i}
                    className="relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-card via-card to-secondary/20 p-5"
                  >
                    <Quote className="absolute left-4 top-4 h-8 w-8 text-primary/8" />
                    <div className="flex gap-0.5">
                      {Array.from({ length: t.rating }).map((_, j) => (
                        <Star key={j} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-foreground/80">״{t.quote}״</p>
                    <div className="mt-4 flex items-center gap-2.5 border-t border-border/40 pt-4">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-primary text-xs font-bold text-primary-foreground">
                        {t.name[0]}
                      </div>
                      <div>
                        <div className="text-sm font-bold">{t.name}</div>
                        <div className="text-[11px] text-muted-foreground">{t.role}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Mobile CTA */}
            <div className="sm:hidden">
              <Button
                onClick={() => setShowOfferModal(true)}
                size="lg"
                className="w-full bg-gradient-primary text-primary-foreground shadow-elegant"
              >
                הגש הצעה
              </Button>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            {/* Verification card */}
            <div
              className={`rounded-2xl border p-6 ${
                corp.verified
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-amber-500/30 bg-amber-500/5"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
                    corp.verified ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600"
                  }`}
                >
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-bold">
                    {corp.verified ? "תאגיד מאומת BuildForce" : "ממתין לאימות"}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {corp.verified
                      ? "עבר בדיקת רישוי, ביטוח ותקני בטיחות."
                      : "תהליך האימות בעיצומו."}
                  </p>
                </div>
              </div>
              {corp.verified && (
                <div className="mt-4 space-y-2">
                  {["רישיון עסק", "ביטוח אחריות", "תקן בטיחות"].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-xs text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Data card */}
            <div className="rounded-2xl border border-border/60 bg-card p-6">
              <h3 className="mb-4 text-sm font-bold">פרטי התאגיד</h3>
              <ul className="space-y-3">
                {[
                  { icon: Users, label: "עובדים זמינים", value: corp.workers },
                  { icon: MapPin, label: "אזורים", value: corp.regions },
                  { icon: Calendar, label: "פעיל משנת", value: String(corp.founded) },
                  { icon: Star, label: "דירוג ממוצע", value: `${corp.rating} / 5` },
                  { icon: Clock, label: "שנות ניסיון", value: `${yearsActive} שנה` },
                ].map((row) => (
                  <li key={row.label} className="flex items-center justify-between gap-2 text-sm">
                    <span className="inline-flex items-center gap-2 text-muted-foreground">
                      <row.icon className="h-4 w-4 shrink-0" />
                      {row.label}
                    </span>
                    <span className="font-semibold">{row.value}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA card */}
            <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-card p-6 shadow-elegant">
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/20 blur-2xl" />
              <div className="relative">
                <Zap className="h-6 w-6 text-primary" />
                <h3 className="mt-3 font-bold">מוכן לעבוד עם {corp.name}?</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  הגש הצעה תחרותית ב-60 שניות. פרטי הקבלן נחשפים רק לאחר בחירה.
                </p>
                <Button
                  onClick={() => setShowOfferModal(true)}
                  className="mt-4 w-full bg-gradient-primary text-primary-foreground shadow-elegant hover:opacity-95"
                >
                  הגש הצעה עכשיו
                </Button>
                <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                  <Lock className="h-3 w-3" /> אנונימי עד לבחירה
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <SiteFooter />

      {/* ── Offer Modal ──────────────────────────────────────────── */}
      {showOfferModal && !submitted && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-lg rounded-t-3xl border border-border/60 bg-card p-6 shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.4)] sm:rounded-3xl md:p-8">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold">הגשת הצעה</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">ל-{corp.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowOfferModal(false)}
                className="grid h-9 w-9 place-items-center rounded-xl border border-border/60 bg-secondary/40 text-muted-foreground transition-colors hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
                setShowOfferModal(false);
              }}
              className="space-y-4"
            >
              <div>
                <Label className="mb-1.5 block text-xs font-semibold">בקשה לקישור</Label>
                <select
                  className="h-12 w-full rounded-xl border border-input bg-secondary/40 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required
                >
                  <option value="">בחר מכרז...</option>
                  {activeRequests.map((r) => (
                    <option key={r.id} value={r.id}>
                      #{r.id} · {r.count} {r.role} · {r.location}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5 block text-xs font-semibold">מחיר לשעה (₪)</Label>
                  <Input
                    type="number"
                    min="50"
                    max="500"
                    required
                    className="h-12 rounded-xl"
                    placeholder="180"
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs font-semibold">תאריך התחלה</Label>
                  <Input type="date" required className="h-12 rounded-xl" />
                </div>
              </div>

              <div>
                <Label className="mb-1.5 block text-xs font-semibold">הערות (אופציונלי)</Label>
                <Textarea
                  rows={3}
                  maxLength={500}
                  placeholder="פרטים נוספים על הצוות, תנאים מיוחדים..."
                  className="rounded-xl resize-none"
                />
              </div>

              <div className="flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs text-primary">
                <Lock className="h-3.5 w-3.5 shrink-0" />
                ההצעה אנונימית. פרטי הקבלן נחשפים רק לאחר בחירה.
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowOfferModal(false)}>
                  ביטול
                </Button>
                <Button type="submit" className="flex-1 bg-gradient-primary text-primary-foreground shadow-elegant">
                  שלח הצעה
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success toast — shown after modal closes */}
      {submitted && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-card px-5 py-4 shadow-glow">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <div>
              <div className="font-bold">ההצעה נשלחה בהצלחה</div>
              <p className="text-xs text-muted-foreground">הקבלן יקבל הודעה ויוכל להגיב ישירות.</p>
            </div>
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
