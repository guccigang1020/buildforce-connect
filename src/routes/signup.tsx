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
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteNav } from "@/components/site-nav";

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
  // Business details — required for both
  business_name: z.string().trim().min(2, "שם עסק נדרש").max(150),
  business_id: z
    .string()
    .trim()
    .min(8, "ח.פ / ע.מ חייב להיות 9 ספרות")
    .max(15)
    .regex(/^[0-9]+$/, "רק ספרות"),
  // Contractor-only — required when role=contractor
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
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);
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

    // Upload verification documents (contractor only) — best-effort, link in profile after
    const userId = signupData.user?.id;
    if (userId && role === "contractor") {
      const uploaded: { license?: string; insurance?: string; books?: string } = {};
      const upload = async (file: File, kind: "license" | "insurance" | "books") => {
        const ext = file.name.split(".").pop() || "bin";
        const path = `${userId}/${kind}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("contractor-docs").upload(path, file);
        if (!upErr) uploaded[kind] = path;
      };
      if (licenseFile) await upload(licenseFile, "license");
      if (insuranceFile) await upload(insuranceFile, "insurance");
      if (booksFile) await upload(booksFile, "books");
      if (Object.keys(uploaded).length > 0) {
        await supabase
          .from("profiles")
          .update({
            license_doc_url: uploaded.license ?? null,
            insurance_doc_url: uploaded.insurance ?? null,
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
      redirect_uri: `${window.location.origin}/dashboard`,
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
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-xl px-4 py-12">
        <div className="text-center">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-elegant">
            <UserPlus className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="mt-4 text-3xl font-extrabold">הצטרף ל-BuildForce</h1>
          <p className="mt-1 text-sm text-muted-foreground">פתח חשבון בחינם — תוך 2 דקות</p>
        </div>

        <div className="mt-8 rounded-3xl border border-border/60 bg-card/60 p-6 backdrop-blur-sm shadow-elegant">
          {/* Role picker */}
          <div className="mb-5">
            <Label className="mb-2 block">אני…</Label>
            <div className="grid grid-cols-2 gap-2">
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
            className="w-full"
            onClick={handleGoogle}
            disabled={submitting}
          >
            <GoogleIcon /> הרשמה עם Google
          </Button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> או <span className="h-px flex-1 bg-border" />
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

            {/* Business block — required for everyone */}
            <div className="rounded-2xl border border-border/60 bg-secondary/30 p-4 space-y-4">
              <div className="flex items-center gap-2 text-sm font-extrabold">
                <Building2 className="h-4 w-4 text-primary" /> פרטי העסק
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

            {/* Contractor verification block — only for contractors */}
            {role === "contractor" && (
              <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 space-y-4">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <div className="text-sm font-extrabold">אימות קבלן רשום (חובה)</div>
                    <div className="text-[11px] text-muted-foreground">
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
                  id="insurance_file"
                  label="ביטוח צד ג' (אופציונלי כעת)"
                  icon={ShieldCheck}
                  file={insuranceFile}
                  onFile={setInsuranceFile}
                  accept=".pdf,image/*"
                />
                <FileField
                  id="books_file"
                  label="אישור ניהול ספרים (אופציונלי כעת)"
                  icon={BookOpen}
                  file={booksFile}
                  onFile={setBooksFile}
                  accept=".pdf,image/*"
                />
              </div>
            )}

            {/* Terms — exclusivity / no circumvention */}
            <label className="flex items-start gap-2 rounded-xl border border-border/60 bg-card/40 p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border accent-primary"
              />
              <span className="text-xs text-muted-foreground leading-relaxed">
                אני מאשר/ת שכל ההתקשרות מול הצד השני תתבצע אך ורק דרך BuildForce. עקיפת הפלטפורמה
                (יצירת קשר ישיר או התקשרות חיצונית) מהווה הפרת תנאי שימוש ומחייבת בקנס לפי המוסכם.
              </span>
            </label>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "צור חשבון"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          כבר יש לך חשבון?{" "}
          <Link to="/login" className="font-bold text-primary hover:underline">
            התחבר
          </Link>
        </p>
      </main>
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
      className={`group rounded-2xl border p-4 text-right transition-all ${
        active
          ? "border-primary bg-primary/10 shadow-elegant"
          : "border-border bg-card/40 hover:border-primary/50"
      }`}
    >
      <div
        className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl ${
          active ? "bg-gradient-primary text-primary-foreground" : "bg-secondary text-foreground"
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-sm font-extrabold">{title}</div>
      <div className="text-[11px] text-muted-foreground">{sub}</div>
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
      <Label htmlFor={id}>
        {label}
        {required && <span className="ms-1 text-destructive">*</span>}
      </Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type={type}
          required={required}
          value={value}
          onChange={onChange}
          className="pr-10"
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="ms-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
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
      <Label htmlFor={id}>
        {label}
        {required && <span className="ms-1 text-destructive">*</span>}
      </Label>
      <label
        htmlFor={id}
        className={`flex items-center gap-3 rounded-xl border border-dashed px-3 py-2.5 cursor-pointer transition-colors ${
          file
            ? "border-emerald-500/60 bg-emerald-500/5"
            : "border-border bg-card/40 hover:border-primary/50"
        }`}
      >
        {file ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        ) : (
          <Upload className="h-4 w-4 text-muted-foreground" />
        )}
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1 truncate text-xs">
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
