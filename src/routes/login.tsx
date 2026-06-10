import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, Loader2, AlertCircle } from "lucide-react";
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card text-sm font-bold text-foreground">
            B
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">BuildForce</span>
        </div>

        <h1 className="mb-6 text-center text-xl font-semibold text-foreground">ברוך הבא</h1>

        {/* Form card */}
        <div className="rounded-lg border border-border p-6 space-y-5">
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={handleGoogle}
            disabled={isSubmitting}
          >
            <GoogleIcon />
            המשך עם Google
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
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">
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
                  <AlertCircle className="h-3 w-3 shrink-0" />
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
                <Lock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="ms-2 h-4 w-4 animate-spin" /> מתחבר…
                </>
              ) : (
                "התחבר לחשבון"
              )}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          עדיין אין לך חשבון?{" "}
          <Link to="/signup" className="font-medium text-primary hover:underline">
            הירשם בחינם
          </Link>
        </p>
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
