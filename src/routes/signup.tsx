import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import {
  UserPlus,
  Mail,
  Lock,
  User,
  Phone,
  Building2,
  MapPin,
  Loader2,
  HardHat,
  Briefcase,
  FileText,
  ShieldCheck,
  BookOpen,
  Hash,
  Award,
  Upload,
  CheckCircle2,
  Gavel,
  BadgeCheck,
  Zap,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const baseSchema = z.object({
  full_name: z.string().trim().min(2, "שם מלא נדרש").max(100),
  email: z.string().trim().email("אימייל לא תקין").max(255),
  phone: z
    .string()
    .trim()
    .min(9, "מספר טלפון לא תקין")
    .max(20)
    .regex(/^[0-9+\-\s()]+$/, "מספר טלפון לא תקין"),
  password: z.string().min(6, "סיסמה לפחות 6 תווים").max(72),
  city: z.string().trim().min(2, "עיר נדרשת").max(100),
  role: z.enum(["contractor", "corporation"]),
  business_name: z.string().trim().min(2, "שם עסק נדרש").max(150),
  business_id: z
    .string()
    .trim()
    .min(8, "ח.פ / ע.מ חייב להיות 9 ספרות")
    .max(15)
    .regex(/^[0-9]+$/, "רק ספרות"),
  contractor_license_number: z.string().trim().max(30).optional().or(z.literal("")),
  contractor_classification: z.string().trim().max(50).optional().or(z.literal("")),
});

const signupSchema = baseSchema.superRefine((d, ctx) => {
  if (d.role === "contractor") {
    if (!d.contractor_license_number || d.contractor_license_number.length < 3) {
      ctx.addIssue({
        code: "custom",
        path: ["contractor_license_number"],
        message: "מספר קבלן רשום נדרש",
      });
    }
    if (!d.contractor_classification) {
      ctx.addIssue({ code: "custom", path: ["contractor_classification"], message: "סיווג נדרש" });
    }
  }
});

type RoleChoice = "contractor" | "corporation";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [role, setRole] = useState<RoleChoice>("contractor");
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    city: "",
    business_name: "",
    business_id: "",
    contractor_license_number: "",
    contractor_classification: "",
  });
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [booksFile, setBooksFile] = useState<File | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard" });
  }, [loading, session, navigate]);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signupSchema.safeParse({ ...form, role });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "פרטים לא תקינים");
      return;
    }
    if (role === "contractor" && !licenseFile) {
      toast.error("יש להעלות תעודת קבלן רשום (PDF / תמונה)");
      return;
    }
    if (role === "contractor" && !booksFile) {
      toast.error("יש להעלות אישור ניהול ספרים (PDF / תמונה)");
      return;
    }
    if (!agreed) {
      toast.error("יש לאשר את תנאי השימוש כדי להמשיך");
      return;
    }
    setSubmitting(true);
    const { data: signupData, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          full_name: parsed.data.full_name,
          phone: parsed.data.phone,
          company_name: parsed.data.business_name,
          business_name: parsed.data.business_name,
          business_id: parsed.data.business_id,
          contractor_license_number: parsed.data.contractor_license_number || null,
          contractor_classification: parsed.data.contractor_classification || null,
          city: parsed.data.city,
          role: parsed.data.role,
        },
      },
    });
    if (error) {
      setSubmitting(false);
      toast.error(
        error.message.includes("already") ? "המשתמש כבר רשום — נסה להתחבר" : error.message,
      );
      return;
    }

    const userId = signupData.user?.id;
    if (userId && role === "contractor") {
      const uploaded: { license?: string; books?: string } = {};
      const upload = async (file: File, kind: "license" | "books") => {
        const ext = file.name.split(".").pop() || "bin";
        const path = `${userId}/${kind}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("contractor-docs").upload(path, file);
        if (!upErr) uploaded[kind] = path;
      };
      if (licenseFile) await upload(licenseFile, "license");
      if (booksFile) await upload(booksFile, "books");
      if (Object.keys(uploaded).length > 0) {
        await supabase
          .from("profiles")
          .update({
            license_doc_url: uploaded.license ?? null,
            books_cert_url: uploaded.books ?? null,
          })
          .eq("user_id", userId);
      }
    }

    setSubmitting(false);
    toast.success("נרשמת בהצלחה! בדוק את האימייל לאישור החשבון.");
    navigate({ to: "/login" });
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: "https://buildforce-connect.lovable.app/dashboard",
    });
    if (result.error) {
      setSubmitting(false);
      toast.error("הרשמה עם Google נכשלה");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="flex min-h-screen bg-background" dir="rtl">
      {/* Form panel — RIGHT in RTL */}
      <div className="flex flex-1 flex-col overflow-y-auto px-5 py-10 md:px-10">
        <div className="mx-auto w-full max-w-lg">
          {/* Mobile logo */}
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary shadow-glow-sm">
              <Gavel className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-base font-extrabold tracking-tight">BuildForce</span>
          </div>

          <div className="animate-fade-up">
            <h1 className="text-3xl font-extrabold tracking-tight">הצטרף ל-BuildForce</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">פתח חשבון בחינם — תוך 2 דקות</p>
          </div>

          <div className="mt-6 animate-fade-up delay-100 space-y-5">
            {/* Role picker */}
            <div>
              <Label className="mb-2.5 block text-sm font-semibold">אני מצטרף/ת כ…</Label>
              <div className="grid grid-cols-2 gap-3">
                <RoleCard
                  active={role === "contractor"}
                  onClick={() => setRole("contractor")}
                  icon={HardHat}
                  title="קבלן / יזם"
                  sub="פותח בקשות לפועלים"
                />
                <RoleCard
                  active={role === "corporation"}
                  onClick={() => setRole("corporation")}
                  icon={Briefcase}
                  title="תאגיד כוח אדם"
                  sub="שולח הצעות לקבלנים"
                />
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-11 gap-2 border-border/80 bg-card/60 font-semibold hover:bg-card"
              onClick={handleGoogle}
              disabled={submitting}
            >
              <GoogleIcon />
              הרשמה עם Google
            </Button>

            <div className="flex items-center gap-3 text-xs text-muted-foreground/60">
              <span className="h-px flex-1 bg-border/60" /> או{" "}
              <span className="h-px flex-1 bg-border/60" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field
                id="full_name"
                label="שם מלא"
                icon={User}
                required
                value={form.full_name}
                onChange={update("full_name")}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  id="email"
                  label="אימייל"
                  type="email"
                  icon={Mail}
                  required
                  value={form.email}
                  onChange={update("email")}
                />
                <Field
                  id="phone"
                  label="טלפון"
                  type="tel"
                  icon={Phone}
                  required
                  value={form.phone}
                  onChange={update("phone")}
                  placeholder="050-1234567"
                />
              </div>
              <Field
                id="password"
                label="סיסמה"
                type="password"
                icon={Lock}
                required
                value={form.password}
                onChange={update("password")}
                placeholder="לפחות 6 תווים"
              />

              {/* Business details */}
              <div className="rounded-2xl border border-border/60 bg-card/40 p-4 space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground/90">
                  <Building2 className="h-4 w-4 text-primary" />
                  פרטי העסק
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    id="business_name"
                    label={role === "corporation" ? "שם התאגיד" : "שם העסק"}
                    icon={Building2}
                    required
                    value={form.business_name}
                    onChange={update("business_name")}
                  />
                  <Field
                    id="business_id"
                    label="ח.פ / ע.מ"
                    icon={Hash}
                    required
                    value={form.business_id}
                    onChange={update("business_id")}
                    placeholder="9 ספרות"
                  />
                </div>
                <Field
                  id="city"
                  label="עיר"
                  icon={MapPin}
                  required
                  value={form.city}
                  onChange={update("city")}
                />
              </div>

              {/* Contractor verification */}
              {role === "contractor" && (
                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-4">
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <div className="text-sm font-bold">אימות קבלן רשום (חובה)</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        רק קבלנים רשומים מקבלים שירותים. הפרטים נבדקים ע"י הצוות תוך 24 שעות.
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field
                      id="contractor_license_number"
                      label="מס' קבלן רשום"
                      icon={Award}
                      required
                      value={form.contractor_license_number}
                      onChange={update("contractor_license_number")}
                      placeholder="לדוגמה: 12345"
                    />
                    <Field
                      id="contractor_classification"
                      label="סיווג"
                      icon={Briefcase}
                      required
                      value={form.contractor_classification}
                      onChange={update("contractor_classification")}
                      placeholder="100 / 131 / ..."
                    />
                  </div>
                  <FileField
                    id="license_file"
                    label="תעודת קבלן רשום"
                    icon={FileText}
                    required
                    file={licenseFile}
                    onFile={setLicenseFile}
                    accept=".pdf,image/*"
                  />
                  <FileField
                    id="books_file"
                    label="אישור ניהול ספרים"
                    icon={BookOpen}
                    required
                    file={booksFile}
                    onFile={setBooksFile}
                    accept=".pdf,image/*"
                  />
                </div>
              )}

              {/* Terms */}
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 bg-card/40 p-3.5">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-primary"
                />
                <span className="text-xs leading-relaxed text-muted-foreground">
                  אני מאשר/ת שכל ההתקשרות מול הצד השני תתבצע אך ורק דרך BuildForce. עקיפת הפלטפורמה
                  (יצירת קשר ישיר או התקשרות חיצונית) מהווה הפרת תנאי שימוש ומחייבת בקנס לפי המוסכם.
                </span>
              </label>

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-primary text-primary-foreground font-bold shadow-elegant hover:opacity-95"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="ms-2 h-4 w-4 animate-spin" /> יוצר חשבון…
                  </>
                ) : (
                  "צור חשבון בחינם"
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              כבר יש לך חשבון?{" "}
              <Link to="/login" className="font-bold text-primary hover:underline">
                התחבר
              </Link>
            </p>
          </div>

          <div className="mt-8 border-t border-border/40 pt-6 pb-2">
            <p className="text-center text-xs text-muted-foreground/50">
              © BuildForce {new Date().getFullYear()} · כל הזכויות שמורות
            </p>
          </div>
        </div>
      </div>

      {/* Branding panel — LEFT in RTL */}
      <aside className="relative hidden w-[38%] shrink-0 flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[oklch(0.13_0.03_260)] via-[oklch(0.12_0.03_255)] to-[oklch(0.09_0.02_265)] xl:flex">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-primary/25 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
        </div>

        <div className="relative z-10 max-w-xs px-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary shadow-elegant">
            <Gavel className="h-8 w-8 text-primary-foreground" />
          </div>
          <div className="text-2xl font-extrabold tracking-tight">BuildForce Prime</div>
          <div className="mt-2 text-sm text-muted-foreground">
            שוק כוח האדם המוביל לענף הבנייה
          </div>

          <div className="mt-8 space-y-3 text-right">
            {[
              { icon: Zap, text: "הצעות תוך פחות מ-24 שעות" },
              { icon: BadgeCheck, text: "47 תאגידים מאומתים" },
              { icon: Shield, text: "מכרז אנונימי — מחיר נמוך תמיד" },
              { icon: UserPlus, text: "הרשמה ושימוש בחינם לקבלנים" },
            ].map((item) => (
              <div
                key={item.text}
                className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/5 px-4 py-3"
              >
                <item.icon className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-sm font-medium text-foreground/90">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

function RoleCard({
  active,
  onClick,
  icon: Icon,
  title,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-2xl border p-4 text-right transition-all hover:shadow-sm-app ${
        active
          ? "border-primary bg-primary/10 shadow-glow-sm"
          : "border-border/70 bg-card/40 hover:border-primary/50"
      }`}
    >
      <div
        className={`mb-2.5 inline-flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
          active ? "bg-gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-sm font-bold">{title}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>
    </button>
  );
}

function Field({
  id,
  label,
  icon: Icon,
  type = "text",
  required,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  type?: string;
  required?: boolean;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-semibold">
        {label}
        {required && <span className="ms-1 text-destructive">*</span>}
      </Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
        <Input
          id={id}
          type={type}
          required={required}
          value={value}
          onChange={onChange}
          className="h-10 pr-10 bg-card/50 border-border/70 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/30"
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 11v3.6h5.1c-.2 1.4-1.6 4-5.1 4-3 0-5.5-2.5-5.5-5.6S8.9 7.4 12 7.4c1.7 0 2.9.7 3.5 1.3l2.4-2.3C16.4 5 14.4 4 12 4 7.6 4 4 7.6 4 12s3.6 8 8 8c4.6 0 7.6-3.2 7.6-7.7 0-.5-.1-.9-.1-1.3H12z"
      />
    </svg>
  );
}

function FileField({
  id,
  label,
  icon: Icon,
  required,
  file,
  onFile,
  accept,
}: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  required?: boolean;
  file: File | null;
  onFile: (f: File | null) => void;
  accept?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-semibold">
        {label}
        {required && <span className="ms-1 text-destructive">*</span>}
      </Label>
      <label
        htmlFor={id}
        className={`flex cursor-pointer items-center gap-3 rounded-xl border border-dashed px-3 py-2.5 transition-colors ${
          file
            ? "border-emerald-500/60 bg-emerald-500/5"
            : "border-border/60 bg-card/30 hover:border-primary/50"
        }`}
      >
        {file ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        ) : (
          <Upload className="h-4 w-4 text-muted-foreground" />
        )}
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1 truncate text-xs text-muted-foreground">
          {file ? file.name : "בחר קובץ (PDF / תמונה, עד 5MB)"}
        </span>
        <input
          id={id}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            if (f && f.size > 5 * 1024 * 1024) {
              alert("הקובץ גדול מ-5MB");
              return;
            }
            onFile(f);
          }}
        />
      </label>
    </div>
  );
}
