import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { UserPlus, Mail, Lock, User, Phone, Building2, MapPin, Loader2, HardHat, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteNav } from "@/components/site-nav";

const signupSchema = z.object({
  full_name: z.string().trim().min(2, "שם מלא נדרש").max(100),
  email: z.string().trim().email("אימייל לא תקין").max(255),
  phone: z.string().trim().min(9, "מספר טלפון לא תקין").max(20).regex(/^[0-9+\-\s()]+$/, "מספר טלפון לא תקין"),
  password: z.string().min(6, "סיסמה לפחות 6 תווים").max(72),
  company_name: z.string().trim().max(150).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  role: z.enum(["contractor", "corporation"]),
});

type RoleChoice = "contractor" | "corporation";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [role, setRole] = useState<RoleChoice>("contractor");
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", password: "", company_name: "", city: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard" });
  }, [loading, session, navigate]);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signupSchema.safeParse({ ...form, role });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "פרטים לא תקינים");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          full_name: parsed.data.full_name,
          phone: parsed.data.phone,
          company_name: parsed.data.company_name || null,
          city: parsed.data.city || null,
          role: parsed.data.role,
        },
      },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message.includes("already") ? "המשתמש כבר רשום — נסה להתחבר" : error.message);
      return;
    }
    toast.success("נרשמת בהצלחה! בדוק את האימייל לאישור החשבון.");
    navigate({ to: "/login" });
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setSubmitting(false);
      toast.error("הרשמה עם Google נכשלה");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-xl px-4 py-12">
        <div className="text-center">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-elegant">
            <UserPlus className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="mt-4 text-3xl font-extrabold">הצטרף ל-BuildForce</h1>
          <p className="mt-1 text-sm text-muted-foreground">פתח חשבון בחינם — תוך 2 דקות</p>
        </div>

        <div className="mt-8 rounded-3xl border border-border/60 bg-card/60 p-6 backdrop-blur-sm shadow-elegant">
          {/* Role picker */}
          <div className="mb-5">
            <Label className="mb-2 block">אני…</Label>
            <div className="grid grid-cols-2 gap-2">
              <RoleCard active={role === "contractor"} onClick={() => setRole("contractor")}
                icon={HardHat} title="קבלן / יזם" sub="פותח בקשות לפועלים" />
              <RoleCard active={role === "corporation"} onClick={() => setRole("corporation")}
                icon={Briefcase} title="תאגיד כוח אדם" sub="שולח הצעות לקבלנים" />
            </div>
          </div>

          <Button type="button" variant="outline" className="w-full" onClick={handleGoogle} disabled={submitting}>
            <GoogleIcon /> הרשמה עם Google
          </Button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> או <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field id="full_name" label="שם מלא" icon={User} required value={form.full_name} onChange={update("full_name")} />
            <div className="grid gap-4 md:grid-cols-2">
              <Field id="email" label="אימייל" type="email" icon={Mail} required value={form.email} onChange={update("email")} />
              <Field id="phone" label="טלפון" type="tel" icon={Phone} required value={form.phone} onChange={update("phone")} placeholder="050-1234567" />
            </div>
            <Field id="password" label="סיסמה" type="password" icon={Lock} required value={form.password} onChange={update("password")} placeholder="לפחות 6 תווים" />
            <div className="grid gap-4 md:grid-cols-2">
              <Field id="company_name" label={role === "corporation" ? "שם התאגיד" : "שם החברה (אופציונלי)"} icon={Building2}
                required={role === "corporation"} value={form.company_name} onChange={update("company_name")} />
              <Field id="city" label="עיר" icon={MapPin} value={form.city} onChange={update("city")} />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "צור חשבון"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          כבר יש לך חשבון? <Link to="/login" className="font-bold text-primary hover:underline">התחבר</Link>
        </p>
      </main>
    </div>
  );
}

function RoleCard({ active, onClick, icon: Icon, title, sub }: {
  active: boolean; onClick: () => void;
  icon: React.ComponentType<{ className?: string }>; title: string; sub: string;
}) {
  return (
    <button type="button" onClick={onClick}
      className={`group rounded-2xl border p-4 text-right transition-all ${
        active ? "border-primary bg-primary/10 shadow-elegant" : "border-border bg-card/40 hover:border-primary/50"
      }`}>
      <div className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl ${
        active ? "bg-gradient-primary text-primary-foreground" : "bg-secondary text-foreground"
      }`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-sm font-extrabold">{title}</div>
      <div className="text-[11px] text-muted-foreground">{sub}</div>
    </button>
  );
}

function Field({
  id, label, icon: Icon, type = "text", required, value, onChange, placeholder,
}: {
  id: string; label: string;
  icon: React.ComponentType<{ className?: string }>;
  type?: string; required?: boolean;
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}{required && <span className="ms-1 text-destructive">*</span>}</Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input id={id} type={type} required={required} value={value} onChange={onChange}
          className="pr-10" placeholder={placeholder} />
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="ms-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#EA4335" d="M12 11v3.6h5.1c-.2 1.4-1.6 4-5.1 4-3 0-5.5-2.5-5.5-5.6S8.9 7.4 12 7.4c1.7 0 2.9.7 3.5 1.3l2.4-2.3C16.4 5 14.4 4 12 4 7.6 4 4 7.6 4 12s3.6 8 8 8c4.6 0 7.6-3.2 7.6-7.7 0-.5-.1-.9-.1-1.3H12z"/>
    </svg>
  );
}
