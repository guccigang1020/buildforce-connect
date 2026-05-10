import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft, ArrowRight, CheckCircle2, MapPin, Calendar, Users,
  Briefcase, FileText, Sparkles, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { ROLES, CITIES } from "@/lib/mock-data";

export const Route = createFileRoute("/new-request")({
  head: () => ({
    meta: [
      { title: "פרסום בקשת כוח אדם — BuildForce" },
      { name: "description", content: "פרסם בקשה ל-60 שניות וקבל הצעות מתאגידי כוח אדם מאומתים תוך שעות." },
    ],
  }),
  component: NewRequestPage,
});

type FormState = {
  role: string;
  count: string;
  location: string;
  startDate: string;
  duration: string;
  budget: string;
  description: string;
  contactName: string;
  contactPhone: string;
};

const STEPS = [
  { n: 1, label: "תחום וכמות" },
  { n: 2, label: "מיקום ולו״ז" },
  { n: 3, label: "תקציב ופרטים" },
  { n: 4, label: "פרטי קשר" },
];

function NewRequestPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<FormState>({
    role: "",
    count: "",
    location: "",
    startDate: "",
    duration: "",
    budget: "",
    description: "",
    contactName: "",
    contactPhone: "",
  });

  const update = (k: keyof FormState, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const canNext = () => {
    if (step === 1) return form.role && form.count;
    if (step === 2) return form.location && form.startDate && form.duration;
    if (step === 3) return true;
    if (step === 4) return form.contactName && form.contactPhone;
    return false;
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SiteNav />
        <main className="mx-auto flex max-w-3xl flex-col items-center px-4 py-20 text-center md:px-6 md:py-28">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-primary/15">
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </div>
          <h1 className="mt-6 text-3xl font-extrabold md:text-4xl">הבקשה פורסמה בהצלחה</h1>
          <p className="mt-3 max-w-md text-muted-foreground">
            תאגידים מאומתים יקבלו את הבקשה ויחלו לשלוח הצעות תוך שעות. נעדכן אותך
            ב-WhatsApp ובלוח הבקרה.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground shadow-elegant">
              <Link to="/dashboard">לצפייה בלוח הבקרה</Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                setSubmitted(false);
                setStep(1);
                setForm({
                  role: "", count: "", location: "", startDate: "", duration: "",
                  budget: "", description: "", contactName: "", contactPhone: "",
                });
              }}
            >
              פרסום בקשה נוספת
            </Button>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-5xl px-4 py-12 md:px-6 md:py-16">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5" /> 60 שניות לפרסום בקשה
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl">
          ספר לנו מה אתה צריך,
          <br />
          <span className="text-gradient-primary">והתאגידים יבואו אליך.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          ארבעה שלבים מהירים. הבקשה תישלח רק לתאגידים מאומתים שמתאימים לתחום ולמיקום.
        </p>

        {/* Stepper */}
        <div className="mt-10 grid grid-cols-4 gap-2">
          {STEPS.map((s) => (
            <div key={s.n} className="flex flex-col items-center gap-2">
              <div
                className={`grid h-9 w-9 place-items-center rounded-full text-sm font-bold transition-colors ${
                  s.n <= step
                    ? "bg-gradient-primary text-primary-foreground shadow-elegant"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {s.n < step ? <CheckCircle2 className="h-4 w-4" /> : s.n}
              </div>
              <div className={`text-center text-[11px] font-medium md:text-xs ${s.n <= step ? "text-foreground" : "text-muted-foreground"}`}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-gradient-primary transition-all duration-500"
            style={{ width: `${(step / STEPS.length) * 100}%` }}
          />
        </div>

        <form onSubmit={onSubmit} className="mt-10 grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-card lg:col-span-2 md:p-8">
            {step === 1 && (
              <div className="space-y-6">
                <StepHeader icon={Briefcase} title="איזה צוות אתה צריך?" subtitle="בחר תחום וכמות עובדים." />
                <div>
                  <Label className="mb-2 block">תחום התמחות</Label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {ROLES.map((r) => (
                      <button
                        type="button"
                        key={r}
                        onClick={() => update("role", r)}
                        className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                          form.role === r
                            ? "border-primary bg-primary/15 text-foreground"
                            : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="count" className="mb-2 block">כמות עובדים</Label>
                  <Input id="count" type="number" min="1" max="200" placeholder="לדוגמה: 7" value={form.count} onChange={(e) => update("count", e.target.value)} className="h-12 text-base" />
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-6">
                <StepHeader icon={MapPin} title="איפה ומתי?" subtitle="מיקום האתר ומועד התחלה." />
                <div>
                  <Label className="mb-2 block">עיר / אזור</Label>
                  <div className="flex flex-wrap gap-2">
                    {CITIES.map((c) => (
                      <button
                        type="button"
                        key={c}
                        onClick={() => update("location", c)}
                        className={`rounded-full border px-4 py-2 text-xs font-semibold transition-all ${
                          form.location === c
                            ? "border-primary bg-primary/15 text-foreground"
                            : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="start" className="mb-2 block">תאריך התחלה</Label>
                    <Input id="start" type="date" value={form.startDate} onChange={(e) => update("startDate", e.target.value)} className="h-12" />
                  </div>
                  <div>
                    <Label htmlFor="duration" className="mb-2 block">משך עבודה</Label>
                    <Input id="duration" placeholder="לדוגמה: 3 חודשים" value={form.duration} onChange={(e) => update("duration", e.target.value)} className="h-12" />
                  </div>
                </div>
              </div>
            )}
            {step === 3 && (
              <div className="space-y-6">
                <StepHeader icon={FileText} title="פרטים נוספים" subtitle="תקציב מוערך ופרטי הפרויקט (אופציונלי, אבל עוזר לקבל הצעות מדויקות)." />
                <div>
                  <Label htmlFor="budget" className="mb-2 block">תקציב לשעת עובד (₪)</Label>
                  <Input id="budget" placeholder="לדוגמה: 180-210" value={form.budget} onChange={(e) => update("budget", e.target.value)} className="h-12" />
                </div>
                <div>
                  <Label htmlFor="desc" className="mb-2 block">תיאור הפרויקט</Label>
                  <Textarea id="desc" rows={5} placeholder="ספר לתאגידים על הפרויקט: סוג בנייה, גודל, דרישות מיוחדות..." value={form.description} onChange={(e) => update("description", e.target.value)} maxLength={1000} />
                  <div className="mt-1 text-xs text-muted-foreground">{form.description.length}/1000</div>
                </div>
              </div>
            )}
            {step === 4 && (
              <div className="space-y-6">
                <StepHeader icon={Users} title="איך נחזור אליך?" subtitle="פרטי הקשר יוצגו רק לתאגידים שאישרת." />
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="name" className="mb-2 block">שם מלא</Label>
                    <Input id="name" placeholder="ישראל ישראלי" value={form.contactName} onChange={(e) => update("contactName", e.target.value)} className="h-12" maxLength={100} />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="mb-2 block">טלפון נייד</Label>
                    <Input id="phone" type="tel" placeholder="050-0000000" value={form.contactPhone} onChange={(e) => update("contactPhone", e.target.value)} className="h-12" maxLength={20} />
                  </div>
                </div>
                <div className="rounded-xl border border-border/60 bg-secondary/40 p-4 text-sm text-muted-foreground">
                  <ShieldCheck className="mb-2 h-5 w-5 text-primary" />
                  הפרטים שלך מוגנים. נשלח אותם רק לתאגידים שתאשר באופן מפורש.
                </div>
              </div>
            )}

            <div className="mt-8 flex items-center justify-between gap-3 border-t border-border/60 pt-6">
              <Button type="button" variant="ghost" onClick={() => (step === 1 ? navigate({ to: "/" }) : setStep(step - 1))}>
                <ArrowRight className="ml-1 h-4 w-4" />
                {step === 1 ? "ביטול" : "הקודם"}
              </Button>
              {step < STEPS.length ? (
                <Button type="button" disabled={!canNext()} onClick={() => setStep(step + 1)} className="bg-gradient-primary text-primary-foreground shadow-elegant disabled:opacity-50">
                  הבא
                  <ArrowLeft className="mr-1 h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={!canNext()} className="bg-gradient-primary text-primary-foreground shadow-elegant disabled:opacity-50">
                  פרסם בקשה
                  <CheckCircle2 className="mr-1 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Live preview */}
          <aside className="rounded-2xl border border-border/60 bg-card p-6 shadow-card md:p-7 lg:sticky lg:top-20 lg:h-fit">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">תצוגה מקדימה</div>
            <h3 className="mt-2 text-lg font-bold">{form.role || "—"} · {form.count || "0"} עובדים</h3>
            <ul className="mt-4 space-y-3 text-sm">
              <Row icon={MapPin} label="מיקום" value={form.location || "—"} />
              <Row icon={Calendar} label="התחלה" value={form.startDate || "—"} />
              <Row icon={Calendar} label="משך" value={form.duration || "—"} />
              <Row icon={Briefcase} label="תקציב" value={form.budget ? `₪${form.budget}` : "—"} />
            </ul>
            <div className="mt-6 rounded-xl bg-secondary/40 p-4 text-xs text-muted-foreground">
              <div className="font-semibold text-foreground">מה קורה אחרי הפרסום?</div>
              <ul className="mt-2 space-y-1.5">
                <li>• הבקשה נשלחת לתאגידים מאומתים בלבד</li>
                <li>• הצעות ראשונות תוך 4-24 שעות</li>
                <li>• השוואה ובחירה ישירות מהלוח</li>
              </ul>
            </div>
          </aside>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}

function StepHeader({ icon: Icon, title, subtitle }: { icon: React.ComponentType<{ className?: string }>; title: string; subtitle: string }) {
  return (
    <div>
      <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/15 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="mt-4 text-2xl font-extrabold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <li className="flex items-center justify-between gap-2 border-b border-border/40 pb-2 last:border-0">
      <span className="inline-flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </span>
      <span className="font-semibold text-foreground">{value}</span>
    </li>
  );
}