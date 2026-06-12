import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Building2, ShieldCheck, Users, Plus, Home, LogOut } from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from "@/components/ui/command";
import { useAuth } from "@/hooks/use-auth";

/**
 * Global command palette (⌘K / Ctrl+K). Built on the project's native cmdk
 * `CommandDialog`, wired to the real role-based routes — not the demo CRM nav.
 *
 * Open it from anywhere by dispatching `window` event
 * `EVENT_OPEN_COMMAND` (or just press ⌘K / Ctrl+K).
 */
export const EVENT_OPEN_COMMAND = "buildforce:open-command";

type Action = {
  id: string;
  label: string;
  icon: React.ReactNode;
  run: () => void;
  shortcut?: string;
};

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();
  const { hasRole, signOut } = useAuth();

  // ⌘K / Ctrl+K + external open event
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpen = () => setOpen(true);
    document.addEventListener("keydown", onKey);
    window.addEventListener(EVENT_OPEN_COMMAND, onOpen);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener(EVENT_OPEN_COMMAND, onOpen);
    };
  }, []);

  const go = React.useCallback((fn: () => void) => {
    setOpen(false);
    // Defer so the dialog close animation doesn't fight the route change.
    requestAnimationFrame(fn);
  }, []);

  const navItems: Action[] = [];
  if (hasRole("contractor")) {
    navItems.push({
      id: "dashboard",
      label: "לוח בקרה",
      icon: <LayoutDashboard className="h-4 w-4" />,
      run: () => go(() => void navigate({ to: "/dashboard" })),
    });
  }
  if (hasRole("corporation")) {
    navItems.push({
      id: "corporation-dashboard",
      label: "לוח תאגיד",
      icon: <Building2 className="h-4 w-4" />,
      run: () => go(() => void navigate({ to: "/corporation-dashboard" })),
    });
  }
  if (hasRole("team_leader")) {
    navItems.push({
      id: "team-leader",
      label: "ראש צוות",
      icon: <Users className="h-4 w-4" />,
      run: () => go(() => void navigate({ to: "/team-leader" })),
    });
  }
  if (hasRole("admin")) {
    navItems.push({
      id: "admin",
      label: "מנהל מערכת",
      icon: <ShieldCheck className="h-4 w-4" />,
      run: () => go(() => void navigate({ to: "/admin" })),
    });
  }
  navItems.push({
    id: "home",
    label: "דף הבית",
    icon: <Home className="h-4 w-4" />,
    run: () => go(() => void navigate({ to: "/" })),
  });

  const actionItems: Action[] = [];
  if (hasRole("contractor")) {
    actionItems.push({
      id: "new-request",
      label: "בקשה חדשה",
      icon: <Plus className="h-4 w-4" />,
      shortcut: "N",
      run: () => go(() => void navigate({ to: "/new-request" })),
    });
  }
  actionItems.push({
    id: "sign-out",
    label: "התנתק",
    icon: <LogOut className="h-4 w-4" />,
    run: () => go(() => void signOut()),
  });

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="חיפוש פעולה או ניווט…" />
      <CommandList>
        <CommandEmpty>לא נמצאו תוצאות.</CommandEmpty>
        <CommandGroup heading="ניווט">
          {navItems.map((item) => (
            <CommandItem key={item.id} value={item.label} onSelect={item.run}>
              {item.icon}
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="פעולות">
          {actionItems.map((item) => (
            <CommandItem key={item.id} value={item.label} onSelect={item.run}>
              {item.icon}
              <span>{item.label}</span>
              {item.shortcut && <CommandShortcut>{item.shortcut}</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
