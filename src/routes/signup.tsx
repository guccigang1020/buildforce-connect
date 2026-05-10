import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  HardHat, Mail, Lock, User, Building2, ArrowLeft, ShieldCheck, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "הרשמה — BuildForce" },
      { name: "description", content: "פתיחת חשבון BuildForce חינם — קבלן או תאגיד." },
    ],
  }),
  component: SignupPage,
});

type Role = "contractor" | "corporation";

function SignupPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role | null>(null);
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    password: "",
  });

  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: role === "contractor" ? "/dashboard" : "/" });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-card lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-primary shadow-elegant">
              <HardHat className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-extrabold">Build<span className="text-primary">Force</span></span>
          </Link>
          <div className="space-y-6">
            <h2 className="text-4xl font-extrabold leading-tight">
              הצטרף לפלטפורמה<br />
              <span className="text-gradient-primary">המובילה בענף.</span>
            </h2>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-primary" /> פתיחת חשבון חינם, ללא עמלה לקבלן</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-primary" /> אימות מלא של תאגידים</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-primary" /> דירוגים אמיתיים בלבד</li>
            </ul>
          </div>
          <div className="text-xs text-muted-foreground">© {new Date().getFullYear()} BuildForce</div>
        </div>
      </aside>

      <main className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground lg:hidden">
            <HardHat className="h-4 w-4" /> BuildForce
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">פתיחת חשבון</h1>
          <p className="mt-2 text-sm text-muted-foreground">כבר יש לך חשבון? <Link to="/login" className="font-semibold text-primary hover:underline">התחבר</Link></p>

          {!role ? (
            <div className="mt-8 space-y-3">
              <div className="text-sm font-semibold">מי אתה?</div>
              <RoleCard
                icon={HardHat}
                title="קבלן / יזם / חברת בנייה"
                desc="פרסם בקשות וקבל הצעות מתאגידים מאומתים"
                onClick={() => setRole("contractor")}
              />
              <RoleCard
                icon={Building2}
                title="תאגיד כוח אדם"
                desc="קבל גישה לבקשות פעילות והגש הצעות תחרותיות"
                onClick={() => setRole("corporation")}
              />
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-8 space-y-5">
              <button type="button" onClick={() => setRole(null)} className="text-xs font-semibold text-muted-foreground hover:text-foreground">
                ← שינוי סוג חשבון ({role === "contractor" ? "קבלן" : "תאגיד"})
              </button>
              <div>
                <Label htmlFor="name" className="mb-2 block">שם מלא</Label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="name" required value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="ישראל ישראלי" className="h-12 pr-9" maxLength={100} />
                </div>
              </div>
              <div>
                <Label htmlFor="company" className="mb-2 block">{role === "contractor" ? "שם החברה / הקבלן" : "שם התאגיד"}</Label>
                <div className="relative">
                  <Building2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="company" required value={form.company} onChange={(e) => update("company", e.target.value)} placeholder="לדוגמה: דניאל בע״מ" className="h-12 pr-9" maxLength={150} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="email" className="mb-2 block">אימייל</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="email" type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@co.il" className="h-12 pr-9" maxLength={255} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="phone" className="mb-2 block">טלפון</Label>
                  <Input id="phone" type="tel" required value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="050-0000000" className="h-12" maxLength={20} />
                </div>
              </div>
              <div>
                <Label htmlFor="password" className="mb-2 block">סיסמה</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="password" type="password" required value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="לפחות 8 תווים" minLength={8} maxLength={128} className="h-12 pr-9" />
                </div>
              </div>

              <Button type="submit" size="lg" className="h-12 w-full bg-gradient-primary text-base font-semibold text-primary-foreground shadow-elegant hover:opacity-95">
                צור חשבון
                <ArrowLeft className="mr-1 h-4 w-4" />
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                <ShieldCheck className="ml-1 inline h-3 w-3 text-primary" />
                כל החשבונות עוברים אימות זהות לפני אישור.
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

function RoleCard({ icon: Icon, title, desc, onClick }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-start gap-4 rounded-2xl border border-border bg-card p-5 text-right transition-all hover:border-primary hover:shadow-elegant"
    >
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary transition-colors group-hover:bg-gradient-primary group-hover:text-primary-foreground">
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-base font-bold">{title}</div>
        <div className="mt-1 text-sm text-muted-foreground">{desc}</div>
      </div>
      <ArrowLeft className="mt-3 h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-1 group-hover:text-primary" />
    </button>
  );
}