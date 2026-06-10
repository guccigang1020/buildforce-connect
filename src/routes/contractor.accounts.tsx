import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  generateDailyAccounts,
  getPendingClosureRecords,
  listContractorDailyAccounts,
} from "@/lib/daily-accounts.functions";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";
import { NextStageNotice } from "@/components/next-stage-notice";
import {
  CheckCircle2,
  Clock,
  DollarSign,
  Calendar,
  AlertTriangle,
  Loader2,
  Lock,
  X,
  FileCheck,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/contractor/accounts")({
  head: () => ({ meta: [{ title: "חשבון יומי מאושר — BuildForce" }] }),
  component: Page,
});

type DailyAccount = {
  id: string;
  work_date: string;
  project_name: string;
  contractor_name: string | null;
  corporation_name: string | null;
  team_name: string | null;
  team_leader_name: string | null;
  site_manager_name: string | null;
  workers_actual: number | null;
  workers_expected: number | null;
  start_time: string | null;
  end_time: string | null;
  total_hours: number | null;
  total_worker_hours: number | null;
  hourly_rate: number | null;
  total_cost: number | null;
  approval_method: string;
  approved_at: string | null;
  has_exception: boolean;
  exception_reason: string | null;
  generated_at: string;
};

type PendingRecord = {
  id: string;
  work_date: string;
  status: string;
  total_cost: number | null;
  total_hours: number | null;
  workers_actual: number | null;
  projects: { name: string } | null;
  project_teams: { name: string } | null;
};

type PendingDateGroup = {
  date: string;
  count: number;
  totalCost: number;
  totalHours: number;
  autoCount: number;
  records: PendingRecord[];
};

function getMonthOptions(count = 12) {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString("he-IL", { year: "numeric", month: "long" });
    opts.push({ value, label });
  }
  return opts;
}

const currentMonth = new Date().toISOString().slice(0, 7);
const monthOptions = getMonthOptions();

function formatDateHebrew(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function Page() {
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [closingDate, setClosingDate] = useState<string | null>(null);
  const [showCloseDialog, setShowCloseDialog] = useState<PendingDateGroup | null>(null);

  const generate = useServerFn(generateDailyAccounts);
  const getPending = useServerFn(getPendingClosureRecords);
  const listAccounts = useServerFn(listContractorDailyAccounts);

  const { data: pendingData, refetch: refetchPending } = useQuery({
    queryKey: ["contractor-pending-closure"],
    queryFn: () => getPending({ data: {} }),
  });

  const {
    data: accountsData,
    isLoading: accountsLoading,
    refetch: refetchAccounts,
  } = useQuery({
    queryKey: ["contractor-daily-accounts", selectedMonth],
    queryFn: () => listAccounts({ data: { month: selectedMonth } }),
    retry: false,
  });

  const pendingRecords = (pendingData?.records ?? []) as unknown as PendingRecord[];
  const accounts = (accountsData?.accounts ?? []) as DailyAccount[];

  // Group pending records by work_date
  const pendingGroups = (() => {
    const map = new Map<string, PendingRecord[]>();
    for (const rec of pendingRecords) {
      const existing = map.get(rec.work_date) ?? [];
      existing.push(rec);
      map.set(rec.work_date, existing);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(
        ([date, recs]): PendingDateGroup => ({
          date,
          count: recs.length,
          totalCost: recs.reduce((s, r) => s + Number(r.total_cost ?? 0), 0),
          totalHours: recs.reduce((s, r) => s + Number(r.total_hours ?? 0), 0),
          autoCount: recs.filter((r) => r.status === "auto_approved").length,
          records: recs,
        }),
      );
  })();

  // KPI from current month accounts
  const totalAccounts = accounts.length;
  const totalHours = accounts.reduce((s, a) => s + Number(a.total_hours ?? 0), 0);
  const totalCost = accounts.reduce((s, a) => s + Number(a.total_cost ?? 0), 0);
  const autoCount = accounts.filter((a) => a.approval_method === "auto").length;

  // Nothing to close and no approved accounts yet → this whole screen depends on
  // on-site attendance (a real-device pilot step). Show a clear "next stage"
  // explainer instead of a zeroed page.
  if (!accountsLoading && pendingGroups.length === 0 && accounts.length === 0) {
    return (
      <AppShell title="חשבון יומי">
        <NextStageNotice
          icon={FileCheck}
          title="החשבון היומי שלך — השלב הבא"
          description="כאן ייסגרו ימי העבודה ויתקבל חשבון יומי שקוף לכל צוות — אוטומטית מהנוכחות המאומתת באתר. מתחיל להתמלא ברגע שראשי הצוות מדווחים נוכחות (צילום + GPS)."
          steps={[
            "ראש הצוות פותח וסוגר יום עבודה מהנייד — צילום + מיקום GPS",
            "אתה מאשר את היום (או שהוא מאושר אוטומטית) — שעות × תעריף",
            "סוגרים את היום ומקבלים חשבון נעול, מוכן לחשבונית חודשית",
          ]}
        />
      </AppShell>
    );
  }

  async function closeDay(group: PendingDateGroup) {
    setClosingDate(group.date);
    try {
      const result = await generate({ data: { date: group.date } });
      toast.success(
        `יום ${formatDateHebrew(group.date)} נסגר — ${result.created} רשומות נעולו | ₪${Number(result.totalCost).toLocaleString()}`,
      );
      setShowCloseDialog(null);
      await Promise.all([refetchPending(), refetchAccounts()]);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "שגיאה בסגירת היום");
    } finally {
      setClosingDate(null);
    }
  }

  return (
    <AppShell title="חשבון יומי מאושר">
      {/* KPI strip */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 animate-fade-up">
        <div className="kpi-card p-4">
          <div className="kpi-icon kpi-icon-primary">
            <FileCheck className="h-4 w-4" />
          </div>
          <div className="mt-3 text-2xl font-extrabold">{totalAccounts}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">חשבונות החודש</div>
        </div>
        <div className="kpi-card p-4">
          <div className="kpi-icon kpi-icon-primary">
            <Calendar className="h-4 w-4" />
          </div>
          <div className="mt-3 text-2xl font-extrabold">{totalHours.toFixed(1)}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">שעות מאושרות</div>
        </div>
        <div className="kpi-card kpi-card-success p-4">
          <div className="kpi-icon kpi-icon-success">
            <DollarSign className="h-4 w-4" />
          </div>
          <div className="mt-3 text-2xl font-extrabold">
            {totalCost > 0 ? `₪${totalCost.toLocaleString()}` : "—"}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">עלות מאושרת</div>
        </div>
        <div className="kpi-card p-4">
          <div className="kpi-icon kpi-icon-muted">
            <Zap className="h-4 w-4" />
          </div>
          <div className="mt-3 text-2xl font-extrabold">{autoCount}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">אושרו אוטומטית</div>
        </div>
      </div>

      {/* Pending closure section */}
      {pendingGroups.length > 0 && (
        <section className="mb-8 animate-fade-up delay-100">
          <h2 className="mb-3 text-sm font-bold text-foreground">ממתינים לסגירה</h2>
          <div className="space-y-3">
            {pendingGroups.map((group) => (
              <div
                key={group.date}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/8 px-5 py-4 status-bar-pending"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-400">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground">
                      {formatDateHebrew(group.date)}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span>{group.count} רשומות מאושרות</span>
                      <span>{group.totalHours.toFixed(1)} שעות</span>
                      {group.totalCost > 0 && (
                        <span className="font-semibold text-emerald-400">
                          ₪{group.totalCost.toLocaleString()}
                        </span>
                      )}
                      {group.autoCount > 0 && (
                        <span className="text-slate-400">{group.autoCount} אושרו אוטומטית</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="ms-auto shrink-0">
                  <Button
                    size="sm"
                    className="h-10 gap-1.5 bg-gradient-primary text-primary-foreground shadow-elegant"
                    disabled={closingDate === group.date}
                    onClick={() => setShowCloseDialog(group)}
                  >
                    <Lock className="h-3.5 w-3.5" />
                    סגור יום
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Daily accounts list */}
      <section className="animate-fade-up delay-200">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-foreground">חשבונות יומיים מאושרים</h2>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-10 rounded-xl border border-border bg-card px-3 text-sm focus:border-primary focus:outline-none"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {accountsLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton-kpi animate-pulse bg-muted/40" />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon mx-auto">
              <FileCheck className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-bold">אין חשבונות לחודש זה</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              סגור ימים מאושרים בעמוד הנוכחות כדי ליצור חשבונות יומיים נעולים.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((a) => (
              <AccountCard key={a.id} account={a} />
            ))}
          </div>
        )}
      </section>

      {/* Close day confirmation dialog */}
      {showCloseDialog && (
        <CloseDayDialog
          group={showCloseDialog}
          closing={closingDate === showCloseDialog.date}
          onConfirm={() => closeDay(showCloseDialog)}
          onClose={() => setShowCloseDialog(null)}
        />
      )}
    </AppShell>
  );
}

function AccountCard({ account }: { account: DailyAccount }) {
  const isAuto = account.approval_method === "auto";
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1 space-y-2.5">
          {/* Header */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="font-bold">
                {account.project_name}
                {account.team_name ? ` · ${account.team_name}` : ""}
              </span>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              {isAuto ? "אושר אוטומטית" : "אושר ידנית"}
            </span>
            {account.has_exception && (
              <span className="inline-flex items-center gap-1 rounded-full border border-orange-400/40 bg-orange-500/10 px-2.5 py-0.5 text-xs font-semibold text-orange-400">
                <AlertTriangle className="h-3 w-3" />
                חריגה
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/30 px-2.5 py-0.5 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              נעול
            </span>
          </div>

          {/* Details */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
            <span>{formatDateHebrew(account.work_date)}</span>
            {account.workers_actual != null && (
              <span>
                <span className="font-semibold text-foreground">{account.workers_actual}</span>
                {account.workers_expected ? `/${account.workers_expected}` : ""} עובדים
              </span>
            )}
            {account.start_time && account.end_time && (
              <span>
                {new Date(account.start_time).toLocaleTimeString("he-IL", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {" — "}
                {new Date(account.end_time).toLocaleTimeString("he-IL", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
            {account.total_hours != null && (
              <span>{Number(account.total_hours).toFixed(2)} שעות</span>
            )}
            {account.total_worker_hours != null && (
              <span className="text-xs">
                ({Number(account.total_worker_hours).toFixed(1)} שעות-עובד)
              </span>
            )}
            {account.total_cost != null && Number(account.total_cost) > 0 && (
              <span className="font-bold text-emerald-600">
                ₪{Number(account.total_cost).toLocaleString()}
              </span>
            )}
          </div>

          {/* Corporation + team leader */}
          {(account.corporation_name || account.team_leader_name) && (
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
              {account.corporation_name && <span>תאגיד: {account.corporation_name}</span>}
              {account.team_leader_name && <span>ראש צוות: {account.team_leader_name}</span>}
            </div>
          )}
        </div>

        {/* Generated timestamp */}
        <div className="shrink-0 text-right">
          <div className="rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5 text-xs text-muted-foreground">
            נוצר
            <div className="text-[11px]">
              {new Date(account.generated_at).toLocaleDateString("he-IL")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CloseDayDialog({
  group,
  closing,
  onConfirm,
  onClose,
}: {
  group: PendingDateGroup;
  closing: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-elegant animate-fade-up">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold">סגירת יום עבודה</h2>
            <p className="mt-1 text-sm text-muted-foreground">{formatDateHebrew(group.date)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border/60 text-muted-foreground hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Records list */}
        <div className="mb-4 rounded-2xl border border-border/60 bg-muted/20 p-4">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            רשומות לנעילה
          </div>
          <div className="space-y-2">
            {group.records.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  {r.status === "auto_approved" && (
                    <Zap className="h-3 w-3 shrink-0 text-slate-400" />
                  )}
                  {r.status === "approved" && (
                    <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
                  )}
                  <span className="truncate text-muted-foreground">
                    {r.projects?.name}
                    {r.project_teams?.name ? ` · ${r.project_teams.name}` : ""}
                  </span>
                </div>
                <div className="shrink-0 text-left text-xs">
                  {r.total_hours != null && (
                    <span className="me-2">{Number(r.total_hours).toFixed(2)}ש</span>
                  )}
                  {r.total_cost != null && Number(r.total_cost) > 0 && (
                    <span className="font-semibold text-emerald-600">
                      ₪{Number(r.total_cost).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 border-t border-border/40 pt-3 flex items-center justify-between text-sm font-bold">
            <span>סה"כ</span>
            <div className="flex gap-4">
              <span>{group.totalHours.toFixed(1)} שעות</span>
              {group.totalCost > 0 && (
                <span className="text-emerald-600">₪{group.totalCost.toLocaleString()}</span>
              )}
            </div>
          </div>
        </div>

        {/* Auto-approval warning */}
        {group.autoCount > 0 && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-slate-400/30 bg-slate-500/8 p-3">
            <Zap className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <div className="text-sm text-slate-300">
              <span className="font-bold">{group.autoCount} רשומות</span> אושרו אוטומטית על ידי
              המערכת (לא על ידי מנהל האתר).
            </div>
          </div>
        )}

        {/* Irreversibility warning */}
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/8 p-3">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div className="text-sm text-amber-300">
            פעולה זו <span className="font-bold">בלתי הפיכה</span>. הרשומות יינעלו לעריכה. שינויים
            לאחר הנעילה מצריכים תהליך מחלוקת רשמי.
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            className="flex-1 gap-2 bg-gradient-primary text-primary-foreground shadow-elegant"
            disabled={closing}
            onClick={onConfirm}
          >
            {closing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            סגור יום ונעל רשומות
          </Button>
          <Button variant="outline" onClick={onClose} disabled={closing}>
            ביטול
          </Button>
        </div>
      </div>
    </div>
  );
}
