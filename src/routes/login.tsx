import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import MailOutlineIcon from "@mui/icons-material/MailOutlined";
import LockIcon from "@mui/icons-material/Lock";
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
        {formError && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
            <ErrorOutlineIcon sx={{ fontSize: 16 }} className="mt-0.5 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

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
      </div>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        עדיין אין לך חשבון?{" "}
        <Link to="/signup" className="font-medium text-primary hover:underline">
          הירשם בחינם
        </Link>
      </p>

      <p className="mt-3 text-center text-xs text-muted-foreground/70">
        מנהלי מערכת מתחברים מדף זה עם חשבון המנהל הייעודי — ומועברים אוטומטית ללוח הניהול.
      </p>
    </AuthShell>
  );
}
