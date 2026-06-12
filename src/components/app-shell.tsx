import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ApartmentIcon from "@mui/icons-material/Apartment";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import GroupIcon from "@mui/icons-material/Group";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import LogoutIcon from "@mui/icons-material/Logout";
import AssignmentIcon from "@mui/icons-material/Assignment";
import EngineeringIcon from "@mui/icons-material/Engineering";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { CommandPalette } from "@/components/command-palette";
import { AppBreadcrumbs } from "@/components/app-breadcrumbs";
import { ThemeSwitch } from "@/components/theme-switch";

export interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  action?: React.ReactNode;
  noPad?: boolean;
}

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string; sx?: object }>;
  exact?: boolean;
  /** Feature exists as a polished placeholder only — shown with a "בקרוב" tag. */
  comingSoon?: boolean;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

function getRoleLabel(hasRole: (role: AppRole) => boolean): string {
  if (hasRole("admin")) return "מנהל מערכת";
  if (hasRole("corporation")) return "תאגיד כוח אדם";
  if (hasRole("contractor")) return "קבלן";
  if (hasRole("team_leader")) return "ראש צוות";
  return "";
}

export function AppShell({ children, title, action, noPad }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[2px] lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — RIGHT side in RTL */}
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Slim header */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4 lg:px-8">
          <button
            type="button"
            aria-label="תפריט"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <MenuIcon sx={{ fontSize: 20 }} />
          </button>

          {title && (
            <h1 className="min-w-0 truncate text-[15px] font-semibold text-foreground">{title}</h1>
          )}

          <div className="flex-1" />

          <ThemeSwitch />

          {action && <div className="flex shrink-0 items-center gap-3">{action}</div>}
        </header>

        {/* Page content */}
        <main
          className={`flex-1 overflow-y-auto ${noPad ? "" : "px-4 py-6 md:px-6 md:py-7 lg:px-8"}`}
        >
          {!noPad && <AppBreadcrumbs className="mb-4" />}
          {children}
        </main>
      </div>

      {/* Global ⌘K command palette */}
      <CommandPalette />
    </div>
  );
}

function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const { profile, hasRole } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isActive = (path: string, exact?: boolean) =>
    exact ? pathname === path : pathname === path || pathname.startsWith(path + "/");

  // Nav is built strictly from the single role this account holds.
  // Unfinished features stay visible (so the roadmap is tangible) but carry a
  // "בקרוב" tag and lead to a polished coming-soon screen.
  const sections: NavSection[] = [];

  if (hasRole("contractor")) {
    sections.push({
      label: "מכרזים",
      items: [{ to: "/dashboard", label: "לוח בקרה", icon: DashboardIcon, exact: true }],
    });
    sections.push({
      label: "ביצוע",
      items: [
        { to: "/contractor/projects", label: "פרויקטים", icon: FolderOpenIcon, comingSoon: true },
        { to: "/contractor/attendance", label: "נוכחות", icon: CheckCircleIcon, comingSoon: true },
        {
          to: "/contractor/accounts",
          label: "חשבון יומי",
          icon: AssignmentIcon,
          comingSoon: true,
        },
      ],
    });
  }

  if (hasRole("corporation")) {
    sections.push({
      label: "מכרזים",
      items: [
        { to: "/corporation-dashboard", label: "לוח תאגיד", icon: ApartmentIcon, exact: true },
      ],
    });
    sections.push({
      label: "ביצוע",
      items: [
        {
          to: "/corporation/attendance",
          label: "נוכחות צוותים",
          icon: EngineeringIcon,
          comingSoon: true,
        },
        { to: "/corporation/accounts", label: "חשבונות", icon: ReceiptLongIcon, comingSoon: true },
      ],
    });
  }

  if (hasRole("team_leader")) {
    sections.push({
      label: "צוות",
      items: [{ to: "/team-leader", label: "ראש צוות", icon: GroupIcon, comingSoon: true }],
    });
  }

  if (hasRole("admin")) {
    sections.push({
      label: "ניהול",
      items: [{ to: "/admin", label: "מנהל מערכת", icon: VerifiedUserIcon, exact: true }],
    });
  }

  const roleLabel = getRoleLabel(hasRole);
  const displayName = profile?.full_name ?? profile?.company_name ?? "משתמש";
  const initial = displayName[0]?.toUpperCase() ?? "?";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-sidebar">
      {/* ── Logo ── */}
      <div className="flex h-14 shrink-0 items-center justify-between px-4">
        <Link
          to="/"
          className="flex items-center gap-2 text-sidebar-foreground transition-opacity hover:opacity-80"
          onClick={onClose}
        >
          <div className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary text-[13px] font-bold text-primary-foreground">
            B
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">BuildForce</span>
        </Link>

        <button
          type="button"
          aria-label="סגור תפריט"
          className="grid h-10 w-10 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
          onClick={onClose}
        >
          <CloseIcon sx={{ fontSize: 16 }} />
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <div className="space-y-5">
          {sections.map((section, si) => (
            <div key={si}>
              <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
                {section.label}
              </div>
              <div className="space-y-px">
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
        </div>
      </nav>

      {/* ── User footer ── */}
      <div className="shrink-0 border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
            {initial}
          </div>
          <div className="min-w-0 flex-1 overflow-hidden leading-tight">
            <div className="truncate text-xs font-medium text-foreground">{displayName}</div>
            {roleLabel && (
              <div className="truncate text-[11px] text-muted-foreground">{roleLabel}</div>
            )}
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            title="התנתק"
            aria-label="התנתק"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-muted-foreground/70 transition-colors hover:bg-muted hover:text-destructive"
          >
            <LogoutIcon sx={{ fontSize: 16 }} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-[232px] shrink-0 border-l border-sidebar-border lg:flex lg:flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-[260px] flex-col border-l border-sidebar-border bg-sidebar shadow-2xl-app transition-transform duration-200 ease-out lg:hidden ${
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
      className={`group flex min-h-9 items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors duration-100 ${
        active
          ? "border border-border bg-background font-semibold text-primary shadow-xs"
          : "border border-transparent font-medium text-muted-foreground hover:bg-surface-active hover:text-foreground"
      }`}
    >
      <Icon
        sx={{ fontSize: 16 }}
        className={`shrink-0 ${active ? "text-primary" : "text-muted-foreground/70 group-hover:text-foreground"}`}
      />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.comingSoon && (
        <span className="shrink-0 rounded border border-border bg-muted px-1 py-px text-[9px] font-semibold text-muted-foreground">
          בקרוב
        </span>
      )}
    </Link>
  );
}
