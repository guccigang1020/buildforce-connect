import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import MailOutlineIcon from "@mui/icons-material/MailOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlined";
import CircularProgress from "@mui/material/CircularProgress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { mapAuthError } from "@/lib/auth-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setFormError(null);
    const parsed = z.string().email("אימייל לא תקין").safeParse(email.trim());
    if (!parsed.success) {
      setEmailError(parsed.error.issues[0]?.message ?? "אימייל לא תקין");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: "https://buildforce-connect.lovable.app/reset-password",
    });
    setSubmitting(false);
    if (error) {
      const mapped = mapAuthError(error.message);
      if (mapped.target === "email") {
        setEmailError(mapped.message);
      } else {
        setFormError(mapped.message);
      }
      return;
    }
    setSent(true);
    toast.success("שלחנו קישור לאיפוס סיסמה לאימייל שלך");
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

        <h1 className="mb-6 text-center text-xl font-semibold text-foreground">שכחת סיסמה?</h1>

        {/* Form card */}
        <div className="rounded-lg border border-border p-6">
          {sent ? (
            <div className="py-2 text-center">
              <p className="text-sm font-medium">
                בדוק את תיבת המייל שלך — שלחנו קישור לאיפוס סיסמה.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                לא הגיע? בדוק בספאם או נסה שוב.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {formError && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
                  <ErrorOutlineIcon sx={{ fontSize: 16 }} className="mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium">
                  אימייל
                </Label>
                <div className="relative">
                  <MailOutlineIcon sx={{ fontSize: 16 }} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError(null);
                    }}
                    aria-invalid={emailError ? true : undefined}
                    className={`h-10 pr-10 ${emailError ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30" : ""}`}
                    placeholder="you@example.com"
                  />
                </div>
                {emailError && (
                  <p className="flex items-center gap-1 text-xs font-medium text-destructive">
                    <ErrorOutlineIcon sx={{ fontSize: 12 }} className="shrink-0" />
                    {emailError}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <CircularProgress size={16} color="inherit" className="ms-2" /> שולח…
                  </>
                ) : (
                  "שלח קישור איפוס"
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
