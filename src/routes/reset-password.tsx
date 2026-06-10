import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase auto-handles the recovery hash; wait for session
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = z
      .object({
        password: z.string().min(6, "סיסמה לפחות 6 תווים").max(72),
        confirm: z.string(),
      })
      .refine((d) => d.password === d.confirm, { message: "הסיסמאות לא תואמות", path: ["confirm"] })
      .safeParse({ password, confirm });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "פרטים לא תקינים");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("הסיסמה עודכנה בהצלחה!");
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

        <h1 className="mb-6 text-center text-xl font-semibold text-foreground">בחר סיסמה חדשה</h1>

        {/* Form card */}
        <div className="rounded-lg border border-border p-6">
          {!ready ? (
            <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> מאמת את הקישור…
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <PasswordField
                id="password"
                label="סיסמה חדשה"
                value={password}
                onChange={setPassword}
              />
              <PasswordField
                id="confirm"
                label="אימות סיסמה"
                value={confirm}
                onChange={setConfirm}
              />
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="ms-2 h-4 w-4 animate-spin" /> מעדכן…
                  </>
                ) : (
                  "עדכן סיסמה"
                )}
              </Button>
            </form>
          )}
        </div>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link to="/login" className="font-medium text-primary hover:underline">
            חזור להתחברות
          </Link>
        </p>
      </div>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <div className="relative">
        <Lock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type="password"
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 pr-10"
          placeholder="••••••••"
        />
      </div>
    </div>
  );
}
