import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import MailOutlineIcon from "@mui/icons-material/MailOutlined";
import LockIcon from "@mui/icons-material/Lock";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import EngineeringIcon from "@mui/icons-material/Engineering";
import CircularProgress from "@mui/material/CircularProgress";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlined";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { mapAuthError } from "@/lib/auth-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/auth-shell";

const loginSchema = z.object({
  email: z.string().trim().email("אימייל לא תקין").max(255),
  password: z.string().min(6, "סיסמה לפחות 6 תווים").max(72),
});

type LoginValues = z.infer<typeof loginSchema>;

// IL phone → E.164 (+9725XXXXXXXX) for Supabase phone OTP.
function toE164(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (d.length < 8) return null;
  if (d.startsWith("0")) return "+972" + d.slice(1);
  if (d.startsWith("972")) return "+" + d;
  if (raw.trim().startsWith("+")) return "+" + d;
  return "+972" + d;
}

// Demo / mock-OTP shortcut. While Twilio (or any SMS provider) is not
// configured, the three seeded phone-actor accounts can be entered with
// the fixed code "123456" — the form transparently signs them in via
// email+password against the synthetic email assigned by the seed script
// (see scripts/seed-demo.mjs).
const DEMO_OTP = "123456";
const DEMO_PHONES: Record<string, string> = {
  "500000001": "tl-0500000001@demo.test",
  "500000002": "fm-0500000002@demo.test",
  "500000003": "om-0500000003@demo.test",
};
const DEMO_PASSWORD = "Test123456";
// Match any of: 0500000001, 500000001, 972500000001, +972 50-000-0001 …
function demoEmailForPhone(raw: string): string | null {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("972")) d = d.slice(3);
  if (d.startsWith("0")) d = d.slice(1);
  return DEMO_PHONES[d] ?? null;
}

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
    defaultValues: { email: "", password: "" },
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [mode, setMode] = useState<"email" | "phone">("email");

  useEffect(() => {
    if (!loading && session) navigate({ to: "/go" });
  }, [loading, session, navigate]);

  const onSubmit = async (data: LoginValues) => {
    setFormError(null);
    const { error } = await supabase.auth.signInWithPassword(data);
    if (error) {
      const mapped = mapAuthError(error.message);
      if (mapped.target === "email") setError("email", { type: "server", message: mapped.message });
      else if (mapped.target === "password")
        setError("password", { type: "server", message: mapped.message });
      else setFormError(mapped.message);
      return;
    }
    toast.success("ברוך הבא!");
    navigate({ to: "/go" });
  };

  return (
    <AuthShell>
      <Link to="/" className="mb-7 flex flex-col items-center gap-2.5">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-primary shadow-elegant">
          <EngineeringIcon sx={{ fontSize: 22 }} className="text-primary-foreground" />
        </div>
        <span className="text-base font-extrabold tracking-tight text-foreground">
          Build<span className="text-primary">Force</span>
        </span>
      </Link>

      <h1 className="mb-1 text-center text-2xl font-bold text-foreground">ברוך הבא</h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">התחבר כדי להמשיך לחשבון שלך</p>

      {/* Glass form card */}
      <div className="space-y-5 rounded-2xl border border-border/60 bg-card/70 p-6 shadow-2xl backdrop-blur-xl">
        {/* Email/password (חברות, קבלנים) vs phone OTP (רכז, מנהל עבודה, מנהל תפעול) */}
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted/50 p-1 text-sm">
          <button
            type="button"
            onClick={() => setMode("email")}
            className={`rounded-md py-1.5 font-medium transition-colors ${mode === "email" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"}`}
          >
            אימייל וסיסמה
          </button>
          <button
            type="button"
            onClick={() => setMode("phone")}
            className={`rounded-md py-1.5 font-medium transition-colors ${mode === "phone" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"}`}
          >
            טלפון (קוד SMS)
          </button>
        </div>

        {formError && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
            <ErrorOutlineIcon sx={{ fontSize: 16 }} className="mt-0.5 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {mode === "phone" && <PhoneOtpForm onAuthed={() => navigate({ to: "/go" })} />}

        {mode === "email" && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">
                כתובת אימייל
              </Label>
              <div className="relative">
                <MailOutlineIcon
                  sx={{ fontSize: 16 }}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={errors.email ? true : undefined}
                  {...register("email")}
                  className={`h-10 pr-10 ${
                    errors.email
                      ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30"
                      : ""
                  }`}
                  placeholder="you@example.com"
                />
              </div>
              {errors.email && (
                <p className="flex items-center gap-1 text-xs font-medium text-destructive">
                  <ErrorOutlineIcon sx={{ fontSize: 12 }} className="shrink-0" />
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  סיסמה
                </Label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  שכחת סיסמה?
                </Link>
              </div>
              <div className="relative">
                <LockIcon
                  sx={{ fontSize: 16 }}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={errors.password ? true : undefined}
                  {...register("password")}
                  className={`h-10 pr-10 ${
                    errors.password
                      ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30"
                      : ""
                  }`}
                  placeholder="••••••••"
                />
              </div>
              {errors.password && (
                <p className="flex items-center gap-1 text-xs font-medium text-destructive">
                  <ErrorOutlineIcon sx={{ fontSize: 12 }} className="shrink-0" />
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <CircularProgress size={16} color="inherit" className="ms-2" /> מתחבר…
                </>
              ) : (
                "התחבר לחשבון"
              )}
            </Button>
          </form>
        )}
      </div>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        עדיין אין לך חשבון?{" "}
        <Link to="/signup" className="font-medium text-primary hover:underline">
          הירשם בחינם
        </Link>
      </p>

      <p className="mt-3 text-center text-xs text-muted-foreground/70">
        רכזים, מנהלי עבודה ומנהלי תפעול מתחברים בעזרת מספר הטלפון שהוזן עבורם בפרויקט.
      </p>
    </AuthShell>
  );
}

// Phone OTP path for provisioned sub-users (רכז / מנהל עבודה / מנהל תפעול).
// Step 1: send a one-time code by SMS. Step 2: verify it.
function PhoneOtpForm({ onAuthed }: { onAuthed: () => void }) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const sendCode = async () => {
    setErr(null);
    // Demo phones bypass Twilio entirely — check BEFORE E.164 validation
    // so any input format (0500…, +97250…, 972 50…) hits the mock path.
    if (demoEmailForPhone(phone)) {
      setSent(true);
      toast.success("מצב דמו: הזן את הקוד 123456");
      return;
    }
    const e164 = toE164(phone);
    if (!e164) {
      setErr("מספר טלפון לא תקין");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: e164 });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setSent(true);
    toast.success("נשלח קוד אימות ב-SMS");
  };

  const verify = async () => {
    setErr(null);
    // Mock-OTP path for the three seeded demo phones — check first.
    const demoEmail = demoEmailForPhone(phone);
    if (demoEmail) {
      if (code.trim() !== DEMO_OTP) {
        setErr("קוד שגוי (במצב דמו: 123456)");
        return;
      }
      setBusy(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: DEMO_PASSWORD,
      });
      setBusy(false);
      if (error) {
        setErr("חשבון הדמו לא נמצא — הרץ את scripts/seed-demo.mjs");
        return;
      }
      toast.success("התחברת בהצלחה!");
      onAuthed();
      return;
    }
    const e164 = toE164(phone);
    if (!e164) {
      setErr("מספר טלפון לא תקין");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({
      phone: e164,
      token: code.trim(),
      type: "sms",
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    toast.success("התחברת בהצלחה!");
    onAuthed();
  };

  return (
    <div className="space-y-4">
      {err && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
          <ErrorOutlineIcon sx={{ fontSize: 16 }} className="mt-0.5 shrink-0" />
          <span>{err}</span>
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="phone" className="text-sm font-medium">
          מספר טלפון
        </Label>
        <div className="relative">
          <PhoneIphoneIcon
            sx={{ fontSize: 16 }}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            disabled={sent}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-10 pr-10"
            placeholder="05X-XXXXXXX"
          />
        </div>
      </div>

      {sent && (
        <div className="space-y-1.5">
          <Label htmlFor="otp" className="text-sm font-medium">
            קוד אימות
          </Label>
          <Input
            id="otp"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="h-10 tracking-[0.3em]"
            placeholder="______"
          />
          <button
            type="button"
            onClick={() => {
              setSent(false);
              setCode("");
            }}
            className="text-xs font-medium text-primary hover:underline"
          >
            שינוי מספר טלפון
          </button>
        </div>
      )}

      <Button type="button" className="w-full" disabled={busy} onClick={sent ? verify : sendCode}>
        {busy ? (
          <>
            <CircularProgress size={16} color="inherit" className="ms-2" />
            {sent ? "מאמת…" : "שולח…"}
          </>
        ) : sent ? (
          "אימות והתחברות"
        ) : (
          "שליחת קוד ב-SMS"
        )}
      </Button>
    </div>
  );
}
