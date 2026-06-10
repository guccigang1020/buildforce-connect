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
  commitmentMonths: string;
  description: string;
  contactName: string;
  contactPhone: string;
  acceptTerms: boolean;
};

const STEPS = [
  { n: 1, label: "פריטי בקשה" },
  { n: 2, label: "מיקום ולו״ז" },
  { n: 3, label: "פרטים נוספים" },
  { n: 4, label: "פרטי קשר" },
];

const MARKET_RATE = 175;

const TODAY = new Date().toISOString().split("T")[0];

const isValidILPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  return /^(?:972|0)(?:[23489]|5[0-9]|7[0-9])\d{7}$/.test(digits);
};

const newItem = (): RequestItem => ({
  id: `it-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  role: "",
  nationality: "",
  count: 1,
});

/** Returns a Hebrew explanation of what is blocking the Next button, or null when valid. */
function computeNextHint(
  step: number,
  form: FormState,
  isPhoneValid: boolean,
  isStartDateValid: boolean,
): string | null {
  if (step === 1) {
    if (form.items.some((it) => !it.role)) return "יש לבחור תחום בכל שורה";
    if (form.items.some((it) => !it.nationality)) return "יש לבחור לאום בכל שורה";
    if (form.items.some((it) => !it.count || Number(it.count) <= 0))
      return "יש להזין כמות עובדים תקינה בכל שורה";
    return null;
  }
  if (step === 2) {
    if (!form.location) return "יש לבחור עיר";
    if (!form.startDate) return "יש להזין תאריך התחלה";
    if (!isStartDateValid) return "תאריך ההתחלה לא יכול להיות בעבר";
    if (!form.commitmentMonths) return "יש לבחור תקופת התקשרות";
    return null;
  }
  if (step === 4) {
    if (!form.contactName) return "יש להזין שם מלא";
    if (!form.contactPhone) return "יש להזין מספר טלפון";
    if (form.contactPhone && !isPhoneValid) return "מספר טלפון לא תקין";
    if (!form.acceptTerms) return "יש לאשר את תנאי אי-העקיפה";
    return null;
  }
  return null;
}

function NewRequestPage() {
  const navigate = useNavigate();
  const { session, loading, profile } = useAuth();
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submitRequest = useServerFn(createJobRequest);
  const [form, setForm] = useState<FormState>({
    items: [newItem()],
    location: "",
    startDate: "",
    commitmentMonths: "",
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

  // Pre-fill contact details from the logged-in user's profile, but only
  // for fields the user hasn't already started typing into.
  useEffect(() => {
    if (!profile) return;
    setForm((f) => ({
      ...f,
      contactName: f.contactName || profile.full_name || "",
      contactPhone: f.contactPhone || profile.phone || "",
    }));
  }, [profile]);

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

  const isStartDateValid = Boolean(form.startDate && form.startDate >= TODAY);
  const isPhoneValid = Boolean(form.contactPhone && isValidILPhone(form.contactPhone));

  const canNext = () => {
    if (step === 1) return itemsValid && form.items.length > 0;
    if (step === 2) return Boolean(form.location && form.commitmentMonths && isStartDateValid);
    if (step === 3) return true;
    if (step === 4) return Boolean(form.contactName && isPhoneValid && form.acceptTerms);
    return false;
  };

  const canGoNext = canNext();
  const nextHint = !canGoNext
    ? computeNextHint(step, form, isPhoneValid, isStartDateValid)
    : null;

  const isStepComplete = (n: number) => {
    if (n === 1) return itemsValid && form.items.length > 0;
    if (n === 2) return Boolean(form.location && form.commitmentMonths && isStartDateValid);
    if (n === 3) return true;
    if (n === 4) return Boolean(form.contactName && isPhoneValid && form.acceptTerms);
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
          commitmentMonths: form.commitmentMonths,
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
        <div className="flex flex-col items-center py-16 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full border-2 border-primary bg-primary/10">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mt-6 text-xl font-semibold">הבקשה פורסמה בהצלחה</h2>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            תאגידים מאומתים יקבלו את הבקשה ויחלו לשלוח הצעות תוך שעות. נעדכן אותך במייל ובלוח הבקרה.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
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
                  commitmentMonths: "",
                  description: "",
                  contactName: profile?.full_name ?? "",
                  contactPhone: profile?.phone ?? "",
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

  return (
    <AppShell title="בקשה חדשה">
      <div className="space-y-6">
        {/* ── Page header (pattern 1) ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <h2 className="text-xl font-semibold text-foreground">בקשה חדשה</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              ארבעה שלבים מהירים. הבקשה תישלח לתאגידים מאומתים שמתאימים.
            </p>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
            <Link to="/dashboard">ביטול</Link>
          </Button>
        </div>

        {/* ── Step indicator (simplified: text steps + progress line) ── */}
        <div className="enterprise-card p-4 md:p-5">
          <div className="flex items-center">
            {STEPS.map((s, i) => {
              const isCompleted = s.n < step && isStepComplete(s.n);
              const isCurrent = s.n === step;
              return (
                <div key={s.n} className="flex min-w-0 flex-1 items-center">
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span
                      className={`text-xs font-semibold tabular-nums ${
                        isCurrent
                          ? "text-primary"
                          : isCompleted
                            ? "text-emerald-600"
                            : "text-muted-foreground/50"
                      }`}
                    >
                      {isCompleted ? "✓" : s.n}
                    </span>
                    <span
                      className={`hidden text-xs sm:inline ${
                        isCurrent ? "font-semibold text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="mx-2 h-px min-w-2 flex-1 bg-border" />
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${(step / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* ── Form + Preview ── */}
        <form onSubmit={onSubmit} className="grid gap-5 lg:grid-cols-3">
          {/* Form card */}
          <div className="enterprise-card p-5 lg:col-span-2">
            {step === 1 && (
              <div className="space-y-5">
                <StepHeader
                  title="איזה צוות אתה צריך?"
                  subtitle="הוסף שורה לכל שילוב של תחום + לאום + כמות."
                />
                <div className="space-y-4">
                  {form.items.map((it, idx) => (
                    <div key={it.id}>
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-xs font-medium tabular-nums text-muted-foreground">
                          #{idx + 1}
                        </span>
                        <span className="text-xs text-muted-foreground">פריט בקשה</span>
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
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                  >
                    <Plus className="h-4 w-4" /> הוסף שורת בקשה נוספת
                  </button>
                </div>
                {totalWorkers > 0 && (
                  <div className="rounded-lg bg-secondary/40 p-3 text-xs text-muted-foreground">
                    סה״כ <span className="font-semibold text-foreground">{totalWorkers}</span>{" "}
                    עובדים על פני {form.items.length} שורות.
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <StepHeader title="איפה ומתי?" subtitle="מיקום האתר ומועד התחלה." />
                <div>
                  <Label className="mb-2 block">עיר / אזור</Label>
                  <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto rounded-lg border border-border/40 bg-secondary/20 p-3">
                    {CITIES.map((c) => (
                      <button
                        type="button"
                        key={c}
                        onClick={() => update("location", c)}
                        className={`rounded-full border px-4 py-2 text-xs font-medium transition-all ${
                          form.location === c
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="start" className="mb-2 block">
                    תאריך התחלה
                  </Label>
                  <Input
                    id="start"
                    type="date"
                    min={TODAY}
                    value={form.startDate}
                    onChange={(e) => update("startDate", e.target.value)}
                    className="h-12"
                  />
                  {form.startDate && !isStartDateValid && (
                    <p className="mt-1.5 text-xs font-medium text-destructive">
                      תאריך ההתחלה לא יכול להיות בעבר
                    </p>
                  )}
                </div>
                <div>
                  <Label className="mb-2 block">תקופת התקשרות (חודשים)</Label>
                  <div className="flex flex-wrap gap-2">
                    {["1", "3", "6", "12", "24"].map((month) => (
                      <button
                        type="button"
                        key={month}
                        onClick={() => update("commitmentMonths", month)}
                        className={`rounded-full border px-4 py-2 text-xs font-medium transition-all ${
                          form.commitmentMonths === month
                            ? "border-primary bg-primary text-primary-foreground"
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
                <StepHeader title="פרטים נוספים" subtitle="פרטי הפרויקט (אופציונלי)." />
                <div>
                  <Label htmlFor="desc" className="mb-2 block">
                    תיאור הפרויקט
                  </Label>
                  <Textarea
                    id="desc"
                    rows={5}
                    placeholder="ספר לתאגידים על הפרויקט: סוג בנייה, גודל, דרישות מיוחדות..."
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    maxLength={1000}
                  />
                  <div className="mt-1 text-xs text-muted-foreground" dir="ltr">
                    {form.description.length}/1000
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5">
                <StepHeader
                  title="איך נחזור אליך?"
                  subtitle="פרטי הקשר יוצגו רק לתאגידים שאישרת."
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="name" className="mb-2 block">
                      שם מלא
                    </Label>
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
                    <Label htmlFor="phone" className="mb-2 block">
                      טלפון נייד
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      dir="ltr"
                      placeholder="050-0000000"
                      value={form.contactPhone}
                      onChange={(e) => update("contactPhone", e.target.value)}
                      className="h-12 text-end"
                      maxLength={20}
                    />
                    {form.contactPhone && !isPhoneValid && (
                      <p className="mt-1.5 text-xs font-medium text-destructive">
                        מספר טלפון לא תקין
                      </p>
                    )}
                  </div>
                </div>
                <div className="rounded-lg border border-border/60 bg-secondary/40 p-4 text-sm text-muted-foreground">
                  <ShieldCheck className="mb-2 h-5 w-5 text-primary" />
                  הפרטים שלך מוגנים. נשלח אותם רק לתאגידים שתאשר באופן מפורש.
                </div>

                {/* Summary preview before non-circumvention */}
                <div className="rounded-lg border border-border/60 bg-secondary/20 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Zap className="h-4 w-4 text-primary" />
                    סיכום הבקשה לפני פרסום
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-card border border-border/40 p-2.5">
                      <div className="text-muted-foreground mb-0.5">מיקום</div>
                      <div className="font-medium">{form.location || "—"}</div>
                    </div>
                    <div className="rounded-lg bg-card border border-border/40 p-2.5">
                      <div className="text-muted-foreground mb-0.5">התחלה</div>
                      <div className="font-medium" dir="ltr">
                        {form.startDate || "—"}
                      </div>
                    </div>
                    <div className="rounded-lg bg-card border border-border/40 p-2.5">
                      <div className="text-muted-foreground mb-0.5">עובדים</div>
                      <div className="font-medium">{totalWorkers}</div>
                    </div>
                    <div className="rounded-lg bg-card border border-border/40 p-2.5">
                      <div className="text-muted-foreground mb-0.5">התחייבות</div>
                      <div className="font-medium">
                        {form.commitmentMonths ? `${form.commitmentMonths} חודשים` : "—"}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {form.items
                      .filter((it) => it.role)
                      .map((it) => (
                        <span
                          key={it.id}
                          className="mb-1 me-2 inline-block rounded-full border border-border/50 bg-secondary/60 px-2 py-0.5"
                        >
                          {it.count}× {it.role}
                        </span>
                      ))}
                  </div>
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
                  <input
                    type="checkbox"
                    checked={form.acceptTerms}
                    onChange={(e) => update("acceptTerms", e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-primary"
                  />
                  <span className="text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      אני מתחייב לסעיף אי-עקיפה (Non-Circumvention):
                    </span>{" "}
                    כל ההתקשרות, התשלומים והעסקת העובדים שאתאם דרך BuildForce — יבוצעו דרך
                    הפלטפורמה למשך {form.commitmentMonths || "X"} חודשים מבחירת ספק.
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
                <div className="flex flex-col items-end gap-1.5">
                  <Button
                    type="button"
                    disabled={!canGoNext}
                    onClick={() => setStep(step + 1)}
                    className="disabled:opacity-50"
                  >
                    הבא
                    <ArrowLeft className="mr-1 h-4 w-4" />
                  </Button>
                  {nextHint && (
                    <p className="text-end text-xs font-medium text-destructive">{nextHint}</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-end gap-1.5">
                  <Button
                    type="submit"
                    disabled={!canGoNext || submitting}
                    className="disabled:opacity-50"
                  >
                    {submitting ? "שולח..." : "פרסם בקשה"}
                    <CheckCircle2 className="mr-1 h-4 w-4" />
                  </Button>
                  {nextHint && (
                    <p className="text-end text-xs font-medium text-destructive">{nextHint}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Live preview sidebar */}
          <aside className="enterprise-card p-5 lg:sticky lg:top-4 lg:h-fit">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              תצוגה מקדימה
            </div>
            <h3 className="mt-2 text-base font-semibold">בקשה · {totalWorkers} עובדים</h3>
            <div className="mt-3 space-y-2">
              {form.items.map((it, i) => (
                <div
                  key={it.id}
                  className="rounded-lg border border-border/60 bg-secondary/40 px-3 py-2 text-xs"
                >
                  <span className="font-semibold text-foreground">{it.count || "?"} ×</span>{" "}
                  {it.role || "—"} · <span className="text-primary">{it.nationality || "—"}</span>
                  {!it.role && !it.nationality && (
                    <span className="text-muted-foreground"> פריט {i + 1} ריק</span>
                  )}
                </div>
              ))}
            </div>
            <ul className="mt-4 space-y-2.5 text-sm">
              <PreviewRow icon={MapPin} label="מיקום" value={form.location || "—"} />
              <PreviewRow icon={Calendar} label="התחלה" value={form.startDate || "—"} ltr />
              <PreviewRow
                icon={Lock}
                label="משך"
                value={form.commitmentMonths ? `${form.commitmentMonths} חודשים` : "—"}
              />
            </ul>

            {/* Auto cost estimate */}
            {totalWorkers > 0 && (
              <div className="mt-5 rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                  <TrendingUp className="h-4 w-4" />
                  הערכת עלות (מחיר שוק <span dir="ltr">₪{MARKET_RATE}</span> לשעה)
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">עלות יומית משוערת</span>
                  <span className="font-semibold text-foreground" dir="ltr">
                    ₪{estDailyCost.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">עלות חודשית (×22 ימים)</span>
                  <span className="font-semibold text-primary" dir="ltr">
                    ₪{estMonthlyCost.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <div className="mt-5 rounded-lg bg-secondary/40 p-4 text-xs text-muted-foreground">
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
    <div className="rounded-lg border border-border/60 bg-secondary/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-medium text-muted-foreground">שורה {idx}</div>
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-destructive"
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
              <option key={r} value={r}>
                {r}
              </option>
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
              <option key={n} value={n}>
                {n}
              </option>
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

function StepHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-5 border-b border-border pb-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function PreviewRow({
  icon: Icon,
  label,
  value,
  ltr,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-2 border-b border-border/40 pb-2 last:border-0">
      <span className="inline-flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </span>
      <span className="font-medium text-foreground" dir={ltr ? "ltr" : undefined}>
        {value}
      </span>
    </li>
  );
}
