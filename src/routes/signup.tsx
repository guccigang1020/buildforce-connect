import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
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
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";
import { mapAuthError } from "@/lib/auth-errors";
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
    .regex(/^[0-9]{9}$/, "ח.פ / ע.מ חייב להיות 9 ספרות"),
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

type FormValues = z.infer<typeof signupSchema>;

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(signupSchema),
    mode: "onTouched",
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      password: "",
      city: "",
      role: "contractor",
      business_name: "",
      business_id: "",
      contractor_license_number: "",
      contractor_classification: "",
    },
  });

  const role = watch("role");

  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [booksFile, setBooksFile] = useState<File | null>(null);
  const [licenseError, setLicenseError] = useState<string | null>(null);
  const [booksError, setBooksError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [agreedError, setAgreedError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/go" });
  }, [loading, session, navigate]);

  const onSubmit = async (data: FormValues) => {
    setFormError(null);

    // Inline validation for controls that live outside react-hook-form.
    let ok = true;
    if (data.role === "contractor") {
      if (!licenseFile) {
        setLicenseError("יש להעלות תעודת קבלן רשום (PDF / תמונה)");
        ok = false;
      }
      if (!booksFile) {
        setBooksError("יש להעלות אישור ניהול ספרים (PDF / תמונה)");
        ok = false;
      }
    }
    if (!agreed) {
      setAgreedError("יש לאשר את תנאי השימוש כדי להמשיך");
      ok = false;
    }
    if (!ok) return;

    const { data: signupData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          full_name: data.full_name,
          phone: data.phone,
          company_name: data.business_name,
          business_name: data.business_name,
          business_id: data.business_id,
          contractor_license_number: data.contractor_license_number || null,
          contractor_classification: data.contractor_classification || null,
          city: data.city,
          role: data.role,
        },
      },
    });

    if (error) {
      const mapped = mapAuthError(error.message);
      if (mapped.target === "email") {
        setError("email", { type: "server", message: mapped.message });
      } else if (mapped.target === "password") {
        setError("password", { type: "server", message: mapped.message });
      } else {
        setFormError(mapped.message);
      }
      return;
    }

    // Supabase returns an identities array; an empty one means the email is
    // already registered (Supabase obfuscates this as a "success" when email
    // confirmation is on, instead of returning an error).
    if (signupData.user && (signupData.user.identities?.length ?? 0) === 0) {
      setError("email", {
        type: "server",
        message: "אימייל זה כבר רשום במערכת — התחבר/י במקום זאת",
      });
      return;
    }

    const userId = signupData.user?.id;

    // Doc uploads require an authenticated session. When email confirmation is
    // enabled there is no session yet, so we can't upload as the user here —
    // tell them, but don't lose the signup.
    if (userId && data.role === "contractor" && (licenseFile || booksFile)) {
      if (signupData.session) {
        const uploaded: { license?: string; books?: string } = {};
        const upload = async (file: File, kind: "license" | "books") => {
          const ext = file.name.split(".").pop() || "bin";
          const path = `${userId}/${kind}-${Date.now()}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("contractor-docs")
            .upload(path, file);
          if (upErr) {
            console.error(`Failed to upload ${kind} doc`, upErr);
            return;
          }
          uploaded[kind] = path;
        };
        if (licenseFile) await upload(licenseFile, "license");
        if (booksFile) await upload(booksFile, "books");

        if (Object.keys(uploaded).length > 0) {
          const { error: updErr } = await supabase
            .from("profiles")
            .update({
              license_doc_url: uploaded.license ?? null,
              books_cert_url: uploaded.books ?? null,
            })
            .eq("user_id", userId);
          if (updErr) console.error("Failed to attach contractor docs to profile", updErr);
        }
        if (!uploaded.license || !uploaded.books) {
          toast.warning("חלק מהמסמכים לא הועלו. ניתן להשלים אותם מההגדרות לאחר ההתחברות.");
        }
      } else {
        toast.message("נרשמת! לאחר אימות האימייל תוכל/י להעלות את מסמכי הקבלן מההגדרות.");
      }
    }

    if (signupData.session) {
      toast.success("נרשמת בהצלחה!");
      navigate({ to: "/go" });
    } else {
      toast.success("נרשמת בהצלחה! בדוק/י את האימייל לאישור החשבון.");
      navigate({ to: "/login" });
    }
  };

  const handleGoogle = async () => {
    setFormError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/dashboard`,
    });
    if (result.error) {
      setFormError("הרשמה עם Google נכשלה");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/go" });
  };

  const pickFile =
    (setFile: (f: File | null) => void, setErr: (m: string | null) => void) => (f: File | null) => {
      if (f && f.size > MAX_FILE_BYTES) {
        setErr("הקובץ גדול מ-5MB");
        return;
      }
      setErr(null);
      setFile(f);
    };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-lg py-8">
        {/* Logo */}
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card text-sm font-bold text-foreground">
            B
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">BuildForce</span>
        </div>

        <h1 className="mb-6 text-center text-xl font-semibold text-foreground">
          הצטרף ל-BuildForce
        </h1>

        {/* Form card */}
        <div className="rounded-lg border border-border p-6 space-y-5">
          {/* Role picker */}
          <div>
            <Label className="mb-2.5 block text-sm font-medium">אני מצטרף/ת כ…</Label>
            <div className="grid grid-cols-2 gap-3">
              <RoleCard
                active={role === "contractor"}
                onClick={() => setValue("role", "contractor", { shouldValidate: true })}
                icon={HardHat}
                title="קבלן / יזם"
                sub="פותח בקשות לפועלים"
              />
              <RoleCard
                active={role === "corporation"}
                onClick={() => setValue("role", "corporation", { shouldValidate: true })}
                icon={Briefcase}
                title="תאגיד כוח אדם"
                sub="שולח הצעות לקבלנים"
              />
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={handleGoogle}
            disabled={isSubmitting}
          >
            <GoogleIcon />
            הרשמה עם Google
          </Button>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> או{" "}
            <span className="h-px flex-1 bg-border" />
          </div>

          {formError && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Field
              id="full_name"
              label="שם מלא"
              icon={User}
              required
              registration={register("full_name")}
              error={errors.full_name?.message}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                id="email"
                label="אימייל"
                type="email"
                icon={Mail}
                required
                registration={register("email")}
                error={errors.email?.message}
              />
              <Field
                id="phone"
                label="טלפון"
                type="tel"
                icon={Phone}
                required
                registration={register("phone")}
                error={errors.phone?.message}
                placeholder="050-1234567"
              />
            </div>
            <Field
              id="password"
              label="סיסמה"
              type="password"
              icon={Lock}
              required
              registration={register("password")}
              error={errors.password?.message}
              placeholder="לפחות 6 תווים"
            />

            {/* Business details */}
            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                פרטי העסק
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  id="business_name"
                  label={role === "corporation" ? "שם התאגיד" : "שם העסק"}
                  icon={Building2}
                  required
                  registration={register("business_name")}
                  error={errors.business_name?.message}
                />
                <Field
                  id="business_id"
                  label="ח.פ / ע.מ"
                  icon={Hash}
                  required
                  registration={register("business_id")}
                  error={errors.business_id?.message}
                  placeholder="9 ספרות"
                />
              </div>
              <Field
                id="city"
                label="עיר"
                icon={MapPin}
                required
                registration={register("city")}
                error={errors.city?.message}
              />
            </div>

            {/* Contractor verification */}
            {role === "contractor" && (
              <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">אימות קבלן רשום (חובה)</div>
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
                    registration={register("contractor_license_number")}
                    error={errors.contractor_license_number?.message}
                    placeholder="לדוגמה: 12345"
                  />
                  <Field
                    id="contractor_classification"
                    label="סיווג"
                    icon={Briefcase}
                    required
                    registration={register("contractor_classification")}
                    error={errors.contractor_classification?.message}
                    placeholder="100 / 131 / ..."
                  />
                </div>
                <FileField
                  id="license_file"
                  label="תעודת קבלן רשום"
                  icon={FileText}
                  required
                  file={licenseFile}
                  onFile={pickFile(setLicenseFile, setLicenseError)}
                  accept=".pdf,image/*"
                  error={licenseError}
                />
                <FileField
                  id="books_file"
                  label="אישור ניהול ספרים"
                  icon={BookOpen}
                  required
                  file={booksFile}
                  onFile={pickFile(setBooksFile, setBooksError)}
                  accept=".pdf,image/*"
                  error={booksError}
                />
              </div>
            )}

            {/* Terms */}
            <div className="space-y-1.5">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-muted/10 p-3.5">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => {
                    setAgreed(e.target.checked);
                    if (e.target.checked) setAgreedError(null);
                  }}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-primary"
                />
                <span className="text-xs leading-relaxed text-muted-foreground">
                  אני מאשר/ת שכל ההתקשרות מול הצד השני תתבצע אך ורק דרך BuildForce. עקיפת
                  הפלטפורמה (יצירת קשר ישיר או התקשרות חיצונית) מהווה הפרת תנאי שימוש ומחייבת בקנס
                  לפי המוסכם.
                </span>
              </label>
              {agreedError && <FieldError message={agreedError} />}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="ms-2 h-4 w-4 animate-spin" /> יוצר חשבון…
                </>
              ) : (
                "צור חשבון בחינם"
              )}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          כבר יש לך חשבון?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            התחבר
          </Link>
        </p>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          © BuildForce {new Date().getFullYear()} · כל הזכויות שמורות
        </p>
      </div>
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
      className={`rounded-lg border p-4 text-right transition-colors ${
        active
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:border-border/80 hover:bg-muted/20"
      }`}
    >
      <div className="mb-1.5 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
    </button>
  );
}

function FieldError({ message }: { message: string }) {
  return (
    <p className="flex items-center gap-1 text-xs font-medium text-destructive">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {message}
    </p>
  );
}

function Field({
  id,
  label,
  icon: Icon,
  type = "text",
  required,
  registration,
  error,
  placeholder,
}: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  type?: string;
  required?: boolean;
  registration: UseFormRegisterReturn;
  error?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && <span className="ms-1 text-destructive">*</span>}
      </Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type={type}
          aria-invalid={error ? true : undefined}
          {...registration}
          className={`h-10 pr-10 ${
            error
              ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30"
              : ""
          }`}
          placeholder={placeholder}
        />
      </div>
      {error && <FieldError message={error} />}
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
  error,
}: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  required?: boolean;
  file: File | null;
  onFile: (f: File | null) => void;
  accept?: string;
  error?: string | null;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && <span className="ms-1 text-destructive">*</span>}
      </Label>
      <label
        htmlFor={id}
        className={`flex cursor-pointer items-center gap-3 rounded-lg border border-dashed px-3 py-2.5 transition-colors ${
          error
            ? "border-destructive/60 bg-destructive/5"
            : file
              ? "border-emerald-500/60 bg-emerald-500/10"
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
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
      </label>
      {error && <FieldError message={error} />}
    </div>
  );
}
