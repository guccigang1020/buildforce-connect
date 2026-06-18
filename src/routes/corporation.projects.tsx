import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import PlaceIcon from "@mui/icons-material/Place";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { listCorporationProjects } from "@/lib/projects.functions";

export const Route = createFileRoute("/corporation/projects")({
  component: CorporationProjectsPage,
});

const STATUS_META: Record<string, { label: string; chip: string }> = {
  active: { label: "פעיל", chip: "status-chip-approved" },
  paused: { label: "מושהה", chip: "status-chip-pending" },
  completed: { label: "הושלם", chip: "status-chip-muted" },
};

function CorporationProjectsPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const listFn = useServerFn(listCorporationProjects);

  useEffect(() => {
    if (!loading && !session) void navigate({ to: "/login", replace: true });
  }, [loading, session, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["corporation-projects"],
    queryFn: () => listFn({}),
    enabled: !!session,
  });
  const projects = data?.projects ?? [];

  return (
    <AppShell title="פרויקטים">
      <div className="space-y-4" dir="rtl">
        <p className="text-sm text-muted-foreground">
          פרויקטים שבהם זכית. השלם את הפרטים: רכז, מנהל תפעול ורשימת העובדים, וצפה בדיווחי הנוכחות.
        </p>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="enterprise-card p-10 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-lg bg-muted">
              <FolderOpenIcon sx={{ fontSize: 22 }} className="text-muted-foreground" />
            </div>
            <h2 className="text-base font-semibold">אין עדיין פרויקטים</h2>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
              כשקבלן יבחר בהצעתך כזוכה, ייפתח כאן פרויקט חדש באופן אוטומטי.
            </p>
            <Link
              to="/corporation-dashboard"
              className="mt-5 inline-block text-sm font-medium text-primary"
            >
              למעבר ללוח התאגיד
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {projects.map((p) => {
              const meta = STATUS_META[p.status] ?? STATUS_META.active;
              return (
                <Link
                  key={p.id}
                  to="/projects/$id"
                  params={{ id: p.id }}
                  className="enterprise-card flex items-center justify-between gap-3 p-4 transition-colors hover:bg-surface-active"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold text-foreground">{p.name}</span>
                      <span className={`${meta.chip} shrink-0`}>{meta.label}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {p.address && (
                        <span className="inline-flex items-center gap-1">
                          <PlaceIcon sx={{ fontSize: 13 }} />
                          {p.address}
                        </span>
                      )}
                      <span>עובדים צפויים: {p.expected_workers}</span>
                    </div>
                  </div>
                  <ChevronLeftIcon
                    sx={{ fontSize: 20 }}
                    className="shrink-0 text-muted-foreground"
                  />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
