import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Building2,
  CheckCircle2,
  FolderOpen,
  ShieldCheck,
  Users,
  FileText,
  Menu,
  X,
  LogOut,
  Gavel,
  ClipboardList,
  HardHat,
  Receipt,
  Settings2,
  BarChart3,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  action?: React.ReactNode;
  noPad?: boolean;
}

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

export function AppShell({ children, title, action, noPad }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — RIGHT in RTL (first flex child) */}
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top header */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/60 bg-background/90 px-4 backdrop-blur-sm lg:px-6">
          <button
            type="button"
            aria-label="תפריט"
            className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-secondary lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          {title && (
            <h1 className="truncate text-base font-bold tracking-tight text-foreground lg:text-lg">
              {title}
            </h1>
          )}

          <div className="flex-1" />

          {action && <div className="shrink-0">{action}</div>}
        </header>

        {/* Page content */}
        <main
          className={`flex-1 overflow-y-auto ${
            noPad ? "" : "px-4 py-6 md:px-6 md:py-8 lg:px-8"
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

function Sidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const { profile, hasRole } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isActive = (path: string, exact?: boolean) =>
    exact ? pathname === path : pathname === path || pathname.startsWith(path + "/");

  // Build nav based on roles
  const mainNav: NavItem[] = [];

  if (hasRole("contractor") || hasRole("admin")) {
    mainNav.push({
      to: "/dashboard",
      label: "לוח בקרה",
      icon: LayoutDashboard,
      exact: true,
    });
    mainNav.push({
      to: "/contractor/attendance",
      label: "נוכחות",
      icon: CheckCircle2,
    });
    mainNav.push({
      to: "/contractor/projects",
      label: "פרויקטים",
      icon: FolderOpen,
    });
    mainNav.push({
      to: "/contractor/accounts",
      label: "חשבון יומי",
      icon: ClipboardList,
    });
  }

  if (hasRole("corporation") || hasRole("admin")) {
    mainNav.push({
      to: "/corporation-dashboard",
      label: "לוח תאגיד",
      icon: Building2,
      exact: true,
    });
    mainNav.push({
      to: "/corporation/accounts",
      label: "חשבונות",
      icon: Receipt,
    });
    mainNav.push({
      to: "/corporation/financial",
      label: "דשבורד פיננסי",
      icon: BarChart3,
    });
    mainNav.push({
      to: "/corporation/pricing",
      label: "תמחור",
      icon: Settings2,
    });
  }

  if (hasRole("team_leader") || hasRole("admin")) {
    mainNav.push({
      to: "/team-leader",
      label: "ראש צוות",
      icon: Users,
    });
  }

  if (hasRole("labor_supplier") || hasRole("admin")) {
    mainNav.push({
      to: "/labor-supplier/attendance",
      label: "ספק כוח אדם",
      icon: HardHat,
    });
  }

  const adminNav: NavItem[] = hasRole("admin")
    ? [
        { to: "/admin", label: "מנהל מערכת", icon: ShieldCheck, exact: true },
      ]
    : [];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const displayName = profile?.full_name ?? profile?.company_name ?? "משתמש";
  const initial = displayName[0]?.toUpperCase() ?? "?";

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Logo area */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-sidebar-border px-4">
        <Link
          to="/"
          className="flex items-center gap-2 text-sidebar-foreground hover:opacity-90"
          onClick={onClose}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow-sm">
            <Gavel className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-extrabold tracking-tight">BuildForce</span>
        </Link>
        <button
          type="button"
          className="grid h-7 w-7 place-items-center rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground lg:hidden"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {mainNav.map((item) => (
          <NavLink
            key={item.to}
            item={item}
            active={isActive(item.to, item.exact)}
            onClick={onClose}
          />
        ))}

        {adminNav.length > 0 && (
          <>
            <div className="mx-2 my-3 h-px bg-sidebar-border" />
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/40">
              ניהול
            </div>
            {adminNav.map((item) => (
              <NavLink
                key={item.to}
                item={item}
                active={isActive(item.to, item.exact)}
                onClick={onClose}
              />
            ))}
          </>
        )}

        <div className="mx-2 my-3 h-px bg-sidebar-border" />
        <NavLink
          item={{ to: "/", label: "אתר ראשי", icon: FileText }}
          active={false}
          onClick={onClose}
        />
      </nav>

      {/* User footer */}
      <div className="shrink-0 border-t border-sidebar-border p-2">
        <div className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-sidebar-accent">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-primary text-[11px] font-extrabold text-primary-foreground shadow-glow-sm">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-sidebar-foreground">
              {displayName}
            </div>
            <div className="truncate text-[10px] text-sidebar-foreground/50">
              {profile?.city ?? ""}
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            title="התנתק"
            className="grid h-7 w-7 place-items-center rounded-lg text-sidebar-foreground/40 transition-colors hover:bg-destructive/15 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-[220px] shrink-0 border-l border-sidebar-border lg:flex lg:flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar (fixed overlay) */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-[260px] flex-col transition-transform duration-300 ease-in-out lg:hidden ${
          mobileOpen ? "flex translate-x-0" : "translate-x-full"
        }`}
      >
        <SidebarContent />
      </aside>
    </>
  );
}

function NavLink({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
        active
          ? "bg-sidebar-primary/15 font-semibold text-sidebar-primary"
          : "font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
      }`}
    >
      <Icon
        className={`h-4 w-4 shrink-0 ${
          active ? "text-sidebar-primary" : "text-sidebar-foreground/50"
        }`}
      />
      <span>{item.label}</span>
      {active && (
        <div className="me-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" />
      )}
    </Link>
  );
}
