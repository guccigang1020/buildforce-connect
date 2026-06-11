import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import CircularProgress from "@mui/material/CircularProgress";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import GroupIcon from "@mui/icons-material/Group";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SearchIcon from "@mui/icons-material/Search";
import GavelIcon from "@mui/icons-material/Gavel";
import HardHatIcon from "@mui/icons-material/Engineering";
import ApartmentIcon from "@mui/icons-material/Apartment";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import HandshakeIcon from "@mui/icons-material/Handshake";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlined";
import { useServerFn } from "@tanstack/react-start";
import {
  adminGetDashboardData,
  adminGetAllRequestsWithOffers,
  adminSetVerificationStatus,
  adminGetDocumentUrl,
} from "@/lib/admin.functions";
import { maskedRequestId } from "@/lib/anonymize";
import { sendTransactionalEmail } from "@/lib/email/send";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

type AdminProfile = {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  business_name: string | null;
  business_id: string | null;
  company_name: string | null;
  city: string | null;
  contractor_license_number: string | null;
  contractor_classification: string | null;
  verification_status: "pending" | "approved" | "rejected";
  is_verified: boolean;
  license_doc_url: string | null;
  insurance_doc_url: string | null;
  books_cert_url: string | null;
  admin_notes: string | null;
  created_at: string;
  email: string | null;
};

function AdminPage() {
  const { session, loading, hasRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) {
      toast.error("יש להתחבר כדי להיכנס לאזור הניהול");
      navigate({ to: "/login" });
      return;
    }
    if (!loading && session && !hasRole("admin")) {
      toast.error("אין הרשאת גישה");
      navigate({ to: "/" });
    }
  }, [loading, session, hasRole, navigate]);

  if (!session || (loading && !hasRole("admin"))) {
    return (
      <AppShell title="מנהל מערכת">
        <div className="grid place-items-center py-24">
          <CircularProgress size={24} color="inherit" className="text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  return <AdminDashboard />;
}

function AdminDashboard() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { session, profile } = useAuth();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("pending");
  // Primary admin view: corporation verification vs. marketplace oversight.
  const [view, setView] = useState<"corps" | "auctions">("corps");
  const fetchDashboard = useServerFn(adminGetDashboardData);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-dashboard-data"],
    queryFn: () => fetchDashboard(),
    enabled: Boolean(session),
  });

  const profiles = (data?.profiles ?? []) as AdminProfile[];
  const roles = (data?.roles ?? []) as { user_id: string; role: string }[];
  const activeAuctions = (data?.activeAuctions ?? 0) as number;
  const completedDeals = (data?.completedDeals ?? 0) as number;
  const totalCorporations = (data?.totalCorporations ?? 0) as number;
  const totalContractors = (data?.totalContractors ?? 0) as number;

  useEffect(() => {
    if (!error) return;
    const message = error instanceof Error ? error.message : "שגיאה לא ידועה";
    if (/forbidden|admin role required|unauthorized/i.test(message)) {
      toast.error("אין הרשאת גישה");
      navigate({ to: "/" });
    }
  }, [error, navigate]);

  const rolesByUser = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const r of roles) {
      const arr = m.get(r.user_id) ?? [];
      arr.push(r.role);
      m.set(r.user_id, arr);
    }
    return m;
  }, [roles]);

  // Verification applies ONLY to corporations (manpower suppliers).
  // Contractors don't need admin approval — listing them in this queue was
  // confusing ("why is a contractor pending?").
  const corporations = useMemo(
    () => profiles.filter((p) => (rolesByUser.get(p.user_id) ?? []).includes("corporation")),
    [profiles, rolesByUser],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return corporations.filter((p) => {
      if (tab === "pending" && p.verification_status !== "pending") return false;
      if (tab === "approved" && p.verification_status !== "approved") return false;
      if (tab === "rejected" && p.verification_status !== "rejected") return false;
      if (!q) return true;
      return [
        p.full_name,
        p.business_name,
        p.business_id,
        p.contractor_license_number,
        p.phone,
        p.city,
      ].some((v) => v?.toLowerCase().includes(q));
    });
  }, [corporations, tab, search]);

  const stats = useMemo(
    () => ({
      total: profiles.length,
      corps: corporations.length,
      pending: corporations.filter((p) => p.verification_status === "pending").length,
      approved: corporations.filter((p) => p.verification_status === "approved").length,
      rejected: corporations.filter(
        (p) => p.verification_status !== "approved" && p.verification_status !== "pending",
      ).length,
    }),
    [profiles, corporations],
  );

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["admin-dashboard-data"] });
  };

  return (
    <AppShell
      title="מנהל מערכת"
      action={
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <VerifiedUserIcon sx={{ fontSize: 14 }} className="text-primary" />
          <span className="font-semibold text-primary">אדמין</span>
          {profile?.full_name && <span>· {profile.full_name}</span>}
        </div>
      }
    >
      {/* Pattern 1 — page header */}
      <div className="mb-6 flex items-start justify-between border-b border-border pb-5">
        <div>
          <h2 className="text-xl font-semibold text-foreground">לוח בקרה — מנהל מערכת</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {stats.pending > 0 ? `${stats.pending} תאגידים ממתינים לאישור · ` : ""}
            {stats.corps} תאגידים · {stats.total} משתמשים רשומים
          </p>
        </div>
      </div>

      {/* Stat tiles — the five numbers that matter to an operator */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <StatTile
          icon={HardHatIcon}
          tone="neutral"
          label="קבלנים"
          value={totalContractors}
          sub="מזמיני כוח אדם"
        />
        <StatTile
          icon={ApartmentIcon}
          tone="neutral"
          label="תאגידים"
          value={totalCorporations}
          sub="ספקי כוח אדם"
        />
        <StatTile
          icon={HourglassEmptyIcon}
          tone={stats.pending > 0 ? "pending" : "neutral"}
          label="ממתינים לאישור"
          value={stats.pending}
          sub="תאגידים חדשים"
          highlight={stats.pending > 0}
        />
        <StatTile
          icon={GavelIcon}
          tone="info"
          label="מכרזים פתוחים"
          value={activeAuctions}
          sub="מקבלים הצעות"
        />
        <StatTile
          icon={HandshakeIcon}
          tone="success"
          label="עסקאות שנסגרו"
          value={completedDeals}
          sub="זכיות בין קבלן לתאגיד"
        />
      </div>

      {/* Primary view switch — the two admin responsibilities */}
      <div className="mb-5 inline-flex rounded-lg border border-border bg-card p-1">
        <button
          type="button"
          onClick={() => setView("corps")}
          className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
            view === "corps"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          אימות תאגידים
          {stats.pending > 0 && (
            <span
              className={`ms-1.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                view === "corps" ? "bg-white/25" : "bg-primary/15 text-primary"
              }`}
            >
              {stats.pending}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setView("auctions")}
          className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
            view === "auctions"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          מכרזים והצעות
        </button>
      </div>

      {view === "auctions" ? (
        <AuctionsOversight session={session} />
      ) : (
        <CorporationsVerification
          tab={tab}
          setTab={setTab}
          stats={stats}
          search={search}
          setSearch={setSearch}
          filtered={filtered}
          rolesByUser={rolesByUser}
          isLoading={isLoading}
          error={error}
          refresh={refresh}
        />
      )}
    </AppShell>
  );
}

type Stats = { total: number; corps: number; pending: number; approved: number; rejected: number };

const TILE_TONE: Record<
  string,
  { iconWrap: string; value: string; ring: string }
> = {
  neutral: { iconWrap: "bg-muted text-muted-foreground", value: "text-foreground", ring: "border-border" },
  info: {
    iconWrap: "bg-[oklch(0.6_0.095_205_/_0.14)] text-primary-glow",
    value: "text-foreground",
    ring: "border-border",
  },
  success: {
    iconWrap: "bg-[oklch(0.55_0.1_152_/_0.14)] text-status-approved",
    value: "text-status-approved",
    ring: "border-border",
  },
  pending: {
    iconWrap: "bg-[oklch(0.58_0.11_75_/_0.16)] text-status-pending",
    value: "text-status-pending",
    ring: "border-status-pending/40",
  },
};

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  tone = "neutral",
  highlight = false,
}: {
  icon: React.ComponentType<{ sx?: object; className?: string }>;
  label: string;
  value: number;
  sub?: string;
  tone?: "neutral" | "info" | "success" | "pending";
  highlight?: boolean;
}) {
  const t = TILE_TONE[tone] ?? TILE_TONE.neutral;
  return (
    <div
      className={`rounded-lg border bg-card p-4 transition-shadow hover:shadow-sm-app ${
        highlight ? t.ring : "border-border"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className={`grid h-8 w-8 place-items-center rounded-md ${t.iconWrap}`}>
          <Icon sx={{ fontSize: 18 }} />
        </span>
      </div>
      <div className={`mt-2 text-3xl font-bold tabular-nums ${t.value}`} dir="ltr">
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function CorporationsVerification({
  tab,
  setTab,
  stats,
  search,
  setSearch,
  filtered,
  rolesByUser,
  isLoading,
  error,
  refresh,
}: {
  tab: string;
  setTab: (v: string) => void;
  stats: Stats;
  search: string;
  setSearch: (v: string) => void;
  filtered: AdminProfile[];
  rolesByUser: Map<string, string[]>;
  isLoading: boolean;
  error: unknown;
  refresh: () => void;
}) {
  return (
    <>
      {/* Tab bar + search */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-card/60 border border-border/60">
            <TabsTrigger value="pending">
              ממתינים
              {stats.pending > 0 && (
                <span className="ms-1.5 rounded-full bg-primary/20 px-1.5 py-0.5 text-[11px] font-bold text-primary">
                  {stats.pending}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">מאושרים ({stats.approved})</TabsTrigger>
            <TabsTrigger value="rejected">נדחו ({stats.rejected})</TabsTrigger>
            <TabsTrigger value="all">כל התאגידים ({stats.corps})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full md:w-72">
          <SearchIcon sx={{ fontSize: 16 }} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש לפי שם / ח.פ / רישיון..."
            className="pr-10 bg-card/60"
          />
        </div>
      </div>

      {/* Content */}
      {error ? (
        <div className="empty-state border-destructive/30 bg-destructive/5">
          <div className="empty-state-icon border-destructive/20 bg-destructive/10">
            <ErrorOutlineIcon sx={{ fontSize: 32 }} className="text-destructive" />
          </div>
          <h3 className="font-bold">שגיאה בטעינת נתוני הניהול</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            לא הצלחנו לטעון את הנתונים. נסה לרענן את הדף.
          </p>
        </div>
      ) : isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-4">
              <div className="h-5 w-40 rounded bg-muted" />
              <div className="mt-2 h-4 w-64 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <GroupIcon sx={{ fontSize: 32 }} className="text-primary" />
          </div>
          <h3 className="font-bold">אין משתמשים בקטגוריה זו</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {search ? "נסה לשנות את מילות החיפוש." : "משתמשים חדשים יופיעו כאן לאחר הרשמה."}
          </p>
        </div>
      ) : (
        /* Pattern 3 — data table */
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="premium-table-header">
                <th className="px-4 py-3 text-right font-medium">שם</th>
                <th className="px-4 py-3 text-right font-medium">תפקיד</th>
                <th className="px-4 py-3 text-right font-medium">עסק</th>
                <th className="px-4 py-3 text-right font-medium">ח.פ</th>
                <th className="px-4 py-3 text-right font-medium">עיר</th>
                <th className="px-4 py-3 text-right font-medium">נרשם</th>
                <th className="px-4 py-3 text-right font-medium">סטטוס</th>
                <th className="px-4 py-3 text-right font-medium">פעולה</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <UserTableRow
                  key={p.id}
                  profile={p}
                  roles={rolesByUser.get(p.user_id) ?? []}
                  onChange={refresh}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ── Admin marketplace oversight: every request with all its (named) offers ──
type AdminOfferRow = {
  id: string;
  corporation_name: string;
  price_per_hour: number | string;
  available_workers: number;
  start_date: string;
  status: string;
};
type AdminRequestRow = {
  id: string;
  location: string;
  start_date: string;
  duration: string;
  status: string;
  owner_name: string;
  items: { role: string; nationality: string; count: number }[];
  offers: AdminOfferRow[];
};

const REQ_STATUS_META: Record<string, { label: string; chip: string }> = {
  open: { label: "פתוח", chip: "status-chip-live" },
  awarded: { label: "נבחר זוכה", chip: "status-chip-info" },
  closed: { label: "סגור", chip: "status-chip-muted" },
  cancelled: { label: "בוטל", chip: "status-chip-rejected" },
  expired: { label: "פג תוקף", chip: "status-chip-muted" },
};
const OFFER_STATUS_META: Record<string, { label: string; chip: string }> = {
  submitted: { label: "הוגשה", chip: "status-chip-pending" },
  awarded: { label: "זוכה", chip: "status-chip-info" },
  rejected: { label: "נדחתה", chip: "status-chip-rejected" },
  withdrawn: { label: "נמשכה", chip: "status-chip-muted" },
};

function AuctionsOversight({ session }: { session: unknown }) {
  const fetchAll = useServerFn(adminGetAllRequestsWithOffers);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-all-requests"],
    queryFn: () => fetchAll(),
    enabled: Boolean(session),
  });
  const [expanded, setExpanded] = useState<string | null>(null);
  const requests = (data?.requests ?? []) as AdminRequestRow[];

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 rounded-lg border border-border bg-card" />
        ))}
      </div>
    );
  }
  if (requests.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <GavelIcon sx={{ fontSize: 32 }} className="text-primary" />
        </div>
        <h3 className="font-bold">עדיין אין מכרזים</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">
          מכרזים שקבלנים יפרסמו, וההצעות שיוגשו להם, יופיעו כאן.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {requests.map((r) => {
        const meta = REQ_STATUS_META[r.status] ?? REQ_STATUS_META.open;
        const isOpen = expanded === r.id;
        const totalWorkers = r.items.reduce((s, it) => s + (it.count ?? 0), 0);
        return (
          <div key={r.id} className="overflow-hidden rounded-lg border border-border bg-card">
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : r.id)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-right hover:bg-muted/40 transition-colors"
            >
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                  {maskedRequestId(r.id)}
                </span>
                <span className="text-sm font-semibold truncate">{r.location}</span>
                <span className={meta.chip}>{meta.label}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                <span>קבלן: {r.owner_name}</span>
                <span className="rounded border border-border bg-muted/50 px-1.5 py-0.5 font-medium tabular-nums">
                  {r.offers.length} הצעות
                </span>
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-border bg-muted/20 px-4 py-3">
                <div className="mb-3 text-xs text-muted-foreground">
                  דרישות: {totalWorkers} עובדים ·{" "}
                  {r.items.map((it) => `${it.count}× ${it.role}`).join(" · ") || "—"} · התחלה{" "}
                  <span dir="ltr">{r.start_date}</span> · {r.duration}
                </div>
                {r.offers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">לא הוגשו הצעות למכרז זה.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border bg-card">
                    <table className="w-full min-w-[560px] text-sm">
                      <thead>
                        <tr className="premium-table-header">
                          <th className="px-3 py-2 text-start">תאגיד</th>
                          <th className="px-3 py-2 text-start">מחיר/שעה</th>
                          <th className="px-3 py-2 text-start">עובדים</th>
                          <th className="px-3 py-2 text-start">התחלה</th>
                          <th className="px-3 py-2 text-start">סטטוס</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.offers.map((o) => {
                          const om = OFFER_STATUS_META[o.status] ?? OFFER_STATUS_META.submitted;
                          return (
                            <tr key={o.id} className="premium-table-row">
                              <td className="px-3 py-2.5 font-medium">{o.corporation_name}</td>
                              <td className="px-3 py-2.5 font-semibold tabular-nums">
                                <span dir="ltr">₪{Number(o.price_per_hour).toLocaleString()}</span>
                              </td>
                              <td className="px-3 py-2.5 tabular-nums text-muted-foreground">
                                <span dir="ltr">{o.available_workers}</span>
                              </td>
                              <td className="px-3 py-2.5 tabular-nums text-muted-foreground">
                                <span dir="ltr">{o.start_date}</span>
                              </td>
                              <td className="px-3 py-2.5">
                                <span className={om.chip}>{om.label}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function UserTableRow({
  profile,
  roles,
  onChange,
}: {
  profile: AdminProfile;
  roles: string[];
  onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const isContractor = roles.includes("contractor");
  const isCorporation = roles.includes("corporation");
  const isAdmin = roles.includes("admin");

  return (
    <>
      <tr className="premium-table-row h-12">
        <td className="px-4 py-2.5">
          <span className="font-medium text-foreground">{profile.full_name}</span>
        </td>
        <td className="px-4 py-2.5">
          <div className="flex flex-wrap gap-1">
            {isAdmin && <span className="role-badge">אדמין</span>}
            {isCorporation && <span className="role-badge">תאגיד</span>}
            {isContractor && <span className="role-badge">קבלן</span>}
            {roles.length === 0 && (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>
        </td>
        <td className="px-4 py-2.5 text-sm text-muted-foreground">
          {profile.business_name || "—"}
        </td>
        <td className="px-4 py-2.5">
          <span className="font-mono text-xs tabular-nums" dir="ltr">
            {profile.business_id || "—"}
          </span>
        </td>
        <td className="px-4 py-2.5 text-sm text-muted-foreground">
          {profile.city || "—"}
        </td>
        <td className="px-4 py-2.5 whitespace-nowrap text-xs text-muted-foreground">
          {new Date(profile.created_at).toLocaleDateString("he-IL")}
        </td>
        <td className="px-4 py-2.5">
          <StatusBadge status={profile.verification_status} />
        </td>
        <td className="px-4 py-2.5">
          <Button onClick={() => setOpen(true)} variant="outline" size="sm" className="shrink-0">
            פתח לבדיקה
          </Button>
        </td>
      </tr>
      {open && (
        <ReviewDialog
          profile={profile}
          roles={roles}
          onClose={() => setOpen(false)}
          onChange={onChange}
        />
      )}
    </>
  );
}

function StatusBadge({ status }: { status: AdminProfile["verification_status"] }) {
  if (status === "approved") return <span className="status-chip-approved">מאושר</span>;
  if (status === "rejected") return <span className="status-chip-rejected">נדחה</span>;
  return <span className="status-chip-pending">ממתין</span>;
}

function ReviewDialog({
  profile,
  roles,
  onClose,
  onChange,
}: {
  profile: AdminProfile;
  roles: string[];
  onClose: () => void;
  onChange: () => void;
}) {
  const [notes, setNotes] = useState(profile.admin_notes ?? "");
  const [busy, setBusy] = useState(false);
  const [docs, setDocs] = useState<{ label: string; url: string | null }[]>([]);
  const [notesError, setNotesError] = useState<string | null>(null);
  const setStatusFn = useServerFn(adminSetVerificationStatus);
  const getDocUrlFn = useServerFn(adminGetDocumentUrl);

  useEffect(() => {
    const load = async () => {
      const items: { label: string; path: string | null }[] = [
        { label: "תעודת קבלן רשום", path: profile.license_doc_url },
        { label: "ביטוח צד ג׳", path: profile.insurance_doc_url },
        { label: "אישור ניהול ספרים", path: profile.books_cert_url },
      ];
      const resolved = await Promise.all(
        items.map(async (it) => {
          if (!it.path) return { label: it.label, url: null };
          try {
            const res = await getDocUrlFn({ data: { path: it.path } });
            return { label: it.label, url: res.url };
          } catch {
            return { label: it.label, url: null };
          }
        }),
      );
      setDocs(resolved);
    };
    void load();
  }, [profile, getDocUrlFn]);

  const setStatus = async (status: "approved" | "rejected") => {
    if (status === "rejected" && !notes.trim()) {
      setNotesError("יש להזין סיבת דחייה לפני אישור הפעולה");
      return;
    }
    setNotesError(null);
    setBusy(true);
    try {
      await setStatusFn({ data: { profileId: profile.id, status, notes: notes || null } });
    } catch (e) {
      setBusy(false);
      toast.error(e instanceof Error ? e.message : "שגיאה");
      return;
    }
    setBusy(false);
    if (profile.email) {
      try {
        await sendTransactionalEmail({
          templateName: status === "approved" ? "contractor-approved" : "contractor-rejected",
          recipientEmail: profile.email,
          idempotencyKey: `${status}-${profile.id}`,
          templateData:
            status === "approved"
              ? { name: profile.full_name }
              : { name: profile.full_name, reason: notes || undefined },
        });
      } catch (e) {
        console.warn("Email send failed (non-blocking)", e);
      }
    }
    toast.success(status === "approved" ? "המשתמש אושר" : "המשתמש נדחה");
    onChange();
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>בדיקת משתמש: {profile.full_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <section>
            <h4 className="mb-2 font-semibold text-foreground/80">פרטי עסק</h4>
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/60 bg-muted/30 p-3">
              <Field label="שם עסק" value={profile.business_name} />
              <Field label="ח.פ / ע.מ" value={profile.business_id} />
              <Field label="רישיון קבלן" value={profile.contractor_license_number} />
              <Field label="סיווג" value={profile.contractor_classification} />
              <Field label="טלפון" value={profile.phone} />
              <Field label="עיר" value={profile.city} />
            </div>
          </section>

          <section>
            <h4 className="mb-2 font-semibold text-foreground/80">מסמכים</h4>
            <div className="space-y-2">
              {docs.map((d) => (
                <div
                  key={d.label}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-3 py-2"
                >
                  <span>{d.label}</span>
                  {d.url ? (
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-medium"
                    >
                      <OpenInNewIcon sx={{ fontSize: 14 }} /> צפה
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">לא הועלה</span>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h4 className="mb-2 font-semibold text-foreground/80">הערות אדמין</h4>
            <Textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                if (notesError) setNotesError(null);
              }}
              rows={3}
              placeholder="סיבת דחייה / הערות פנימיות..."
              aria-invalid={notesError ? true : undefined}
              className={`bg-card/60 ${notesError ? "border-destructive focus-visible:ring-destructive" : ""}`}
            />
            {notesError && (
              <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-destructive">
                <ErrorOutlineIcon sx={{ fontSize: 12 }} className="shrink-0" />
                {notesError}
              </p>
            )}
          </section>

          <section>
            <h4 className="mb-2 font-semibold text-foreground/80">תפקיד</h4>
            <div className="flex flex-wrap items-center gap-2">
              {roles.length > 0 ? (
                roles.map((r) => (
                  <span key={r} className="role-badge">
                    {r === "contractor"
                      ? "קבלן"
                      : r === "corporation"
                        ? "תאגיד"
                        : r === "admin"
                          ? "מנהל מערכת"
                          : r === "team_leader"
                            ? "ראש צוות"
                            : r}
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">ללא תפקיד</span>
              )}
              <span className="text-xs text-muted-foreground">
                · התפקיד נקבע בהרשמה ואינו ניתן לשינוי מכאן
              </span>
            </div>
          </section>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            סגור
          </Button>
          <Button variant="destructive" onClick={() => setStatus("rejected")} disabled={busy}>
            {busy ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <>
                <HighlightOffIcon sx={{ fontSize: 16 }} className="me-1" /> דחה
              </>
            )}
          </Button>
          <Button onClick={() => setStatus("approved")} disabled={busy}>
            {busy ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <>
                <FactCheckIcon sx={{ fontSize: 16 }} className="me-1" /> אשר
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value || "—"}</div>
    </div>
  );
}
