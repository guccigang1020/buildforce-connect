import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  HardHat,
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  User,
  ShieldCheck,
  Building2,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const { session, profile, signOut, hasRole } = useAuth();
  const navigate = useNavigate();
  const isAdmin = hasRole("admin");
  const isCorporation = hasRole("corporation");
  const isContractor = hasRole("contractor");

  const displayName = profile?.full_name || profile?.company_name || "";
  const initial = displayName ? displayName[0].toUpperCase() : "U";

  const links = [
    { label: "איך זה עובד", to: "/" as const, hash: "how" },
    { label: "פלטפורמה", to: "/" as const, hash: "platform" },
    { label: "החיסכון", to: "/" as const, hash: "savings" },
  ];

  const handleSignOut = async () => {
    await signOut();
    toast.success("התנתקת בהצלחה");
    navigate({ to: "/" });
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 md:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary shadow-elegant">
            <HardHat className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-base font-extrabold tracking-tight">
            Build<span className="text-primary">Force</span>
          </span>
        </Link>
        {session && isAdmin && (
          <Button variant="ghost" size="icon" asChild className="md:hidden">
            <Link to="/admin" aria-label="אזור אדמין">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </Link>
          </Button>
        )}
        <nav className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              hash={l.hash}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {session ? (
            <>
              {isAdmin && (
                <Badge variant="outline" className="border-primary/50 text-primary">
                  <ShieldCheck className="ms-1 h-3.5 w-3.5" /> מנהל מערכת
                </Badge>
              )}
              {isAdmin && (
                <Button variant="ghost" size="sm" asChild className="gap-1.5">
                  <Link to="/admin">
                    <ShieldCheck className="h-4 w-4" /> אדמין
                  </Link>
                </Button>
              )}
              {isCorporation ? (
                <Button variant="ghost" size="sm" asChild className="gap-1.5">
                  <Link to="/corporation-dashboard">
                    <Building2 className="h-4 w-4" />
                    {profile?.company_name?.split(" ")[0] ?? "לוח תאגיד"}
                  </Link>
                </Button>
              ) : (
                <Button variant="ghost" size="sm" asChild className="gap-1.5">
                  <Link to="/dashboard">
                    <LayoutDashboard className="h-4 w-4" />
                    {profile?.full_name?.split(" ")[0] ?? "האזור שלי"}
                  </Link>
                </Button>
              )}
              {isContractor && (
                <Button variant="ghost" size="sm" asChild className="gap-1.5">
                  <Link to="/contractor/attendance">
                    <ClipboardList className="h-4 w-4" /> נוכחות
                  </Link>
                </Button>
              )}
              {/* Profile chip */}
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 rounded-full border border-border/60 bg-card/60 py-1 pl-3 pr-1 text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                aria-label="התנתק"
              >
                <div className="grid h-6 w-6 place-items-center rounded-full bg-gradient-primary text-[11px] font-bold text-primary-foreground">
                  {initial}
                </div>
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">התחברות</Link>
              </Button>
              <Button
                size="sm"
                asChild
                className="bg-gradient-primary text-primary-foreground shadow-elegant hover:opacity-95"
              >
                <Link to="/signup">הרשמה חינם</Link>
              </Button>
            </>
          )}
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden text-foreground"
          aria-label="תפריט"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-border/60 bg-background md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
            {links.map((l) => (
              <Link
                key={l.label}
                to={l.to}
                hash={l.hash}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2">
              {session ? (
                <>
                  {isAdmin && (
                    <div className="col-span-2 flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
                      <span className="font-medium text-foreground">
                        {profile?.full_name ?? profile?.user_id ?? "החשבון שלי"}
                      </span>
                      <Badge variant="outline" className="border-primary/50 text-primary">
                        <ShieldCheck className="ms-1 h-3.5 w-3.5" /> מנהל מערכת
                      </Badge>
                    </div>
                  )}
                  {isAdmin && (
                    <Button
                      variant="outline"
                      asChild
                      onClick={() => setOpen(false)}
                      className="col-span-2"
                    >
                      <Link to="/admin">
                        <ShieldCheck className="me-1 h-4 w-4" /> אדמין
                      </Link>
                    </Button>
                  )}
                  {isCorporation ? (
                    <Button variant="outline" asChild onClick={() => setOpen(false)}>
                      <Link to="/corporation-dashboard">
                        <Building2 className="me-1 h-4 w-4" /> לוח תאגיד
                      </Link>
                    </Button>
                  ) : (
                    <Button variant="outline" asChild onClick={() => setOpen(false)}>
                      <Link to="/dashboard">
                        <User className="me-1 h-4 w-4" /> דשבורד
                      </Link>
                    </Button>
                  )}
                  {isContractor && (
                    <Button variant="outline" asChild onClick={() => setOpen(false)}>
                      <Link to="/contractor/attendance">
                        <ClipboardList className="me-1 h-4 w-4" /> נוכחות
                      </Link>
                    </Button>
                  )}
                  <Button variant="outline" onClick={handleSignOut}>
                    <LogOut className="me-1 h-4 w-4" /> התנתק
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" asChild onClick={() => setOpen(false)}>
                    <Link to="/login">התחברות</Link>
                  </Button>
                  <Button
                    asChild
                    className="bg-gradient-primary text-primary-foreground"
                    onClick={() => setOpen(false)}
                  >
                    <Link to="/signup">הרשמה</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
