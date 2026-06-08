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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/hooks/use-auth";

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

type NavSection = {
  label: string;
  items: NavItem[];
};

function getRoleLabel(hasRole: (role: AppRole) => boolean): string {
  if (hasRole("admin")) return "מנהל מערכת";
  if (hasRole("corporation")) return "תאגיד";
  if (hasRole("contractor")) return "קבלן";
  if (hasRole("team_leader")) return "ראש צוות";
  if (hasRole("labor_supplier")) return "ספק כוח אדם";
  return "";
}

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

      {/* Sidebar — RIGHT side in RTL */}
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Premium header */}
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border/50 bg-background/95 px-4 backdrop-blur-md lg:px-8">
          {/* Mobile hamburger — 44×44 touch target */}
          <button
            type="button"
            aria-label="תפריט"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Page title */}
          {title && (
            <h1 className="min-w-0 truncate text-lg font-extrabold tracking-tight text-foreground lg:text-xl">
              {title}
            </h1>
          )}

          <div className="flex-1" />

          {/* Action area */}
          {action && (
            <div className="flex shrink-0 items-center gap-3">
              <div className="hidden h-6 w-px bg-border/50 sm:block" />
              {action}
            </div>
          )}
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

  // Build sectioned nav by role
  const sections: NavSection[] = [];

  if (hasRole("contractor") || hasRole("admin")) {
    sections.push({
      label: "מרכז מכרזים",
      items: [
        { to: "/dashboard", label: "לוח בקרה", icon: LayoutDashboard, exact: true },
      ],
    });
    sections.push({
      label: "נוכחות ואימות",
      items: [
        { to: "/contractor/attendance", label: "נוכחות", icon: CheckCircle2 },
        { to: "/contractor/projects", label: "פרויקטים", icon: FolderOpen },
      ],
    });
    sections.push({
      label: "חשבון יומי",
      items: [
        { to: "/contractor/accounts", label: "חשבון יומי", icon: ClipboardList },
      ],
    });
  }

  if (hasRole("corporation") || hasRole("admin")) {
    sections.push({
      label: "תאגיד",
      items: [
        { to: "/corporation-dashboard", label: "לוח תאגיד", icon: Building2, exact: true },
        { to: "/corporation/accounts", label: "חשבונות", icon: Receipt },
      ],
    });
  }

  if (hasRole("team_leader") || hasRole("admin")) {
    sections.push({
      label: "ניהול צוות",
      items: [
        { to: "/team-leader", label: "ראש צוות", icon: Users },
      ],
    });
  }

  if (hasRole("labor_supplier") || hasRole("admin")) {
    sections.push({
      label: "כוח אדם",
      items: [
        { to: "/labor-supplier/attendance", label: "ספק כוח אדם", icon: HardHat },
      ],
    });
  }

  const adminSection: NavSection | null = hasRole("admin")
    ? {
        label: "מנהל מערכת",
        items: [{ to: "/admin", label: "מנהל מערכת", icon: ShieldCheck, exact: true }],
      }
    : null;

  const roleLabel = getRoleLabel(hasRole);
  const displayName = profile?.full_name ?? profile?.company_name ?? "משתמש";
  const initial = displayName[0]?.toUpperCase() ?? "?";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-sidebar">
      {/* ── Logo area ── */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border/70 px-4">
        <Link
          to="/"
          className="flex items-center gap-2.5 text-sidebar-foreground transition-opacity hover:opacity-90"
          onClick={onClose}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-primary shadow-glow-sm">
            <Gavel className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="leading-none">
            <div className="text-sm font-extrabold tracking-tight">BuildForce</div>
            <div className="mt-[3px] text-[9px] font-bold uppercase tracking-[0.15em] text-sidebar-foreground/35">
              Prime
            </div>
          </div>
        </Link>

        {/* Mobile close */}
        <button
          type="button"
          className="grid h-8 w-8 place-items-center rounded-lg text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground lg:hidden"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <div className="space-y-4">
          {sections.map((section, si) => (
            <div key={si}>
              <div className="nav-section-label mb-1.5">{section.label}</div>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    item={item}
                    active={isActive(item.to, item.exact)}
                    onClick={onClose}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Admin section */}
          {adminSection && (
            <>
              <div className="mx-1 h-px bg-sidebar-border/50" />
              <div>
                <div className="nav-section-label mb-1.5">{adminSection.label}</div>
                <div className="space-y-0.5">
                  {adminSection.items.map((item) => (
                    <NavLink
                      key={item.to}
                      item={item}
                      active={isActive(item.to, item.exact)}
                      onClick={onClose}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Site link */}
          <div className="mx-1 h-px bg-sidebar-border/50" />
          <NavLink
            item={{ to: "/", label: "אתר ראשי", icon: FileText }}
            active={false}
            onClick={onClose}
          />
        </div>
      </nav>

      {/* ── User footer ── */}
      <div className="shrink-0 border-t border-sidebar-border/70 p-3">
        <div className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-sidebar-accent/70">
          {/* Avatar */}
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-primary text-[13px] font-extrabold text-primary-foreground shadow-glow-sm">
            {initial}
          </div>

          {/* Name + role */}
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="truncate text-xs font-semibold leading-tight text-sidebar-foreground">
              {displayName}
            </div>
            {roleLabel && (
              <div className="mt-1">
                <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary/12 px-1.5 py-px text-[10px] font-semibold leading-none text-primary/80">
                  {roleLabel}
                </span>
              </div>
            )}
          </div>

          {/* Sign-out — revealed on hover */}
          <button
            type="button"
            onClick={handleSignOut}
            title="התנתק"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sidebar-foreground/30 opacity-0 transition-all duration-150 hover:bg-destructive/15 hover:text-destructive group-hover:opacity-100"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-[var(--sidebar-width)] shrink-0 border-l border-sidebar-border lg:flex lg:flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-[var(--sidebar-width)] flex-col bg-sidebar shadow-2xl-app transition-transform duration-300 ease-in-out lg:hidden ${
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
      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-150 ${
        active
          ? "border-r-2 border-sidebar-primary bg-sidebar-primary/15 font-bold text-sidebar-primary"
          : "font-medium text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground"
      }`}
    >
      <Icon
        className={`h-4 w-4 shrink-0 transition-colors ${
          active ? "text-sidebar-primary" : "text-sidebar-foreground/45"
        }`}
      />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
    </Link>
  );
}
