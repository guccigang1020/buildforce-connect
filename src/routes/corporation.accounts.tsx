import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listCorporationDailyAccounts } from "@/lib/daily-accounts.functions";
import { AppShell } from "@/components/app-shell";
import { NextStageNotice } from "@/components/next-stage-notice";
import {
  CheckCircle2,
  DollarSign,
  Calendar,
  AlertTriangle,
  Lock,
  FileCheck,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/corporation/accounts")({
  head: () => ({ meta: [{ title: "חשבונות יומיים — BuildForce" }] }),
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
  has_exception: boolean;
  exception_reason: string | null;
  generated_at: string;
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

  const listAccounts = useServerFn(listCorporationDailyAccounts);

  const {
    data: accountsData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["corporation-daily-accounts", selectedMonth],
    queryFn: () => listAccounts({ data: { month: selectedMonth } }),
    retry: false,
  });

  const accounts = (accountsData?.accounts ?? []) as DailyAccount[];

  // The attendance → daily-account → invoice pipeline only has data once crews
  // check in on-site (a real-device pilot step). Until then, show a clear
  // "next stage" explainer instead of a zeroed/erroring screen.
  if (!isLoading && (isError || accounts.length === 0)) {
    return (
      <AppShell title="חשבונות וחשבוניות">
        <NextStageNotice
          icon={FileCheck}
          title="חשבונות וחשבוניות — השלב הבא"
          description="כאן יופיעו החשבונות היומיים והחשבונית החודשית שלך — נבנים אוטומטית מנוכחות העובדים המאומתת באתר. החלק הזה נכנס לפעולה בפיילוט, ברגע שהצוותים מתחילים לדווח נוכחות."
          steps={[
            "ראש הצוות פותח וסוגר יום עבודה מהנייד — צילום + מיקום GPS",
            "כל יום עבודה הופך לחשבון שקוף: שעות × תעריף מאושר",
            "בסוף החודש מתקבלת חשבונית מוכנה ומגובה בראיות — ללא מחלוקות",
          ]}
        />
      </AppShell>
    );
  }

  const totalAccounts = accounts.length;
  const totalHours = accounts.reduce((s, a) => s + Number(a.total_hours ?? 0), 0);
  const totalWorkerHours = accounts.reduce((s, a) => s + Number(a.total_worker_hours ?? 0), 0);
  const totalCost = accounts.reduce((s, a) => s + Number(a.total_cost ?? 0), 0);
  const autoCount = accounts.filter((a) => a.approval_method === "auto").length;
  const exceptionCount = accounts.filter((a) => a.has_exception).length;

  return (
    <AppShell title="חשבונות יומיים מאושרים">
      {/* KPI strip */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 animate-fade-up">
        <div className="kpi-card p-5">
          <div className="kpi-icon kpi-icon-primary">
            <FileCheck className="h-4 w-4" />
          </div>
          <div className="mt-4 text-2xl font-extrabold tracking-tight">{totalAccounts}</div>
          <div className="mt-0.5 text-xs font-medium text-muted-foreground">חשבונות החודש</div>
        </div>
        <div className="kpi-card p-5">
          <div className="kpi-icon kpi-icon-primary">
            <Calendar className="h-4 w-4" />
          </div>
          <div className="mt-4 text-2xl font-extrabold tracking-tight" dir="ltr">
            {totalHours.toFixed(1)}
          </div>
          <div className="mt-0.5 text-xs font-medium text-muted-foreground">
            שעות ({totalWorkerHours.toFixed(0)} שעות-עובד)
          </div>
        </div>
        <div className="kpi-card kpi-card-success p-5">
          <div className="kpi-icon kpi-icon-success">
            <DollarSign className="h-4 w-4" />
          </div>
          <div className="mt-4 text-2xl font-extrabold tracking-tight" dir="ltr">
            {totalCost > 0 ? `₪${totalCost.toLocaleString()}` : "—"}
          </div>
          <div className="mt-0.5 text-xs font-medium text-muted-foreground">עלות מאושרת</div>
        </div>
        <div className={`kpi-card p-5 ${exceptionCount > 0 ? "kpi-card-warning" : ""}`}>
          <div
            className={`kpi-icon ${exceptionCount > 0 ? "kpi-icon-warning" : "kpi-icon-primary"}`}
          >
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="mt-4 text-2xl font-extrabold tracking-tight">{exceptionCount}</div>
          <div className="mt-0.5 text-xs font-medium text-muted-foreground">חריגות</div>
        </div>
      </div>

      {/* Auto-approval info banner */}
      {autoCount > 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/20 px-5 py-3 animate-fade-up delay-100">
          <Zap className="h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-sm text-foreground">
            <span className="font-bold">{autoCount} חשבונות</span> בחודש זה אושרו אוטומטית על ידי
            המערכת (מנהל האתר לא אישר בזמן).
          </p>
        </div>
      )}

      {/* Accounts list */}
      <section className="animate-fade-up delay-200">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-foreground">חשבונות יומיים</h2>
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

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton-row animate-pulse bg-muted/40" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div>
              <p className="font-semibold text-destructive">לא הצלחנו לטעון את החשבונות</p>
              <p className="mt-1 text-muted-foreground">נסה לרענן את הדף, או לבחור חודש אחר.</p>
            </div>
          </div>
        ) : accounts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <FileCheck className="h-7 w-7 text-primary" />
            </div>
            <p className="text-sm font-bold text-foreground">אין חשבונות לחודש זה</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              חשבונות יומיים יופיעו כאן ברגע שהקבלן יסגור ימי עבודה מאושרים.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((a) => (
              <CorpAccountCard key={a.id} account={a} />
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function CorpAccountCard({ account }: { account: DailyAccount }) {
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
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                isAuto
                  ? "border-border bg-muted/40 text-muted-foreground"
                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
              }`}
            >
              {isAuto ? <Zap className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
              {isAuto ? "אושר אוטומטית" : "אושר ידנית"}
            </span>
            {account.has_exception && (
              <span className="inline-flex items-center gap-1 rounded-full border border-orange-400/40 bg-orange-500/10 px-2.5 py-0.5 text-xs font-semibold text-orange-600">
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
                <span className="font-semibold text-foreground" dir="ltr">
                  {account.workers_actual}
                  {account.workers_expected ? `/${account.workers_expected}` : ""}
                </span>{" "}
                עובדים
              </span>
            )}
            {account.start_time && account.end_time && (
              <span dir="ltr">
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
              <span dir="ltr">{Number(account.total_hours).toFixed(2)} שעות</span>
            )}
            {account.total_worker_hours != null && (
              <span className="text-xs" dir="ltr">
                ({Number(account.total_worker_hours).toFixed(1)} שעות-עובד)
              </span>
            )}
            {account.hourly_rate != null && (
              <span dir="ltr">₪{Number(account.hourly_rate).toLocaleString()}/שעה</span>
            )}
            {account.total_cost != null && Number(account.total_cost) > 0 && (
              <span className="font-bold text-emerald-600" dir="ltr">
                ₪{Number(account.total_cost).toLocaleString()}
              </span>
            )}
          </div>

          {/* Contractor + team leader */}
          {(account.contractor_name || account.team_leader_name) && (
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
              {account.contractor_name && <span>קבלן: {account.contractor_name}</span>}
              {account.team_leader_name && <span>ראש צוות: {account.team_leader_name}</span>}
              {account.site_manager_name && <span>מנהל אתר: {account.site_manager_name}</span>}
            </div>
          )}

          {/* Exception note */}
          {account.has_exception && account.exception_reason && (
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-orange-400/30 bg-orange-500/5 px-3 py-2 text-xs text-orange-600">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              חריגה: {account.exception_reason}
            </div>
          )}
        </div>

        {/* Generated timestamp */}
        <div className="shrink-0 text-right">
          <div className="rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5 text-xs text-muted-foreground">
            נוצר
            <div className="text-xs" dir="ltr">
              {new Date(account.generated_at).toLocaleDateString("he-IL")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
