import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
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
    // Roles load right after the session; wait for them (loading covers it,
    // but guard against an empty roles array → safe default to landing).
    if (roles.includes("admin")) void navigate({ to: "/admin", replace: true });
    else if (roles.includes("corporation"))
      void navigate({ to: "/corporation-dashboard", replace: true });
    else if (roles.includes("contractor")) void navigate({ to: "/dashboard", replace: true });
    else void navigate({ to: "/", replace: true });
  }, [loading, session, roles, navigate]);

  return (
    <div className="grid min-h-screen place-items-center bg-background" dir="rtl">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">מעביר אותך לאזור שלך…</span>
      </div>
    </div>
  );
}
