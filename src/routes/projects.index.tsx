import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import PlaceIcon from "@mui/icons-material/Place";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { listMyProjects } from "@/lib/projects.functions";

export const Route = createFileRoute("/projects/")({
  head: () => ({ meta: [{ title: "הפרויקטים שלי — BuildForce" }] }),
  component: MyProjectsPage,
});

const STATUS_META: Record<string, { label: string; chip: string }> = {
  active: { label: "פעיל", chip: "status-chip-approved" },
  paused: { label: "מושהה", chip: "status-chip-pending" },
  completed: { label: "הושלם", chip: "status-chip-muted" },
};

const ROLE_LABEL: Record<string, string> = {
  contractor: "קבלן",
  corporation: "תאגיד",
  site_manager: "מנהל עבודה",
  operations_manager: "מנהל תפעול",
  admin: "מנהל מערכת — צפייה",
};

function MyProjectsPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const listFn = useServerFn(listMyProjects);
  const [tab, setTab] = useState<"active" | "history">("active");

  useEffect(() => {
    if (!loading && !session) void navigate({ to: "/login", replace: true });
  }, [loading, session, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["my-projects"],
    queryFn: () => listFn({}),
    enabled: !!session,
  });
  const all = data?.projects ?? [];
  const active = all.filter((p) => p.status !== "completed");
  const history = all.filter((p) => p.status === "completed");
  const shown = tab === "active" ? active : history;

  return (
    <AppShell title="הפרויקטים שלי">
      <div className="space-y-4" dir="rtl">
        <div className="pill-tabs inline-flex">
          <button
            className={`pill-tab ${tab === "active" ? "pill-tab-active" : ""}`}
            onClick={() => setTab("active")}
          >
            פעילים <span className="pill-tab-count">{active.length}</span>
          </button>
          <button
            className={`pill-tab ${tab === "history" ? "pill-tab-active" : ""}`}
            onClick={() => setTab("history")}
          >
            היסטוריה <span className="pill-tab-count">{history.length}</span>
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <div className="enterprise-card p-10 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-lg bg-muted">
              <FolderOpenIcon sx={{ fontSize: 22 }} className="text-muted-foreground" />
            </div>
            <h2 className="text-base font-semibold">
              {tab === "active" ? "אין פרויקטים פעילים" : "אין פרויקטים בהיסטוריה"}
            </h2>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
              פרויקט נפתח אוטומטית כשמכרז מסתיים בבחירת זוכה.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {shown.map((p) => {
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
                      {ROLE_LABEL[p.my_role] && (
                        <span className="rounded bg-muted px-1.5 py-px font-medium">
                          התפקיד שלי: {ROLE_LABEL[p.my_role]}
                        </span>
                      )}
                      {p.counterparty && <span>מול: {p.counterparty}</span>}
                      {p.address && (
                        <span className="inline-flex items-center gap-1">
                          <PlaceIcon sx={{ fontSize: 13 }} />
                          {p.address}
                        </span>
                      )}
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
