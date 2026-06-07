import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Lock, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

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
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto flex min-h-[calc(100vh-72px)] max-w-md items-center px-4 py-12" dir="rtl">
        <div className="w-full">
          <div className="text-center">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-elegant">
              <ShieldCheck className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="mt-4 text-3xl font-extrabold">בחר סיסמה חדשה</h1>
          </div>

          <div className="mt-8 rounded-3xl border border-border/60 bg-card/60 p-6 backdrop-blur-sm shadow-elegant">
            {!ready ? (
              <p className="text-center text-sm text-muted-foreground">מאמת את הקישור…</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
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
                <Button
                  type="submit"
                  className="w-full bg-gradient-primary text-primary-foreground shadow-elegant"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" /> מעדכן…
                    </>
                  ) : (
                    "עדכן סיסמה"
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
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
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Lock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type="password"
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-10"
        />
      </div>
    </div>
  );
}
