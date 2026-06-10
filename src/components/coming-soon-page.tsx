import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Clock, CheckCircle2, type LucideIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/app-shell";

/**
 * Full-page placeholder for features that are on the roadmap but not live.
 * Renders INSTANTLY (static, no data fetching) so there is never a flash of
 * an unfinished screen. The auth guard redirects logged-out users without
 * blocking the static render.
 */
export function ComingSoonPage({
  title,
  description,
  bullets,
  icon: Icon,
}: {
  title: string;
  description: string;
  bullets?: string[];
  icon: LucideIcon;
}) {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) void navigate({ to: "/login" });
  }, [loading, session, navigate]);

  return (
    <AppShell title={title}>
      <div className="mx-auto max-w-2xl pt-8">
        <div className="coming-soon-card">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg border border-border bg-muted text-muted-foreground">
            <Icon className="h-5 w-5" />
          </div>
          <span className="status-chip-muted mt-4 inline-flex">
            <Clock className="h-3 w-3" /> בקרוב
          </span>
          <h2 className="mt-3 text-lg font-semibold text-foreground">{title}</h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>

          {bullets && bullets.length > 0 && (
            <div className="mx-auto mt-6 max-w-sm space-y-2 text-right">
              {bullets.map((b) => (
                <div key={b} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />
                  <span>{b}</span>
                </div>
              ))}
            </div>
          )}

          <p className="mt-7 text-xs text-muted-foreground/70">
            היכולת תיפתח בשלב הפיילוט — נעדכן אותך כשהיא זמינה.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
