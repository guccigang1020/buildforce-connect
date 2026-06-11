import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import MailOutlineIcon from "@mui/icons-material/MailOutlined";
import LockIcon from "@mui/icons-material/Lock";
import PersonIcon from "@mui/icons-material/Person";
import PhoneIcon from "@mui/icons-material/Phone";
import ApartmentIcon from "@mui/icons-material/Apartment";
import PlaceIcon from "@mui/icons-material/Place";
import CircularProgress from "@mui/material/CircularProgress";
import EngineeringIcon from "@mui/icons-material/Engineering";
import WorkIcon from "@mui/icons-material/Work";
import DescriptionIcon from "@mui/icons-material/Description";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import HandshakeIcon from "@mui/icons-material/Handshake";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import TagIcon from "@mui/icons-material/Tag";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlined";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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

    if (signupData.session) {
      toast.success("נרשמת בהצלחה!");
      navigate({ to: "/go" });
    } else {
      toast.success("נרשמת בהצלחה! בדוק/י את האימייל לאישור החשבון.");
      navigate({ to: "/login" });
    }
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
                icon={EngineeringIcon}
                title="קבלן / יזם"
                sub="פותח בקשות לפועלים"
              />
              <RoleCard
                active={role === "corporation"}
                onClick={() => setValue("role", "corporation", { shouldValidate: true })}
                icon={WorkIcon}
                title="תאגיד כוח אדם"
                sub="שולח הצעות לקבלנים"
              />
            </div>
          </div>

          {formError && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
              <ErrorOutlineIcon sx={{ fontSize: 16 }} className="mt-0.5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Field
              id="full_name"
              label="שם מלא"
              icon={PersonIcon}
              required
              registration={register("full_name")}
              error={errors.full_name?.message}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                id="email"
                label="אימייל"
                type="email"
                icon={MailOutlineIcon}
                required
                registration={register("email")}
                error={errors.email?.message}
              />
              <Field
                id="phone"
                label="טלפון"
                type="tel"
                icon={PhoneIcon}
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
              icon={LockIcon}
              required
              registration={register("password")}
              error={errors.password?.message}
              placeholder="לפחות 6 תווים"
            />

            {/* Business details */}
            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <ApartmentIcon sx={{ fontSize: 16 }} className="text-muted-foreground" />
                פרטי העסק
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  id="business_name"
                  label={role === "corporation" ? "שם התאגיד" : "שם העסק"}
                  icon={ApartmentIcon}
                  required
                  registration={register("business_name")}
                  error={errors.business_name?.message}
                />
                <Field
                  id="business_id"
                  label="ח.פ / ע.מ"
                  icon={TagIcon}
                  required
                  registration={register("business_id")}
                  error={errors.business_id?.message}
                  placeholder="9 ספרות"
                />
              </div>
              <Field
                id="city"
                label="עיר"
                icon={PlaceIcon}
                required
                registration={register("city")}
                error={errors.city?.message}
              />
            </div>

            {/* Contractor verification */}
            {role === "contractor" && (
              <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
                <div className="flex items-start gap-2.5">
                  <VerifiedUserIcon sx={{ fontSize: 16 }} className="mt-0.5 shrink-0 text-muted-foreground" />
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
                    icon={WorkspacePremiumIcon}
                    required
                    registration={register("contractor_license_number")}
                    error={errors.contractor_license_number?.message}
                    placeholder="לדוגמה: 12345"
                  />
                  <Field
                    id="contractor_classification"
                    label="סיווג"
                    icon={WorkIcon}
                    required
                    registration={register("contractor_classification")}
                    error={errors.contractor_classification?.message}
                    placeholder="100 / 131 / ..."
                  />
                </div>
                <ComingSoonDoc icon={DescriptionIcon} label="תעודת קבלן רשום" />
                <ComingSoonDoc icon={MenuBookIcon} label="אישור ניהול ספרים" />
              </div>
            )}

            {/* Corporation verification */}
            {role === "corporation" && (
              <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
                <div className="flex items-start gap-2.5">
                  <VerifiedUserIcon sx={{ fontSize: 16 }} className="mt-0.5 shrink-0 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">אימות תאגיד</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      הפרטים נבדקים ע"י הצוות תוך 24 שעות.
                    </div>
                  </div>
                </div>
                <ComingSoonDoc icon={HandshakeIcon} label="הסכם התקשרות מול קבלנים" />
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
                  <CircularProgress size={16} color="inherit" className="ms-2" /> יוצר חשבון…
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
  icon: React.ComponentType<{ className?: string; sx?: object }>;
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
        <Icon sx={{ fontSize: 16 }} />
      </div>
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
    </button>
  );
}

function FieldError({ message }: { message: string }) {
  return (
    <p className="flex items-center gap-1 text-xs font-medium text-destructive">
      <ErrorOutlineIcon sx={{ fontSize: 12 }} className="shrink-0" />
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
  icon: React.ComponentType<{ className?: string; sx?: object }>;
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
        <Icon sx={{ fontSize: 16 }} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
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

function ComingSoonDoc({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string; sx?: object }>;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/30 px-3 py-2.5">
      <Icon sx={{ fontSize: 16 }} className="text-muted-foreground" />
      <span className="flex-1 truncate text-sm font-medium">{label}</span>
      <span className="status-chip-muted shrink-0">בקרוב</span>
    </div>
  );
}
