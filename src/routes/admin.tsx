import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ShieldCheck,
  Users,
  FileCheck2,
  FileX2,
  Loader2,
  ExternalLink,
  Search,
  Building2,
  HardHat,
  Activity,
  Gavel,
  Trophy,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import {
  adminGetDashboardData,
  adminSetVerificationStatus,
  adminGetDocumentUrl,
} from "@/lib/admin.functions";
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
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  return <AdminDashboard />;
}

type AuditEntry = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  actor_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

function AdminDashboard() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { session, profile } = useAuth();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("pending");
  const fetchDashboard = useServerFn(adminGetDashboardData);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-dashboard-data"],
    queryFn: () => fetchDashboard(),
    enabled: Boolean(session),
  });

  const profiles = (data?.profiles ?? []) as AdminProfile[];
  const roles = (data?.roles ?? []) as { user_id: string; role: string }[];
  const auditLog = (data?.auditLog ?? []) as AuditEntry[];
  const activeAuctions = (data?.activeAuctions ?? 0) as number;
  const completedDeals = (data?.completedDeals ?? 0) as number;
  const recentAwards = (data?.recentAwards ?? 0) as number;
  const monthlyWorkforceValue = (data?.monthlyWorkforceValue ?? 0) as number;
  const monthlyWorkerHours = (data?.monthlyWorkerHours ?? 0) as number;
  const totalCorporations = (data?.totalCorporations ?? 0) as number;

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return profiles.filter((p) => {
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
  }, [profiles, tab, search]);

  const stats = useMemo(
    () => ({
      total: profiles.length,
      pending: profiles.filter((p) => p.verification_status === "pending").length,
      approved: profiles.filter((p) => p.verification_status === "approved").length,
      rejected: profiles.filter((p) => p.verification_status === "rejected").length,
    }),
    [profiles],
  );

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["admin-dashboard-data"] });
  };

  return (
    <AppShell
      title="מנהל מערכת"
      action={
        <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          <span className="font-semibold text-primary">אדמין</span>
          <span className="text-muted-foreground">· {profile?.full_name ?? ""}</span>
        </div>
      }
    >
      {/* KPI strip — row 1: marketplace health */}
      <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4 animate-fade-up">
        <StatCard label="סה״כ משתמשים" value={stats.total} icon={<Users className="h-5 w-5" />} />
        <StatCard
          label="ממתינים לאישור"
          value={stats.pending}
          icon={<AlertCircle className="h-5 w-5" />}
          highlight
        />
        <StatCard
          label="מכרזים פעילים"
          value={activeAuctions}
          icon={<Gavel className="h-5 w-5" />}
        />
        <StatCard
          label="עסקאות שנסגרו"
          value={completedDeals}
          icon={<Trophy className="h-5 w-5" />}
        />
      </div>

      {/* KPI strip — row 2: platform activity */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 animate-fade-up delay-100">
        <StatCard
          label="זכיות — 30 יום אחרון"
          value={recentAwards}
          icon={<Activity className="h-5 w-5" />}
          sub={completedDeals > 0 ? `מתוך ${completedDeals} סה״כ` : undefined}
        />
        <StatCard
          label="תאגידי כוח אדם"
          value={totalCorporations}
          icon={<Building2 className="h-5 w-5" />}
          sub={`${stats.approved} ספקים מאושרים`}
        />
        <StatCard
          label="שעות עבודה החודש"
          value={monthlyWorkerHours > 0 ? Math.round(monthlyWorkerHours).toLocaleString() : 0}
          icon={<BarChart3 className="h-5 w-5" />}
          sub={
            monthlyWorkforceValue > 0
              ? `₪${Math.round(monthlyWorkforceValue / 1000)}K ערך`
              : undefined
          }
        />
        <StatCard
          label="מאושרים (%)"
          value={stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}
          icon={<HardHat className="h-5 w-5" />}
          sub={`${stats.approved} מתוך ${stats.total}`}
          suffix="%"
        />
      </div>

      {/* Tab bar + search */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between animate-fade-up delay-100">
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
            <TabsTrigger value="all">הכל ({stats.total})</TabsTrigger>
            <TabsTrigger value="activity">
              <Activity className="me-1 h-3.5 w-3.5" /> פעולות
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className={`relative w-full md:w-72 ${tab === "activity" ? "invisible" : ""}`}>
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש לפי שם / ח.פ / רישיון..."
            className="pr-10 bg-card/60"
          />
        </div>
      </div>

      {/* Content */}
      {tab === "activity" ? (
        <ActivityLog entries={auditLog} isLoading={isLoading} />
      ) : error ? (
        <div className="empty-state border-destructive/30 bg-destructive/5">
          <div className="empty-state-icon border-destructive/20 bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="font-bold">שגיאה בטעינת נתוני הניהול</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            לא הצלחנו לטעון את הנתונים. נסה לרענן את הדף.
          </p>
        </div>
      ) : isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-border/60 bg-card p-4">
              <div className="h-5 w-40 rounded bg-muted" />
              <div className="mt-2 h-4 w-64 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-bold">אין משתמשים בקטגוריה זו</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {search ? "נסה לשנות את מילות החיפוש." : "משתמשים חדשים יופיעו כאן לאחר הרשמה."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <UserRow
              key={p.id}
              profile={p}
              roles={rolesByUser.get(p.user_id) ?? []}
              onChange={refresh}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}

function ActivityLog({ entries, isLoading }: { entries: AuditEntry[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="mt-2 h-3 w-48 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }
  if (entries.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <Activity className="h-8 w-8 text-primary" />
        </div>
        <h3 className="font-bold">אין פעולות להצגה</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">
          פעולות ניהול שיתבצעו במערכת יופיעו כאן.
        </p>
      </div>
    );
  }

  return (
    <Card className="divide-y divide-border/60 overflow-hidden">
      {entries.map((e) => (
        <div
          key={e.id}
          className="flex flex-wrap items-start justify-between gap-3 p-4 hover:bg-card/60 transition-colors"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs">
                {e.action}
              </Badge>
              <span className="text-sm text-muted-foreground">{e.entity_type}</span>
              {e.entity_id && (
                <span className="font-mono text-xs text-muted-foreground">
                  #{e.entity_id.slice(0, 8)}
                </span>
              )}
            </div>
            {e.metadata && Object.keys(e.metadata).length > 0 && (
              <pre
                className="mt-2 max-h-32 overflow-auto rounded-md bg-muted/40 p-2 text-xs text-muted-foreground"
                dir="ltr"
              >
                {JSON.stringify(e.metadata, null, 2)}
              </pre>
            )}
          </div>
          <div className="whitespace-nowrap text-xs text-muted-foreground">
            {new Date(e.created_at).toLocaleString("he-IL")}
          </div>
        </div>
      ))}
    </Card>
  );
}

function StatCard({
  label,
  value,
  icon,
  highlight,
  sub,
  suffix,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  highlight?: boolean;
  sub?: string;
  suffix?: string;
}) {
  const isHighlighted = highlight && Number(value) > 0;
  return (
    <div
      className={`rounded-2xl border p-5 transition-all hover:shadow-card ${
        isHighlighted
          ? "border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5"
          : "border-border/60 bg-card"
      }`}
    >
      <div
        className={`grid h-10 w-10 place-items-center rounded-xl ${
          isHighlighted
            ? "bg-gradient-primary text-primary-foreground shadow-elegant"
            : "bg-primary/15 text-primary"
        }`}
      >
        {icon}
      </div>
      <div className="mt-4 text-2xl font-extrabold tracking-tight md:text-3xl" dir="ltr">
        {value}
        {suffix}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
      {sub && <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function UserRow({
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
    <div className="rounded-2xl border border-border/60 bg-card p-4 transition-colors hover:border-border hover:bg-card/80">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
              {profile.full_name[0]}
            </div>
            <h3 className="text-base font-bold">{profile.full_name}</h3>
            <StatusBadge status={profile.verification_status} />
            {isAdmin && (
              <Badge variant="outline" className="border-primary/50 text-primary">
                אדמין
              </Badge>
            )}
            {isCorporation && (
              <Badge variant="secondary">
                <Building2 className="me-1 h-3 w-3" /> תאגיד
              </Badge>
            )}
            {isContractor && (
              <Badge variant="secondary">
                <HardHat className="me-1 h-3 w-3" /> קבלן/יזם
              </Badge>
            )}
          </div>
          <div className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
            {profile.business_name && (
              <span>
                עסק: <span className="text-foreground">{profile.business_name}</span>
              </span>
            )}
            {profile.business_id && (
              <span>
                ח.פ:{" "}
                <span className="text-foreground" dir="ltr">
                  {profile.business_id}
                </span>
              </span>
            )}
            {profile.contractor_license_number && (
              <span>
                רישיון:{" "}
                <span className="text-foreground" dir="ltr">
                  {profile.contractor_license_number}
                </span>
              </span>
            )}
            {profile.phone && (
              <span>
                טלפון:{" "}
                <span className="text-foreground" dir="ltr">
                  {profile.phone}
                </span>
              </span>
            )}
            {profile.city && (
              <span>
                עיר: <span className="text-foreground">{profile.city}</span>
              </span>
            )}
            <span className="text-xs">
              נרשם ב-{new Date(profile.created_at).toLocaleDateString("he-IL")}
            </span>
          </div>
        </div>
        <Button onClick={() => setOpen(true)} variant="outline" size="sm" className="shrink-0">
          פתח לבדיקה
        </Button>
      </div>
      {open && (
        <ReviewDialog
          profile={profile}
          roles={roles}
          onClose={() => setOpen(false)}
          onChange={onChange}
        />
      )}
    </div>
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
                      <ExternalLink className="h-3.5 w-3.5" /> צפה
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
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="סיבת דחייה / הערות פנימיות..."
              className="bg-card/60"
            />
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
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <FileX2 className="me-1 h-4 w-4" /> דחה
              </>
            )}
          </Button>
          <Button
            onClick={() => setStatus("approved")}
            disabled={busy}
            className="bg-gradient-primary text-primary-foreground"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <FileCheck2 className="me-1 h-4 w-4" /> אשר
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
