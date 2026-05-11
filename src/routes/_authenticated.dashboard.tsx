import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, FileText, Users, Building2, BadgeCheck, MapPin, Phone, LogOut, Plus, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/site-nav";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { profile, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const isContractor = roles.includes("contractor");
  const isCorp = roles.includes("corporation");
  const isAdmin = roles.includes("admin");

  const handleSignOut = async () => {
    await signOut();
    toast.success("התנתקת בהצלחה");
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        {/* Welcome card */}
        <div className="relative overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/15 via-background to-background p-6 shadow-elegant md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-primary">
                <LayoutDashboard className="h-3 w-3" /> דשבורד אישי
              </div>
              <h1 className="mt-3 text-2xl font-extrabold md:text-3xl">
                שלום, {profile?.full_name?.split(" ")[0] ?? "משתמש"} 👋
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {isContractor && "פתח בקשה חדשה וקבל הצעות מתאגידי כוח אדם תוך שעות."}
                {isCorp && "צפה בבקשות פתוחות ושלח הצעות תחרותיות."}
                {isAdmin && "ניהול הפלטפורמה."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isContractor && (
                <Link to="/post">
                  <Button className="gap-2"><Plus className="h-4 w-4" /> פתח בקשה</Button>
                </Link>
              )}
              {isCorp && (
                <Link to="/marketplace">
                  <Button className="gap-2"><FileText className="h-4 w-4" /> צפה בבקשות</Button>
                </Link>
              )}
              <Button variant="outline" onClick={handleSignOut} className="gap-2">
                <LogOut className="h-4 w-4" /> התנתק
              </Button>
            </div>
          </div>
        </div>

        {/* Profile + role tiles */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <ProfileCard
            label="פרטי משתמש"
            rows={[
              { icon: Phone, value: profile?.phone ?? "—" },
              { icon: Building2, value: profile?.company_name ?? "—" },
              { icon: MapPin, value: profile?.city ?? "—" },
            ]}
          />
          <Tile
            icon={BadgeCheck}
            title="סטטוס אימות"
            value={profile?.is_verified ? "מאומת" : "ממתין לאימות"}
            sub={profile?.is_verified ? "החשבון שלך מאומת ופעיל" : "אנו נצור איתך קשר תוך 24 שעות"}
            tone={profile?.is_verified ? "success" : "warn"}
          />
          <Tile
            icon={Users}
            title="התפקיד שלך"
            value={
              roles.length === 0 ? "—" :
              roles.includes("admin") ? "אדמין" :
              roles.includes("corporation") ? "תאגיד כוח אדם" : "קבלן / יזם"
            }
            sub="ניתן לשנות בהגדרות"
            tone="primary"
          />
        </div>

        {/* Quick links */}
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {isContractor && (
            <QuickLink to="/post" title="פתח בקשה חדשה" desc="קבל הצעות מ-3+ תאגידים תוך שעות" />
          )}
          {(isContractor || isCorp) && (
            <QuickLink to="/marketplace" title="לוח בקשות פעילות" desc="צפה במכרזים פתוחים בזמן אמת" />
          )}
        </div>
      </main>
    </div>
  );
}

function ProfileCard({ label, rows }: { label: string; rows: { icon: React.ComponentType<{ className?: string }>; value: string }[] }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <ul className="mt-3 space-y-2">
        {rows.map(({ icon: Icon, value }, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Tile({
  icon: Icon, title, value, sub, tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string; value: string; sub: string;
  tone: "primary" | "success" | "warn";
}) {
  const palette =
    tone === "success" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
    : tone === "warn" ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
    : "border-primary/40 bg-primary/10 text-primary";
  return (
    <div className={`rounded-2xl border p-5 ${palette}`}>
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider opacity-80">
        <Icon className="h-3.5 w-3.5" /> {title}
      </div>
      <div className="mt-1 text-xl font-extrabold text-foreground">{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function QuickLink({ to, title, desc }: { to: string; title: string; desc: string }) {
  return (
    <Link to={to} className="group flex items-center justify-between rounded-2xl border border-border/60 bg-card/60 p-5 transition-all hover:border-primary/50 hover:shadow-elegant">
      <div>
        <div className="text-base font-extrabold">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <ArrowLeft className="h-5 w-5 text-primary transition-transform group-hover:-translate-x-1" />
    </Link>
  );
}
