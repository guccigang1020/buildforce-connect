import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import EngineeringIcon from "@mui/icons-material/Engineering";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import LogoutIcon from "@mui/icons-material/Logout";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PersonIcon from "@mui/icons-material/Person";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import ApartmentIcon from "@mui/icons-material/Apartment";
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
            <EngineeringIcon sx={{ fontSize: 16 }} className="text-primary-foreground" />
          </div>
          <span className="text-base font-extrabold tracking-tight">
            Build<span className="text-primary">Force</span>
          </span>
        </Link>
        {session && isAdmin && (
          <Button variant="ghost" size="icon" asChild className="md:hidden">
            <Link to="/admin" aria-label="אזור אדמין">
              <VerifiedUserIcon sx={{ fontSize: 20 }} className="text-primary" />
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
                  <VerifiedUserIcon sx={{ fontSize: 14 }} className="ms-1" /> מנהל מערכת
                </Badge>
              )}
              {isAdmin && (
                <Button variant="ghost" size="sm" asChild className="gap-1.5">
                  <Link to="/admin">
                    <VerifiedUserIcon sx={{ fontSize: 16 }} /> אדמין
                  </Link>
                </Button>
              )}
              {isCorporation && (
                <Button variant="ghost" size="sm" asChild className="gap-1.5">
                  <Link to="/corporation-dashboard">
                    <ApartmentIcon sx={{ fontSize: 16 }} />
                    {profile?.company_name?.split(" ")[0] ?? "לוח תאגיד"}
                  </Link>
                </Button>
              )}
              {isContractor && (
                <Button variant="ghost" size="sm" asChild className="gap-1.5">
                  <Link to="/dashboard">
                    <DashboardIcon sx={{ fontSize: 16 }} />
                    {profile?.full_name?.split(" ")[0] ?? "האזור שלי"}
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
                <LogoutIcon sx={{ fontSize: 14 }} />
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
          className="grid h-10 w-10 place-items-center text-foreground md:hidden"
          aria-label="תפריט"
        >
          {open ? <CloseIcon sx={{ fontSize: 24 }} /> : <MenuIcon sx={{ fontSize: 24 }} />}
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
                className="flex items-center rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
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
                        <VerifiedUserIcon sx={{ fontSize: 14 }} className="ms-1" /> מנהל מערכת
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
                        <VerifiedUserIcon sx={{ fontSize: 16 }} className="me-1" /> אדמין
                      </Link>
                    </Button>
                  )}
                  {isCorporation && (
                    <Button variant="outline" asChild onClick={() => setOpen(false)}>
                      <Link to="/corporation-dashboard">
                        <ApartmentIcon sx={{ fontSize: 16 }} className="me-1" /> לוח תאגיד
                      </Link>
                    </Button>
                  )}
                  {isContractor && (
                    <Button variant="outline" asChild onClick={() => setOpen(false)}>
                      <Link to="/dashboard">
                        <PersonIcon sx={{ fontSize: 16 }} className="me-1" /> דשבורד
                      </Link>
                    </Button>
                  )}
                  <Button variant="outline" onClick={handleSignOut}>
                    <LogoutIcon sx={{ fontSize: 16 }} className="me-1" /> התנתק
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
