import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import CircularProgress from "@mui/material/CircularProgress";
import { useAuth } from "@/hooks/use-auth";

// Post-auth router: waits for the session + roles to load, then sends the
// user to their single role home. Eliminates the old "everyone lands on the
// contractor dashboard first" flash (admins/corporations bounced through it).
export const Route = createFileRoute("/go")({
  component: GoPage,
});

function GoPage() {
  const { session, roles, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      void navigate({ to: "/login", replace: true });
      return;
    }
    // Roles are fetched asynchronously right after the session is set. There is
    // a render where session exists but roles is still []; redirecting then sent
    // users to "/". Wait for roles to resolve (every real account has ≥1 role)
    // instead of falling through to the landing page.
    if (roles.length === 0) return;
    if (roles.includes("admin")) void navigate({ to: "/admin", replace: true });
    else if (roles.includes("corporation"))
      void navigate({ to: "/corporation-dashboard", replace: true });
    else if (roles.includes("contractor")) void navigate({ to: "/dashboard", replace: true });
    // Foreman + ops manager can have several projects → the unified project list.
    else if (roles.includes("operations_manager") || roles.includes("site_manager"))
      void navigate({ to: "/projects", replace: true });
    // Coordinator is single-project, field-focused → their daily report screen.
    else if (roles.includes("team_leader")) void navigate({ to: "/team-leader", replace: true });
    else void navigate({ to: "/", replace: true });
  }, [loading, session, roles, navigate]);

  return (
    <div className="grid min-h-screen place-items-center bg-background" dir="rtl">
      <div className="flex flex-col items-center gap-3">
        <CircularProgress size={24} color="inherit" className="text-primary" />
        <span className="text-sm text-muted-foreground">מעביר אותך לאזור שלך…</span>
      </div>
    </div>
  );
}
