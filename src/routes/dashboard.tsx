import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import InboxIcon from "@mui/icons-material/Inbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppShell } from "@/components/app-shell";
import { listMyJobRequests } from "@/lib/job-requests.functions";
import { useAuth } from "@/hooks/use-auth";
import { maskedRequestId } from "@/lib/anonymize";

type MyRequest = {
  id: string;
  location: string;
  start_date: string;
  duration: string;
  status: string;
  created_at: string;
  deadline_at: string | null;
  offers_count: number;
  min_price: number | null;
  workers_count: number;
  roles: string[];
};

type StatusFilter = "all" | "open" | "awarded" | "closed" | "cancelled";

const STATUS_META: Record<string, { label: string; chipClass: string }> = {
  open: { label: "פתוחה למכרז", chipClass: "status-chip-live" },
  awarded: { label: "נבחר זוכה", chipClass: "status-chip-info" },
  closed: { label: "סגורה", chipClass: "status-chip-muted" },
  cancelled: { label: "בוטלה", chipClass: "status-chip-rejected" },
};

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "לוח בקרה — BuildForce" },
      { name: "description", content: "כל הבקשות, ההצעות והפרויקטים שלך במקום אחד." },
    ],
  }),
  component: DashboardPage,
});

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5) return "לילה טוב";
  if (h < 12) return "בוקר טוב";
  if (h < 17) return "צהריים טובים";
  return "ערב טוב";
}

function DashboardPage() {
  const { hasRole, profile, session, loading } = useAuth();
  const navigate = useNavigate();
  const fetchMine = useServerFn(listMyJobRequests);

  // Route by role: unauthenticated -> login; a corporation (manpower supplier)
  // belongs on its own dashboard, not the contractor view; an account whose
  // only role is admin belongs in the admin console, not the contractor view.
  useEffect(() => {
    if (loading) return;
    if (!session) {
      void navigate({ to: "/login", replace: true });
      return;
    }
    if (hasRole("admin") && !hasRole("contractor") && !hasRole("corporation")) {
      void navigate({ to: "/admin", replace: true });
      return;
    }
    if (hasRole("corporation") && !hasRole("contractor")) {
      void navigate({ to: "/corporation-dashboard", replace: true });
    }
  }, [loading, session, hasRole, navigate]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["my-requests"],
    queryFn: () => fetchMine({ data: {} as never }),
    enabled: !!session,
  });

  const isAdmin = hasRole("admin");
  const requests = (data?.requests ?? []) as MyRequest[];
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (q) {
        const hay = `${r.location} ${r.roles.join(" ")} ${r.id}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [requests, filter, q]);

  const stats = useMemo(() => {
    const open = requests.filter((r) => r.status === "open").length;
    const awarded = requests.filter((r) => r.status === "awarded").length;
    const totalOffers = requests.reduce((s, r) => s + r.offers_count, 0);
    return { open, awarded, totalOffers, total: requests.length };
  }, [requests]);

  const filterCounts = useMemo(
    () => ({
      all: requests.length,
      open: requests.filter((r) => r.status === "open").length,
      awarded: requests.filter((r) => r.status === "awarded").length,
      closed: requests.filter((r) => r.status === "closed").length,
      cancelled: requests.filter((r) => r.status === "cancelled").length,
    }),
    [requests],
  );

  const firstName =
    profile?.full_name?.split(" ")[0] ?? profile?.company_name?.split(" ")[0] ?? "";
  const greeting = getGreeting();

  return (
    <AppShell title="לוח בקרה">
      {/* ── Page header (pattern 1) ── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className="text-xl font-semibold text-foreground">
              {greeting}
              {firstName ? `, ${firstName}` : ""}
            </h2>
            {isAdmin && (
              <span className="role-badge">
                <VerifiedUserIcon sx={{ fontSize: 12 }} /> מנהל מערכת
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLoading
              ? "טוען נתונים…"
              : stats.total === 0
                ? "עדיין לא פרסמת בקשות — התחל עכשיו."
                : `${stats.open} בקשות פתוחות · ${stats.totalOffers} הצעות שהתקבלו`}
          </p>
        </div>
        <Button asChild size="sm">
          <Link to="/new-request">
            <AddIcon sx={{ fontSize: 16 }} /> בקשה חדשה
          </Link>
        </Button>
      </div>

      {/* ── Stat row (pattern 2) ── */}
      <div className="mb-6 grid grid-cols-3 overflow-hidden rounded-lg border border-border divide-x divide-x-reverse divide-border">
        <div className="px-5 py-4">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            סה"כ בקשות
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums" dir="ltr">
            {isLoading ? "…" : stats.total}
          </div>
        </div>
        <div className="px-5 py-4">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            פתוחות למכרז
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums" dir="ltr">
            {isLoading ? "…" : stats.open}
          </div>
        </div>
        <div className="px-5 py-4">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            נבחר זוכה
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-status-info" dir="ltr">
            {isLoading ? "…" : stats.awarded}
          </div>
        </div>
      </div>

      {/* ── Section title + filter + search ── */}
      <div className="mb-3 border-b border-border pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">
            הבקשות שלי
            {requests.length > 0 && (
              <span className="mr-1.5 font-normal text-muted-foreground">({requests.length})</span>
            )}
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <div className="pill-tabs">
              {(
                [
                  { id: "all", label: "הכל" },
                  { id: "open", label: "פתוחות" },
                  { id: "awarded", label: "זוכה נבחר" },
                  { id: "closed", label: "סגורות" },
                  { id: "cancelled", label: "בוטלו" },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={`pill-tab${filter === f.id ? " pill-tab-active" : ""}`}
                >
                  {f.label}
                  {filterCounts[f.id] > 0 && (
                    <span className="pill-tab-count">{filterCounts[f.id]}</span>
                  )}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-64">
              <SearchIcon sx={{ fontSize: 16 }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="חפש לפי עיר, תפקיד…"
                className="h-9 pr-9"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Requests table ── */}
      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/40" />
          ))}
        </div>
      ) : error ? (
        <div className="empty-state">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-lg border border-destructive/20 bg-destructive/10">
            <WarningAmberIcon sx={{ fontSize: 28 }} className="text-destructive" />
          </div>
          <h3 className="text-lg font-semibold">שגיאה בטעינת הבקשות</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            לא הצלחנו לטעון את הבקשות שלך. בדוק את החיבור ונסה שוב.
          </p>
          <Button onClick={() => window.location.reload()} className="mt-5" variant="outline">
            נסה שוב
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState hasAny={requests.length > 0} />
      ) : (
        <RequestsTable requests={filtered} />
      )}
    </AppShell>
  );
}

function RequestsTable({ requests }: { requests: MyRequest[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      {/* Desktop table (≥768px) */}
      <table className="hidden w-full md:table">
        <thead>
          <tr className="premium-table-header">
            <th className="px-4 py-3 text-right">מכרז</th>
            <th className="px-4 py-3 text-right">מיקום</th>
            <th className="px-4 py-3 text-right">עובדים</th>
            <th className="px-4 py-3 text-right">תאריך התחלה</th>
            <th className="px-4 py-3 text-right">הצעות</th>
            <th className="px-4 py-3 text-right">סטטוס</th>
            <th className="px-4 py-3 text-right">מחיר מינ׳</th>
            <th className="px-4 py-3 text-right">פעולה</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => {
            const meta = STATUS_META[r.status] ?? STATUS_META.open;
            return (
              <tr key={r.id} className="premium-table-row">
                <td className="px-4 py-3">
                  <span className="font-mono text-[11px] text-muted-foreground" dir="ltr">
                    {maskedRequestId(r.id)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">{r.location}</td>
                <td className="px-4 py-3 text-sm tabular-nums">
                  <span dir="ltr">{r.workers_count}</span>
                </td>
                <td className="px-4 py-3 text-sm tabular-nums">
                  <span dir="ltr">{r.start_date}</span>
                </td>
                <td className="px-4 py-3 text-sm tabular-nums font-medium">
                  <span dir="ltr">{r.offers_count}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={meta.chipClass}>{meta.label}</span>
                </td>
                <td className="px-4 py-3 text-sm tabular-nums">
                  {r.min_price != null ? (
                    <span className="font-medium text-status-approved" dir="ltr">
                      ₪{r.min_price}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Button asChild size="sm" variant="outline" className="h-7 px-3 text-xs">
                    <Link to="/my-requests/$id" params={{ id: r.id }}>
                      צפה
                    </Link>
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Mobile compact rows (<768px) */}
      <div className="divide-y divide-border md:hidden">
        {requests.map((r) => {
          const meta = STATUS_META[r.status] ?? STATUS_META.open;
          return (
            <Link
              key={r.id}
              to="/my-requests/$id"
              params={{ id: r.id }}
              className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={meta.chipClass}>{meta.label}</span>
                  <span className="font-mono text-[11px] text-muted-foreground" dir="ltr">
                    {maskedRequestId(r.id)}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {r.location} · <span dir="ltr">{r.start_date}</span> · {r.workers_count} עובדים
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm font-semibold tabular-nums" dir="ltr">
                  {r.offers_count} הצעות
                </div>
                {r.min_price != null && (
                  <div className="text-xs font-medium text-status-approved tabular-nums">
                    <span dir="ltr">₪{r.min_price}</span> לשעה
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon mx-auto">
        <InboxIcon sx={{ fontSize: 32 }} className="text-primary" />
      </div>
      <h3 className="text-lg font-semibold">
        {hasAny ? "אין בקשות מתאימות לסינון" : "ברוך הבא ל-BuildForce"}
      </h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        {hasAny
          ? "נסה לשנות את הסינון או החיפוש."
          : "פרסם בקשת כוח אדם ראשונה. תאגידים מאומתים ישלחו הצעות תחרותיות — ממוצע 3+ הצעות תוך 24 שעות."}
      </p>
      {!hasAny && (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/new-request">
              <AddIcon sx={{ fontSize: 16 }} className="ms-1" /> פרסם בקשת כוח אדם
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
