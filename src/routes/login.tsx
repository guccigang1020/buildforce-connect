import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { HardHat, Mail, Lock, ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "התחברות — BuildForce" },
      { name: "description", content: "התחברות לחשבון BuildForce שלך." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Side panel */}
      <aside className="relative hidden overflow-hidden bg-card lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-primary shadow-elegant">
              <HardHat className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-extrabold">Build<span className="text-primary">Force</span></span>
          </Link>
          <div className="space-y-6">
            <h2 className="text-4xl font-extrabold leading-tight">
              ברוך שובך.<br />
              <span className="text-gradient-primary">הצוות הבא שלך מחכה.</span>
            </h2>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-primary" /> 340+ תאגידים מאומתים</li>
              <li className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-primary" /> 12,400 עובדים זמינים</li>
              <li className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-primary" /> הצעות תוך פחות מ-24 שעות</li>
            </ul>
          </div>
          <div className="text-xs text-muted-foreground">© {new Date().getFullYear()} BuildForce</div>
        </div>
      </aside>

      {/* Form */}
      <main className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground lg:hidden">
            <HardHat className="h-4 w-4" /> BuildForce
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">התחברות</h1>
          <p className="mt-2 text-sm text-muted-foreground">אין לך חשבון עדיין? <Link to="/signup" className="font-semibold text-primary hover:underline">הרשם בחינם</Link></p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div>
              <Label htmlFor="email" className="mb-2 block">אימייל</Label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.co.il" className="h-12 pr-9" maxLength={255} />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label htmlFor="password">סיסמה</Label>
                <button type="button" className="text-xs font-semibold text-primary hover:underline">שכחת סיסמה?</button>
              </div>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-12 pr-9" maxLength={128} />
              </div>
            </div>

            <Button type="submit" size="lg" className="h-12 w-full bg-gradient-primary text-base font-semibold text-primary-foreground shadow-elegant hover:opacity-95">
              התחבר
              <ArrowLeft className="mr-1 h-4 w-4" />
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-background px-3 text-muted-foreground">או</span></div>
            </div>

            <Button type="button" variant="outline" size="lg" className="h-12 w-full">
              המשך עם Google
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            המשך מהווה הסכמה ל<a href="#" className="underline hover:text-foreground">תנאי השימוש</a> ול<a href="#" className="underline hover:text-foreground">מדיניות הפרטיות</a>.
          </p>
        </div>
      </main>
    </div>
  );
}