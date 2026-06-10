import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, Loader2, BadgeCheck, Zap, Shield, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";
import { mapAuthError } from "@/lib/auth-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const loginSchema = z.object({
  email: z.string().trim().email("אימייל לא תקין").max(255),
  password: z.string().min(6, "סיסמה לפחות 6 תווים").max(72),
});

type LoginValues = z.infer<typeof loginSchema>;

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

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard" });
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
    navigate({ to: "/dashboard" });
  };

  const handleGoogle = async () => {
    setFormError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/dashboard`,
    });
    if (result.error) {
      setFormError("התחברות עם Google נכשלה");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background" dir="rtl">
      {/* Form panel — RIGHT in RTL */}
      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-5 py-10 md:px-10">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary shadow-glow-sm">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-extrabold tracking-tight">BuildForce</span>
          </div>

          <div className="animate-fade-up">
            <h1 className="text-3xl font-extrabold tracking-tight">ברוך הבא</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">חזרת לפלטפורמה? מתחברים.</p>
          </div>

          <div className="mt-8 animate-fade-up delay-100 space-y-5">
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 gap-2 border-border/80 bg-card/60 font-semibold hover:bg-card"
              onClick={handleGoogle}
              disabled={isSubmitting}
            >
              <GoogleIcon />
              המשך עם Google
            </Button>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border/60" /> או{" "}
              <span className="h-px flex-1 bg-border/60" />
            </div>

            {formError && (
              <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-semibold">
                  כתובת אימייל
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    aria-invalid={errors.email ? true : undefined}
                    {...register("email")}
                    className={`h-11 pr-10 bg-card/60 border-border/70 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/30 ${
                      errors.email
                        ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30"
                        : ""
                    }`}
                    placeholder="you@example.com"
                  />
                </div>
                {errors.email && (
                  <p className="flex items-center gap-1 text-xs font-medium text-destructive">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-semibold">
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
                  <Lock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    aria-invalid={errors.password ? true : undefined}
                    {...register("password")}
                    className={`h-11 pr-10 bg-card/60 border-border/70 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/30 ${
                      errors.password
                        ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30"
                        : ""
                    }`}
                    placeholder="••••••••"
                  />
                </div>
                {errors.password && (
                  <p className="flex items-center gap-1 text-xs font-medium text-destructive">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-primary text-primary-foreground font-bold shadow-elegant hover:opacity-95 transition-opacity"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="ms-2 h-4 w-4 animate-spin" /> מתחבר…
                  </>
                ) : (
                  "התחבר לחשבון"
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              עדיין אין לך חשבון?{" "}
              <Link to="/signup" className="font-bold text-primary hover:underline">
                הירשם בחינם
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Branding panel — LEFT in RTL (hidden on mobile) */}
      <aside className="relative hidden w-[42%] shrink-0 flex-col items-center justify-center overflow-hidden bg-gradient-dark lg:flex">
        {/* Background decorations */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: "radial-gradient(white 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-xs px-8 text-center">
          <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-primary shadow-elegant">
            <Shield className="h-8 w-8 text-primary-foreground" />
          </div>
          <div className="text-3xl font-extrabold tracking-tight text-white">BuildForce</div>
          <div className="mt-2 text-sm font-medium text-white/70">
            פלטפורמת כוח האדם המובילה לענף הבנייה
          </div>

          <div className="mt-8 space-y-3">
            {[
              { icon: Zap, text: "הצעות תוך פחות מ-24 שעות" },
              { icon: BadgeCheck, text: "תאגידים מאומתים בלבד" },
              { icon: Shield, text: "עלות אפס לקבלן" },
            ].map((item) => (
              <div
                key={item.text}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-right"
              >
                <item.icon className="h-4 w-4 shrink-0 text-primary-glow" />
                <span className="text-sm font-medium text-white/90">{item.text}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 border-t border-white/10 pt-6">
            <div className="flex justify-center gap-8">
              {[
                { n: "< 24h", l: "עד הצעה ראשונה" },
                { n: "₪0", l: "עלות לקבלן" },
                { n: "100%", l: "מאובטח" },
              ].map((s) => (
                <div key={s.l} className="text-center">
                  <div className="text-xl font-extrabold text-white" dir="ltr">{s.n}</div>
                  <div className="text-xs text-white/60">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
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
