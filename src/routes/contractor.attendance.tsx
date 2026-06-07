import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  listContractorAttendance,
  approveAttendance,
  approveAllPending,
  rejectAttendance,
  reportException,
} from "@/lib/attendance.functions";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Users,
  Loader2,
  Settings2,
  Calendar,
  DollarSign,
} from "lucide-react";

type AttendanceRecord = {
  id: string;
  status: string;
  start_time: string | null;
  end_time: string | null;
  workers_actual: number | null;
  workers_expected: number;
  total_hours: number | null;
  total_cost: number | null;
  exception_reason: string | null;
  exception_note: string | null;
  frozen_at: string | null;
  projects?: { name: string } | null;
  project_teams?: { name: string } | null;
};

export const Route = createFileRoute("/contractor/attendance")({
  head: () => ({ meta: [{ title: "אישורי נוכחות — BuildForce" }] }),
  component: Page,
});

const STATUS_META: Record<string, { label: string; dot: string; className: string }> = {
  pending: {
    label: "ממתין לאישור",
    dot: "bg-amber-500",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-700",
  },
  approved: {
    label: "אושר",
    dot: "bg-emerald-500",
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
  },
  auto_approved: {
    label: "אושר אוטומטית",
    dot: "bg-slate-400",
    className: "border-slate-400/40 bg-slate-500/10 text-slate-400",
  },
  exception: {
    label: "חריגה",
    dot: "bg-orange-500",
    className: "border-orange-500/40 bg-orange-500/10 text-orange-700",
  },
  rejected: {
    label: "נדחה",
    dot: "bg-red-500",
    className: "border-destructive/40 bg-destructive/10 text-destructive",
  },
  correction_requested: {
    label: "בקשת תיקון",
    dot: "bg-purple-500",
    className: "border-purple-500/40 bg-purple-500/10 text-purple-700",
  },
};

function Page() {
  const list = useServerFn(listContractorAttendance);
  const approve = useServerFn(approveAttendance);
  const approveAll = useServerFn(approveAllPending);
  const reject = useServerFn(rejectAttendance);
  const exc = useServerFn(reportException);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["contractor-att"],
    queryFn: () => list({ data: {} }),
  });
  const records = data?.records ?? [];
  const pending = records.filter(
    (r: AttendanceRecord) => (r.status === "pending" || r.status === "exception") && r.end_time,
  );

  const totalHours = records.reduce((s: number, r: AttendanceRecord) => s + (r.total_hours ?? 0), 0);
  const totalCost = records.reduce((s: number, r: AttendanceRecord) => s + Number(r.total_cost ?? 0), 0);
  const approved = records.filter((r: AttendanceRecord) => r.status === "approved" || r.status === "auto_approved").length;

  return (
    <AppShell
      title="נוכחות"
      action={
        <Link to="/contractor/projects">
          <Button variant="outline" size="sm" className="gap-2">
            <Settings2 className="h-4 w-4" /> פרויקטים
          </Button>
        </Link>
      }
    >
      {/* KPI summary */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 animate-fade-up">
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <Users className="h-4 w-4" />
          </div>
          <div className="mt-3 text-2xl font-extrabold">{records.length}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">צוותים פעילים</div>
        </div>
        <div className={`rounded-2xl border p-4 ${pending.length > 0 ? "border-amber-500/30 bg-amber-500/5" : "border-border/60 bg-card"}`}>
          <div className={`grid h-9 w-9 place-items-center rounded-xl ${pending.length > 0 ? "bg-amber-500/15 text-amber-600" : "bg-primary/10 text-primary"}`}>
            <Clock className="h-4 w-4" />
          </div>
          <div className="mt-3 text-2xl font-extrabold">{pending.length}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">ממתינים לאישור</div>
        </div>
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600">
            <Calendar className="h-4 w-4" />
          </div>
          <div className="mt-3 text-2xl font-extrabold">{totalHours.toFixed(1)}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">שעות היום</div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <DollarSign className="h-4 w-4" />
          </div>
          <div className="mt-3 text-2xl font-extrabold">
            {totalCost > 0 ? `₪${totalCost.toLocaleString()}` : "—"}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">עלות מצטברת</div>
        </div>
      </div>

      {/* Pending approval banner */}
      {pending.length > 0 && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/8 px-5 py-4 animate-fade-up delay-100">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500/15 text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground">
                {pending.length} רשומות ממתינות לאישורך
              </div>
              <div className="text-xs text-muted-foreground">אשר ידנית או לחץ לאישור הכל</div>
            </div>
          </div>
          <Button
            onClick={async () => {
              const r = await approveAll({ data: {} });
              toast.success(`אושרו ${r.count} רשומות`);
              refetch();
            }}
            className="bg-gradient-primary text-primary-foreground shadow-elegant gap-2 shrink-0"
            size="sm"
          >
            <CheckCircle2 className="h-4 w-4" />
            אשר הכל ({pending.length})
          </Button>
        </div>
      )}

      {/* Records list */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center rounded-2xl border border-border/60 bg-card p-12 text-sm text-muted-foreground">
            <Loader2 className="ms-2 h-4 w-4 animate-spin" /> טוען נוכחות…
          </div>
        ) : records.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
            <Clock className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-4 font-semibold">אין רשומות נוכחות להיום</p>
            <p className="mt-1 text-sm text-muted-foreground">
              הרשומות יופיעו כאשר צוותים יתחילו לדווח נוכחות.
            </p>
          </div>
        ) : (
          records.map((r: AttendanceRecord) => {
            const s = STATUS_META[r.status] ?? STATUS_META.pending;
            return (
              <div
                key={r.id}
                className="rounded-2xl border border-border/60 bg-card p-5 transition-colors hover:border-border"
              >
                <div className="flex flex-wrap items-start gap-4">
                  <div className="min-w-0 flex-1 space-y-2.5">
                    {/* Header row */}
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                        <span className="font-bold">
                          {r.projects?.name}
                          {r.project_teams?.name ? ` · ${r.project_teams.name}` : ""}
                        </span>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${s.className}`}
                      >
                        {s.label}
                      </span>
                    </div>

                    {/* Details row */}
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        <span>
                          <span className="font-semibold text-foreground">
                            {r.workers_actual ?? "—"}
                          </span>
                          /{r.workers_expected} עובדים
                        </span>
                      </span>
                      {r.start_time && (
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(r.start_time).toLocaleTimeString("he-IL", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {r.end_time &&
                            ` — ${new Date(r.end_time).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}`}
                        </span>
                      )}
                      {r.total_hours != null && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {r.total_hours} שעות
                        </span>
                      )}
                      {r.total_cost != null && Number(r.total_cost) > 0 && (
                        <span className="font-bold text-emerald-600">
                          ₪{Number(r.total_cost).toLocaleString()}
                        </span>
                      )}
                    </div>

                    {/* Exception note */}
                    {r.exception_reason && (
                      <div className="inline-flex items-center gap-1.5 rounded-xl border border-orange-400/30 bg-orange-500/5 px-3 py-2 text-xs text-orange-700">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        חריגה: {r.exception_reason}
                        {r.exception_note ? ` — ${r.exception_note}` : ""}
                      </div>
                    )}

                    {/* Actions */}
                    {!r.frozen_at && (
                      <div className="flex flex-col gap-2 pt-1">
                        <div className="flex flex-wrap gap-2">
                          {(r.status === "pending" || r.status === "exception") && r.end_time && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10"
                                onClick={async () => {
                                  await approve({ data: { recordId: r.id } });
                                  toast.success("הרשומה אושרה");
                                  refetch();
                                }}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" /> אשר
                              </Button>
                              <RejectButton
                                onReject={async (reason) => {
                                  await reject({ data: { recordId: r.id, reason } });
                                  toast.success("הרשומה נדחתה");
                                  refetch();
                                }}
                              />
                            </>
                          )}
                          {r.start_time && !r.end_time && (
                            <ReportExceptionInline recordId={r.id} onDone={refetch} fn={exc} />
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right side: frozen indicator */}
                  {r.frozen_at && (
                    <div className="shrink-0 text-right">
                      <div className="rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5 text-xs text-muted-foreground">
                        נעול
                        <div className="text-[10px]">
                          {new Date(r.frozen_at).toLocaleDateString("he-IL")}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </AppShell>
  );
}

function RejectButton({ onReject }: { onReject: (reason: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  if (!open)
    return (
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
        onClick={() => setOpen(true)}
      >
        <XCircle className="h-3.5 w-3.5" /> דחה
      </Button>
    );

  return (
    <div className="flex w-full flex-wrap items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3">
      <input
        className="h-9 flex-1 min-w-0 rounded-lg border border-border bg-card/80 px-3 text-sm focus:border-primary focus:outline-none"
        placeholder="סיבת דחייה (לפחות 3 תווים)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        autoFocus
      />
      <Button
        size="sm"
        variant="destructive"
        disabled={reason.trim().length < 3}
        onClick={async () => {
          await onReject(reason.trim());
          setOpen(false);
          setReason("");
        }}
      >
        אשר דחייה
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          setOpen(false);
          setReason("");
        }}
      >
        ביטול
      </Button>
    </div>
  );
}

function ReportExceptionInline({
  recordId,
  onDone,
  fn,
}: {
  recordId: string;
  onDone: () => void;
  fn: (args: {
    data: { recordId: string; reason: string; note: string };
  }) => Promise<{ notify?: string | null } | undefined>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<
    "left_early" | "partial_left" | "absent" | "half_day" | "late" | "other"
  >("partial_left");
  const [note, setNote] = useState("");

  if (!open)
    return (
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5 border-amber-500/40 text-amber-700 hover:bg-amber-500/10"
        onClick={() => setOpen(true)}
      >
        <AlertTriangle className="h-3.5 w-3.5" /> דווח חריגה
      </Button>
    );

  return (
    <div className="w-full space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="text-xs font-bold text-amber-700">דיווח חריגה בנוכחות</div>
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value as never)}
        className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm focus:border-primary focus:outline-none"
      >
        <option value="partial_left">חלק מהצוות עזב</option>
        <option value="left_early">כל הצוות עזב מוקדם</option>
        <option value="absent">לא הגיעו</option>
        <option value="half_day">חצי יום</option>
        <option value="late">איחור</option>
        <option value="other">אחר</option>
      </select>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="הסבר מה קרה ומתי"
        className="w-full rounded-xl border border-border bg-card p-3 text-sm focus:border-primary focus:outline-none"
        rows={2}
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          className="gap-1.5 bg-gradient-primary text-primary-foreground"
          onClick={async () => {
            if (note.trim().length < 3) return toast.error("יש להסביר מה קרה");
            const r = await fn({ data: { recordId, reason, note } });
            toast.success("החריגה דווחה");
            if (r?.notify) window.open(r.notify, "_blank");
            setOpen(false);
            onDone();
          }}
        >
          <AlertTriangle className="h-3.5 w-3.5" /> שלח דיווח
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          ביטול
        </Button>
      </div>
    </div>
  );
}
