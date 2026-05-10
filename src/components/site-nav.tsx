import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { HardHat, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const links = [
    { label: "איך זה עובד", to: "/" as const, hash: "how" },
    { label: "תאגידים", to: "/" as const, hash: "corps" },
    { label: "לוח בקרה", to: "/dashboard" as const },
    { label: "לוח תאגיד", to: "/corporation-dashboard" as const },
    { label: "פרסום בקשה", to: "/new-request" as const },
  ];
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-primary shadow-elegant">
            <HardHat className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-extrabold tracking-tight">
            Build<span className="text-primary">Force</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              hash={l.hash}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeOptions={{ exact: true }}
              activeProps={{ className: "text-foreground" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/login">התחברות</Link>
          </Button>
          <Button
            size="sm"
            asChild
            className="bg-gradient-primary text-primary-foreground shadow-elegant hover:opacity-95"
          >
            <Link to="/signup">הרשמה</Link>
          </Button>
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
            </div>
          </div>
        </div>
      )}
    </header>
  );
}