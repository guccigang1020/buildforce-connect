import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { createJobRequest } from "@/lib/job-requests.functions";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  MapPin,
  Calendar,
  Users,
  Briefcase,
  FileText,
  Sparkles,
  ShieldCheck,
  Plus,
  Trash2,
  Lock,
  Globe2,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppShell } from "@/components/app-shell";
import { ROLES, CITIES, NATIONALITIES, type RequestItem } from "@/lib/catalog";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/new-request")({
  head: () => ({
    meta: [
      { title: "פרסום בקשת כוח אדם — BuildForce" },
      {
        name: "description",
        content: "פרסם בקשה ל-60 שניות וקבל הצעות מתאגידי כוח אדם מאומתים תוך שעות.",
      },
    ],
  }),
  component: NewRequestPage,
});

type FormState = {
  items: RequestItem[];
  location: string;
  startDate: string;
  duration: string;
  commitmentMonths: string;
  budget: string;
  description: string;
  contactName: string;
  contactPhone: string;
  acceptTerms: boolean;
};

const STEPS = [
  { n: 1, label: "פריטי בקשה" },
  { n: 2, label: "מיקום ולו״ז" },
  { n: 3, label: "תקציב ופרטים" },
  { n: 4, label: "פרטי קשר" },
];

const MARKET_RATE = 175;

const newItem = (): RequestItem => ({
  id: `it-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  role: "",
  nationality: "",
  count: 1,
});

function NewRequestPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submitRequest = useServerFn(createJobRequest);
  const [form, setForm] = useState<FormState>({
    items: [newItem()],
    location: "",
    startDate: "",
    duration: "",
    commitmentMonths: "",
    budget: "",
    description: "",
    contactName: "",
    contactPhone: "",
    acceptTerms: false,
  });

  useEffect(() => {
    if (!loading && !session) {
      toast.error("יש להתחבר כדי לפרסם בקשה");
      navigate({ to: "/login" });
    }
  }, [loading, session, navigate]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const updateItem = (id: string, patch: Partial<RequestItem>) =>
    setForm((f) => ({
      ...f,
      items: f.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    }));

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, newItem()] }));
  const removeItem = (id: string) =>
    setForm((f) => ({
      ...f,
      items: f.items.length > 1 ? f.items.filter((it) => it.id !== id) : f.items,
    }));

  const itemsValid = form.items.every((it) => it.role && it.nationality && it.count > 0);
  const totalWorkers = form.items.reduce((s, it) => s + (Number(it.count) || 0), 0);

  // Cost estimates
  const estDailyCost = totalWorkers * MARKET_RATE * 8;
  const estMonthlyCost = estDailyCost * 22;

  const canNext = () => {
    if (step === 1) return itemsValid && form.items.length > 0;
    if (step === 2)
      return Boolean(form.location && form.startDate && form.duration && form.commitmentMonths);
    if (step === 3) return true;
    if (step === 4) return Boolean(form.contactName && form.contactPhone && form.acceptTerms);
    return false;
  };

  const isStepComplete = (n: number) => {
    if (n === 1) return itemsValid && form.items.length > 0;
    if (n === 2) return Boolean(form.location && form.startDate && form.duration && form.commitmentMonths);
    if (n === 3) return true;
    if (n === 4) return Boolean(form.contactName && form.contactPhone && form.acceptTerms);
    return false;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!session) {
      toast.error("יש להתחבר כדי לפרסם בקשה");
      navigate({ to: "/login" });
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitRequest({
        data: {
          location: form.location,
          startDate: form.startDate,
          duration: form.duration,
          commitmentMonths: form.commitmentMonths,
          budget: form.budget,
          description: form.description,
          contactName: form.contactName,
          contactPhone: form.contactPhone,
          items: form.items.map((it) => ({
            role: it.role,
            nationality: it.nationality,
            count: Number(it.count) || 0,
          })),
        },
      });
      setSubmitted(true);
      if (result?.id) {
        setTimeout(() => navigate({ to: "/my-requests/$id", params: { id: result.id } }), 1200);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "שגיאה בפרסום הבקשה";
      toast.error(msg.includes("Unauthorized") ? "יש להתחבר כדי לפרסם בקשה" : msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <AppShell title="בקשה חדשה">
        <div className="flex flex-col items-center py-16 text-center animate-fade-up">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-gradient-primary shadow-glow">
            <CheckCircle2 className="h-10 w-10 text-primary-foreground" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight">הבקשה פורסמה בהצלחה</h2>
          <p className="mt-3 max-w-md text-muted-foreground">
            תאגידים מאומתים יקבלו את הבקשה ויחלו לשלוח הצעות תוך שעות. נעדכן אותך במייל ובלוח
            הבקרה.
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
                  items: [newItem()],
                  location: "",
                  startDate: "",
                  duration: "",
                  commitmentMonths: "",
                  budget: "",
                  description: "",
                  contactName: "",
                  contactPhone: "",
                  acceptTerms: false,
                });
              }}
            >
              פרסום בקשה נוספת
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  const cancelAction = (
    <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
      <Link to="/dashboard">ביטול</Link>
    </Button>
  );

  return (
    <AppShell title="בקשה חדשה" action={cancelAction}>
      <div className="space-y-6">
        {/* Page hero */}
        <div className="animate-fade-up">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" /> 60 שניות לפרסום בקשה
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">
            ספר לנו מה אתה צריך,{" "}
            <span className="text-gradient-primary">והתאגידים יבואו אליך.</span>
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            ארבעה שלבים מהירים. הבקשה תישלח רק לתאגידים מאומתים שמתאימים.
          </p>
        </div>

        {/* Stepper with completion indicators */}
        <div className="enterprise-card p-4 md:p-5 animate-fade-up delay-100">
          <div className="grid grid-cols-4 gap-2">
            {STEPS.map((s) => {
              const isCompleted = s.n < step && isStepComplete(s.n);
              const isCurrent = s.n === step;
              const isFuture = s.n > step;
              return (
                <div key={s.n} className="flex flex-col items-center gap-1.5">
                  <div
                    className={`grid h-9 w-9 place-items-center rounded-full text-sm font-bold transition-all ${
                      isCompleted
                        ? "bg-emerald-500 text-white shadow-sm"
                        : isCurrent
                          ? "bg-gradient-primary text-primary-foreground shadow-glow-sm"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : s.n}
                  </div>
                  <div
                    className={`text-center text-[11px] font-medium md:text-xs ${
                      isFuture ? "text-muted-foreground/60" : isCurrent ? "text-foreground font-semibold" : "text-muted-foreground"
                    }`}
                  >
                    {s.label}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-gradient-primary transition-all duration-500"
              style={{ width: `${(step / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Form + Preview */}
        <form onSubmit={onSubmit} className="grid gap-5 lg:grid-cols-3">
          {/* Form card */}
          <div className="enterprise-card p-5 md:p-7 lg:col-span-2 animate-fade-up delay-200">
            {step === 1 && (
              <div className="space-y-5">
                <StepHeader
                  icon={Briefcase}
                  title="איזה צוות אתה צריך?"
                  subtitle="הוסף שורה לכל שילוב של תחום + לאום + כמות."
                />
                <div className="space-y-4">
                  {form.items.map((it, idx) => (
                    <div key={it.id}>
                      {/* Numbered section header */}
                      <div className="mb-2 flex items-center gap-2">
                        <div className="grid h-6 w-6 place-items-center rounded-full bg-primary/15 text-[11px] font-extrabold text-primary">
                          {idx + 1}
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground">
                          פריט בקשה #{idx + 1}
                        </span>
                      </div>
                      <ItemRow
                        idx={idx + 1}
                        item={it}
                        onChange={(patch) => updateItem(it.id, patch)}
                        onRemove={() => removeItem(it.id)}
                        removable={form.items.length > 1}
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 py-3 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Plus className="h-4 w-4" /> הוסף שורת בקשה נוספת
                  </button>
                </div>
                {totalWorkers > 0 && (
                  <div className="rounded-xl bg-secondary/40 p-3 text-xs text-muted-foreground">
                    סה״כ{" "}
                    <span className="font-bold text-foreground">{totalWorkers}</span> עובדים על
                    פני {form.items.length} שורות.
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <StepHeader
                  icon={MapPin}
                  title="איפה ומתי?"
                  subtitle="מיקום האתר ומועד התחלה."
                />
                <div>
                  <Label className="mb-2 block">עיר / אזור</Label>
                  {/* Scrollable pill grid */}
                  <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto rounded-xl border border-border/40 bg-secondary/20 p-3">
                    {CITIES.map((c) => (
                      <button
                        type="button"
                        key={c}
                        onClick={() => update("location", c)}
                        className={`rounded-full border px-4 py-2 text-xs font-semibold transition-all ${
                          form.location === c
                            ? "border-primary bg-gradient-primary text-primary-foreground shadow-glow-sm"
                            : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
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
                    <Input
                      id="start"
                      type="date"
                      value={form.startDate}
                      onChange={(e) => update("startDate", e.target.value)}
                      className="h-12"
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration" className="mb-2 block">משך עבודה</Label>
                    <Input
                      id="duration"
                      placeholder="לדוגמה: 3 חודשים"
                      value={form.duration}
                      onChange={(e) => update("duration", e.target.value)}
                      className="h-12"
                    />
                  </div>
                </div>
                <div>
                  <Label className="mb-2 block">משך התחייבות מינימלי (חודשים)</Label>
                  <div className="flex flex-wrap gap-2">
                    {["1", "3", "6", "12", "24"].map((month) => (
                      <button
                        type="button"
                        key={month}
                        onClick={() => update("commitmentMonths", month)}
                        className={`rounded-full border px-4 py-2 text-xs font-semibold transition-all ${
                          form.commitmentMonths === month
                            ? "border-primary bg-gradient-primary text-primary-foreground shadow-glow-sm"
                            : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {month} חודשים
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    מגדיר ביטחון לתאגידים — ומחיר טוב יותר עבורך.
                  </p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <StepHeader
                  icon={FileText}
                  title="פרטים נוספים"
                  subtitle="תקציב מוערך ופרטי הפרויקט (אופציונלי)."
                />
                <div>
                  <Label htmlFor="budget" className="mb-2 block">תקציב לשעת עובד (₪)</Label>
                  <Input
                    id="budget"
                    placeholder="לדוגמה: 180-210"
                    value={form.budget}
                    onChange={(e) => update("budget", e.target.value)}
                    className="h-12"
                  />
                </div>
                <div>
                  <Label htmlFor="desc" className="mb-2 block">תיאור הפרויקט</Label>
                  <Textarea
                    id="desc"
                    rows={5}
                    placeholder="ספר לתאגידים על הפרויקט: סוג בנייה, גודל, דרישות מיוחדות..."
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    maxLength={1000}
                  />
                  <div className="mt-1 text-xs text-muted-foreground">
                    {form.description.length}/1000
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5">
                <StepHeader
                  icon={Users}
                  title="איך נחזור אליך?"
                  subtitle="פרטי הקשר יוצגו רק לתאגידים שאישרת."
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="name" className="mb-2 block">שם מלא</Label>
                    <Input
                      id="name"
                      placeholder="ישראל ישראלי"
                      value={form.contactName}
                      onChange={(e) => update("contactName", e.target.value)}
                      className="h-12"
                      maxLength={100}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="mb-2 block">טלפון נייד</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="050-0000000"
                      value={form.contactPhone}
                      onChange={(e) => update("contactPhone", e.target.value)}
                      className="h-12"
                      maxLength={20}
                    />
                  </div>
                </div>
                <div className="rounded-xl border border-border/60 bg-secondary/40 p-4 text-sm text-muted-foreground">
                  <ShieldCheck className="mb-2 h-5 w-5 text-primary" />
                  הפרטים שלך מוגנים. נשלח אותם רק לתאגידים שתאשר באופן מפורש.
                </div>

                {/* Summary preview before non-circumvention */}
                <div className="rounded-xl border border-border/60 bg-secondary/20 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <Zap className="h-4 w-4 text-primary" />
                    סיכום הבקשה לפני פרסום
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-card border border-border/40 p-2.5">
                      <div className="text-muted-foreground mb-0.5">מיקום</div>
                      <div className="font-semibold">{form.location || "—"}</div>
                    </div>
                    <div className="rounded-lg bg-card border border-border/40 p-2.5">
                      <div className="text-muted-foreground mb-0.5">התחלה</div>
                      <div className="font-semibold">{form.startDate || "—"}</div>
                    </div>
                    <div className="rounded-lg bg-card border border-border/40 p-2.5">
                      <div className="text-muted-foreground mb-0.5">עובדים</div>
                      <div className="font-semibold">{totalWorkers}</div>
                    </div>
                    <div className="rounded-lg bg-card border border-border/40 p-2.5">
                      <div className="text-muted-foreground mb-0.5">התחייבות</div>
                      <div className="font-semibold">{form.commitmentMonths ? `${form.commitmentMonths} חודשים` : "—"}</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {form.items.filter((it) => it.role).map((it) => (
                      <span key={it.id} className="inline-block ml-2 mb-1 rounded-full border border-border/50 bg-secondary/60 px-2 py-0.5">
                        {it.count}× {it.role}
                      </span>
                    ))}
                  </div>
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
                  <input
                    type="checkbox"
                    checked={form.acceptTerms}
                    onChange={(e) => update("acceptTerms", e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-primary"
                  />
                  <span className="text-muted-foreground">
                    <span className="font-bold text-foreground">
                      אני מתחייב לסעיף אי-עקיפה (Non-Circumvention):
                    </span>{" "}
                    כל ההתקשרות, התשלומים והעסקת העובדים שאתאם דרך BuildForce — יבוצעו דרך הפלטפורמה
                    למשך {form.commitmentMonths || "X"} חודשים מבחירת ספק.
                  </span>
                </label>
              </div>
            )}

            {/* Navigation */}
            <div className="mt-7 flex items-center justify-between gap-3 border-t border-border/40 pt-5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => (step === 1 ? navigate({ to: "/" }) : setStep(step - 1))}
              >
                <ArrowRight className="ml-1 h-4 w-4" />
                {step === 1 ? "ביטול" : "הקודם"}
              </Button>
              {step < STEPS.length ? (
                <Button
                  type="button"
                  disabled={!canNext()}
                  onClick={() => setStep(step + 1)}
                  className="bg-gradient-primary text-primary-foreground shadow-elegant disabled:opacity-50"
                >
                  הבא
                  <ArrowLeft className="mr-1 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={!canNext() || submitting}
                  className="bg-gradient-primary text-primary-foreground shadow-elegant disabled:opacity-50"
                >
                  {submitting ? "שולח..." : "פרסם בקשה"}
                  <CheckCircle2 className="mr-1 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Live preview sidebar */}
          <aside className="enterprise-card p-5 md:p-6 lg:sticky lg:top-4 lg:h-fit animate-fade-up delay-300">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              תצוגה מקדימה
            </div>
            <h3 className="mt-2 text-lg font-bold">בקשה · {totalWorkers} עובדים</h3>
            <div className="mt-3 space-y-2">
              {form.items.map((it, i) => (
                <div
                  key={it.id}
                  className="rounded-lg border border-border/60 bg-secondary/40 px-3 py-2 text-xs"
                >
                  <span className="font-bold text-foreground">{it.count || "?"} ×</span>{" "}
                  {it.role || "—"} · <span className="text-primary">{it.nationality || "—"}</span>
                  {!it.role && !it.nationality && (
                    <span className="text-muted-foreground"> פריט {i + 1} ריק</span>
                  )}
                </div>
              ))}
            </div>
            <ul className="mt-4 space-y-2.5 text-sm">
              <PreviewRow icon={MapPin} label="מיקום" value={form.location || "—"} />
              <PreviewRow icon={Calendar} label="התחלה" value={form.startDate || "—"} />
              <PreviewRow icon={Calendar} label="משך" value={form.duration || "—"} />
              <PreviewRow
                icon={Lock}
                label="התחייבות"
                value={form.commitmentMonths ? `${form.commitmentMonths} חודשים` : "—"}
              />
              <PreviewRow
                icon={Briefcase}
                label="תקציב"
                value={form.budget ? `₪${form.budget}` : "—"}
              />
            </ul>

            {/* Auto cost estimate */}
            {totalWorkers > 0 && (
              <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-primary">
                  <TrendingUp className="h-4 w-4" />
                  הערכת עלות (מחיר שוק ₪{MARKET_RATE}/שעה)
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">עלות יומית משוערת</span>
                  <span className="font-extrabold text-foreground">₪{estDailyCost.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">עלות חודשית (×22 ימים)</span>
                  <span className="font-extrabold text-primary">₪{estMonthlyCost.toLocaleString()}</span>
                </div>
              </div>
            )}

            <div className="mt-5 rounded-xl bg-secondary/40 p-4 text-xs text-muted-foreground">
              <div className="font-semibold text-foreground">מה קורה אחרי הפרסום?</div>
              <ul className="mt-2 space-y-1.5">
                <li>• הבקשה נשלחת לתאגידים מאומתים בלבד</li>
                <li>• פרטי קשר נחשפים רק אחרי בחירת ספק</li>
              </ul>
            </div>
          </aside>
        </form>
      </div>
    </AppShell>
  );
}

function ItemRow({
  idx,
  item,
  onChange,
  onRemove,
  removable,
}: {
  idx: number;
  item: RequestItem;
  onChange: (patch: Partial<RequestItem>) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-secondary/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-bold text-muted-foreground">שורה {idx}</div>
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="h-3 w-3" /> הסר
          </button>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_120px]">
        <div>
          <Label className="mb-1.5 block text-[11px]">תחום</Label>
          <select
            value={item.role}
            onChange={(e) => onChange({ role: e.target.value })}
            className="h-11 w-full rounded-md border border-border bg-card px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">בחר תחום…</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <Label className="mb-1.5 block text-[11px]">
            <Globe2 className="ml-1 inline h-3 w-3 text-primary" />
            לאום עובדים
          </Label>
          <select
            value={item.nationality}
            onChange={(e) => onChange({ nationality: e.target.value })}
            className="h-11 w-full rounded-md border border-border bg-card px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">בחר לאום…</option>
            {NATIONALITIES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div>
          <Label className="mb-1.5 block text-[11px]">כמות</Label>
          <Input
            type="number"
            min={1}
            max={200}
            value={item.count || ""}
            onChange={(e) => onChange({ count: Math.max(1, Number(e.target.value) || 1) })}
            className="h-11"
          />
        </div>
      </div>
    </div>
  );
}

function StepHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-primary shadow-elegant text-primary-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-xl font-extrabold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function PreviewRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <li className="flex items-center justify-between gap-2 border-b border-border/40 pb-2 last:border-0">
      <span className="inline-flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </span>
      <span className="font-semibold text-foreground">{value}</span>
    </li>
  );
}

