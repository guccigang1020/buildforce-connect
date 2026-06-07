import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { KeyRound, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = z.string().email("אימייל לא תקין").safeParse(email.trim());
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "אימייל לא תקין");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
    toast.success("שלחנו קישור לאיפוס סיסמה לאימייל שלך");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto flex min-h-[calc(100vh-72px)] max-w-md items-center px-4 py-12" dir="rtl">
        <div className="w-full">
          <div className="text-center">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-elegant">
              <KeyRound className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="mt-4 text-3xl font-extrabold">שכחת סיסמה?</h1>
            <p className="mt-1 text-sm text-muted-foreground">נשלח לך קישור לאיפוס לאימייל</p>
          </div>

          <div className="mt-8 rounded-3xl border border-border/60 bg-card/60 p-6 backdrop-blur-sm shadow-elegant">
            {sent ? (
              <div className="text-center">
                <p className="text-sm">בדוק את תיבת המייל שלך — שלחנו קישור לאיפוס סיסמה.</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  לא הגיע? בדוק בספאם או נסה שוב.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">אימייל</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pr-10"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "שלח קישור איפוס"}
                </Button>
              </form>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link to="/login" className="font-bold text-primary hover:underline">
              חזור להתחברות
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
