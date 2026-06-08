import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listCorporationDailyAccounts } from "@/lib/daily-accounts.functions";
import { AppShell } from "@/components/app-shell";
import {
  CheckCircle2,
  DollarSign,
  Calendar,
  AlertTriangle,
  Loader2,
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

  const { data: accountsData, isLoading } = useQuery({
    queryKey: ["corporation-daily-accounts", selectedMonth],
    queryFn: () => listAccounts({ data: { month: selectedMonth } }),
  });

  const accounts = (accountsData?.accounts ?? []) as DailyAccount[];

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
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <FileCheck className="h-4 w-4" />
          </div>
          <div className="mt-3 text-2xl font-extrabold">{totalAccounts}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">חשבונות החודש</div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <Calendar className="h-4 w-4" />
          </div>
          <div className="mt-3 text-2xl font-extrabold">{totalHours.toFixed(1)}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            שעות ({totalWorkerHours.toFixed(0)} שעות-עובד)
          </div>
        </div>
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600">
            <DollarSign className="h-4 w-4" />
          </div>
          <div className="mt-3 text-2xl font-extrabold">
            {totalCost > 0 ? `₪${totalCost.toLocaleString()}` : "—"}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">עלות מאושרת</div>
        </div>
        <div
          className={`rounded-2xl border p-4 ${
            exceptionCount > 0
              ? "border-orange-500/30 bg-orange-500/5"
              : "border-border/60 bg-card"
          }`}
        >
          <div
            className={`grid h-9 w-9 place-items-center rounded-xl ${
              exceptionCount > 0 ? "bg-orange-500/15 text-orange-600" : "bg-primary/10 text-primary"
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="mt-3 text-2xl font-extrabold">{exceptionCount}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">חריגות</div>
        </div>
      </div>

      {/* Auto-approval info banner */}
      {autoCount > 0 && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-slate-400/30 bg-slate-500/8 px-5 py-3 animate-fade-up delay-100">
          <Zap className="h-4 w-4 shrink-0 text-slate-500" />
          <p className="text-sm text-slate-600">
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
            className="h-9 rounded-xl border border-border bg-card px-3 text-sm focus:border-primary focus:outline-none"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center rounded-2xl border border-border/60 bg-card p-12 text-sm text-muted-foreground">
            <Loader2 className="ms-2 h-4 w-4 animate-spin" /> טוען חשבונות…
          </div>
        ) : accounts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
            <FileCheck className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-4 font-semibold">אין חשבונות לחודש זה</p>
            <p className="mt-1 text-sm text-muted-foreground">
              חשבונות יומיים יופיעו כאשר הקבלן יסגור ימי עבודה מאושרים.
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
                  ? "border-slate-400/40 bg-slate-500/10 text-slate-500"
                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
              }`}
            >
              {isAuto ? <Zap className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
              {isAuto ? "אושר אוטומטית" : "אושר ידנית"}
            </span>
            {account.has_exception && (
              <span className="inline-flex items-center gap-1 rounded-full border border-orange-400/40 bg-orange-500/10 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
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
            {account.hourly_rate != null && (
              <span>₪{Number(account.hourly_rate).toLocaleString()}/שעה</span>
            )}
            {account.total_cost != null && Number(account.total_cost) > 0 && (
              <span className="font-bold text-emerald-600">
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
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-orange-400/30 bg-orange-500/5 px-3 py-2 text-xs text-orange-700">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              חריגה: {account.exception_reason}
            </div>
          )}
        </div>

        {/* Generated timestamp */}
        <div className="shrink-0 text-right">
          <div className="rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5 text-xs text-muted-foreground">
            נוצר
            <div className="text-[10px]">
              {new Date(account.generated_at).toLocaleDateString("he-IL")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
