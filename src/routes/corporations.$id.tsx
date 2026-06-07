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
        <h1 className="text-4xl font-extrabold">תאגיד לא נמצא</h1>
        <p className="mt-3 text-muted-foreground">ייתכן שהקישור שגוי או שהתאגיד הוסר מהפלטפורמה.</p>
        <Button asChild className="mt-6 bg-gradient-primary text-primary-foreground">
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
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const activeRequests = REQUESTS.filter((r) => r.status === "active").slice(0, 3);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14" dir="rtl">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3 rotate-180" /> חזרה לכל התאגידים
        </Link>

        {/* Header */}
        <div className="mt-6 overflow-hidden rounded-3xl border border-border/60 bg-card shadow-card">
          <div className="relative h-32 bg-gradient-to-br from-primary/30 via-primary/10 to-card md:h-40">
            <div className="absolute -bottom-1 right-0 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
          </div>
          <div className="relative px-6 pb-6 md:px-10 md:pb-8">
            <div className="-mt-12 flex flex-wrap items-end justify-between gap-4">
              <div className="flex items-end gap-4">
                <div className="grid h-24 w-24 place-items-center rounded-2xl border-4 border-card bg-gradient-primary text-3xl font-extrabold text-primary-foreground shadow-elegant">
                  {corp.name[0]}
                </div>
                <div className="pb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-extrabold md:text-3xl">{corp.name}</h1>
                    {corp.verified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">
                        <BadgeCheck className="h-3.5 w-3.5" /> מאומת
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-4 w-4 fill-primary text-primary" /> {corp.rating} (
                      {corp.reviews} דירוגים)
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-4 w-4" /> {corp.regions}
                    </span>
                    <span>· משנת {corp.founded}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex h-11 items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-4 text-xs font-semibold text-primary">
                  <Lock className="h-3.5 w-3.5" /> תקשורת מאובטחת בלבד דרך הפלטפורמה
                </span>
                <Button
                  onClick={() => setShowOfferForm(true)}
                  size="lg"
                  className="h-11 bg-gradient-primary text-primary-foreground shadow-elegant"
                >
                  הגש הצעה
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* About + active requests */}
          <div className="space-y-6 lg:col-span-2">
            <section className="rounded-2xl border border-border/60 bg-card p-6 md:p-8">
              <h2 className="text-lg font-bold">אודות התאגיד</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {corp.description}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {corp.specialties.map((s: string) => (
                  <span
                    key={s}
                    className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </section>

            {showOfferForm && !submitted && (
              <section className="rounded-2xl border border-primary/40 bg-card p-6 shadow-elegant md:p-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">הגשת הצעה ל-{corp.name}</h2>
                  <button
                    onClick={() => setShowOfferForm(false)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    סגור
                  </button>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setSubmitted(true);
                  }}
                  className="mt-5 grid gap-4 md:grid-cols-2"
                >
                  <div className="md:col-span-2">
                    <Label className="mb-2 block">בקשה לקישור</Label>
                    <select
                      className="h-12 w-full rounded-md border border-input bg-background px-3 text-sm"
                      required
                    >
                      <option value="">בחר בקשה...</option>
                      {activeRequests.map((r) => (
                        <option key={r.id} value={r.id}>
                          #{r.id} · {r.count} {r.role} · {r.location}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="mb-2 block">מחיר לשעת עובד (₪)</Label>
                    <Input
                      type="number"
                      min="50"
                      max="500"
                      required
                      className="h-12"
                      placeholder="180"
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block">תאריך התחלה אפשרי</Label>
                    <Input type="date" required className="h-12" />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="mb-2 block">הערות (אופציונלי)</Label>
                    <Textarea
                      rows={3}
                      maxLength={500}
                      placeholder="פרטים נוספים על הצוות, תנאים מיוחדים..."
                    />
                  </div>
                  <div className="md:col-span-2 flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={() => setShowOfferForm(false)}>
                      ביטול
                    </Button>
                    <Button type="submit" className="bg-gradient-primary text-primary-foreground">
                      שלח הצעה
                    </Button>
                  </div>
                </form>
              </section>
            )}

            {submitted && (
              <section className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-400" />
                  <div>
                    <div className="font-bold text-foreground">ההצעה נשלחה בהצלחה</div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      הקבלן יקבל הודעה ויוכל להגיב ישירות. תקבל עדכון במייל ובלוח הבקרה.
                    </p>
                  </div>
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-border/60 bg-card p-6 md:p-8">
              <h2 className="text-lg font-bold">בקשות פעילות שמתאימות</h2>
              <div className="mt-4 space-y-3">
                {activeRequests.map((r) => (
                  <Link
                    key={r.id}
                    to="/requests/$id"
                    params={{ id: r.id }}
                    className="hover-lift block rounded-xl border border-border/60 bg-secondary/40 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground">
                          #{r.id} · {r.postedAt}
                        </div>
                        <div className="mt-1 font-bold">
                          {r.count} {r.role}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {r.location}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {r.startDate}
                          </span>
                          {r.budget && (
                            <span className="inline-flex items-center gap-1">
                              <Briefcase className="h-3 w-3" /> {r.budget}
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowLeft className="h-5 w-5 text-primary" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-border/60 bg-card p-6 md:p-8">
              <h2 className="text-lg font-bold">חוות דעת מקבלנים</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {[
                  {
                    quote: "צוות מקצועי שהגיע בזמן ועמד בכל היעדים. אעבוד איתם שוב בלי היסוס.",
                    name: "אבי ש׳",
                    rating: 5,
                  },
                  {
                    quote:
                      "מחיר תחרותי ושירות יוצא דופן. הצ׳אט המאובטח בפלטפורמה היה זמין לאורך כל הפרויקט.",
                    name: "רונן מ׳",
                    rating: 5,
                  },
                ].map((t, i) => (
                  <div
                    key={i}
                    className="relative rounded-xl border border-border/60 bg-secondary/40 p-5"
                  >
                    <Quote className="absolute left-4 top-4 h-7 w-7 text-primary/15" />
                    <div className="flex gap-0.5">
                      {Array.from({ length: t.rating }).map((_, j) => (
                        <Star key={j} className="h-3.5 w-3.5 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="mt-3 text-sm text-foreground/90">״{t.quote}״</p>
                    <div className="mt-3 text-xs font-semibold text-muted-foreground">
                      — {t.name}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-card p-6">
              <h3 className="text-sm font-bold">נתוני התאגיד</h3>
              <ul className="mt-4 space-y-3 text-sm">
                <SideRow icon={Users} label="עובדים זמינים" value={corp.workers} />
                <SideRow icon={MapPin} label="אזורים" value={corp.regions} />
                <SideRow icon={Calendar} label="פעיל משנת" value={String(corp.founded)} />
                <SideRow icon={Star} label="דירוג ממוצע" value={`${corp.rating} / 5`} />
              </ul>
            </div>
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
              <h3 className="mt-3 text-sm font-bold">
                {corp.verified ? "תאגיד מאומת" : "ממתין לאימות"}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {corp.verified
                  ? "עבר בדיקת רישוי, ביטוח, ותקני בטיחות של BuildForce."
                  : "תהליך האימות בעיצומו. ניתן עדיין לעבוד עם התאגיד באחריות הקבלן."}
              </p>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function SideRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="inline-flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </span>
      <span className="font-semibold">{value}</span>
    </li>
  );
}
