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
import { Card } from "@/components/ui/card";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Users,
  Loader2,
  Settings2,
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
  head: () => ({ meta: [{ title: "אישורי נוכחות — קבלן" }] }),
  component: Page,
});

const STATUS_META: Record<string, { label: string; className: string }> = {
  pending: {
    label: "ממתין לאישור",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-700",
  },
  approved: {
    label: "אושר",
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
  },
  auto_approved: {
    label: "אושר אוטומטית",
    className: "border-slate-400/40 bg-slate-100 text-slate-600",
  },
  exception: {
    label: "חריגה",
    className: "border-orange-500/40 bg-orange-500/10 text-orange-700",
  },
  rejected: {
    label: "נדחה",
    className: "border-destructive/40 bg-destructive/10 text-destructive",
  },
  correction_requested: {
    label: "בקשת תיקון",
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 md:py-14" dir="rtl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">
              ניהול נוכחות
            </div>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight">נוכחות היום</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {records.length} צוותים פעילים ·{" "}
              <span className={pending.length > 0 ? "font-bold text-amber-600" : ""}>
                {pending.length} ממתינים לאישור
              </span>
            </p>
          </div>
          <Link to="/contractor/projects">
            <Button variant="outline" size="sm" className="gap-2">
              <Settings2 className="h-4 w-4" /> הגדרת פרויקטים
            </Button>
          </Link>
        </div>

        {pending.length > 0 && (
          <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm">
                <span className="font-bold text-foreground">{pending.length} רשומות</span>
                <span className="text-muted-foreground"> ממתינות לאישורך</span>
              </div>
              <Button
                onClick={async () => {
                  const r = await approveAll({ data: {} });
                  toast.success(`אושרו ${r.count} רשומות`);
                  refetch();
                }}
                className="bg-gradient-primary text-primary-foreground shadow-elegant gap-2"
              >
                <CheckCircle2 className="h-4 w-4" /> אשר הכל ({pending.length})
              </Button>
            </div>
          </div>
        )}

        <div className="mt-6 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center rounded-2xl border border-border/60 bg-card p-12 text-sm text-muted-foreground">
              <Loader2 className="ml-2 h-4 w-4 animate-spin" /> טוען נוכחות…
            </div>
          ) : records.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
              <Clock className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">אין רשומות נוכחות להיום.</p>
            </div>
          ) : (
            records.map((r: AttendanceRecord) => {
              const s = STATUS_META[r.status] ?? STATUS_META.pending;
              return (
                <Card key={r.id} className="p-5">
                  <div className="flex flex-wrap items-start gap-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold">
                          {r.projects?.name}
                          {r.project_teams?.name ? ` · ${r.project_teams.name}` : ""}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${s.className}`}
                        >
                          {s.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {r.workers_actual ?? "—"}/{r.workers_expected} עובדים
                        </span>
                        {r.start_time && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(r.start_time).toLocaleTimeString("he-IL", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {r.end_time &&
                              ` — ${new Date(r.end_time).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}`}
                          </span>
                        )}
                        {r.total_hours && <span>{r.total_hours} שעות</span>}
                        {r.total_cost && (
                          <span className="font-semibold text-foreground">
                            ₪{Number(r.total_cost).toLocaleString()}
                          </span>
                        )}
                      </div>
                      {r.exception_reason && (
                        <div className="inline-flex items-center gap-1.5 rounded-lg border border-orange-400/30 bg-orange-500/5 px-3 py-1.5 text-xs text-orange-700">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          חריגה: {r.exception_reason}
                          {r.exception_note ? ` — ${r.exception_note}` : ""}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {r.frozen_at && (
                        <div className="text-xs text-muted-foreground">
                          נעול · {new Date(r.frozen_at).toLocaleDateString("he-IL")}
                        </div>
                      )}
                    </div>
                  </div>

                  {!r.frozen_at && (
                    <div className="mt-4 flex flex-col gap-2">
                      <div className="flex flex-wrap gap-2">
                        {(r.status === "pending" || r.status === "exception") && r.end_time && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10"
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
                </Card>
              );
            })
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
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
        className="gap-1 border-destructive/40 text-destructive hover:bg-destructive/10"
        onClick={() => setOpen(true)}
      >
        <XCircle className="h-3.5 w-3.5" /> דחה
      </Button>
    );

  return (
    <div className="flex w-full flex-wrap items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3">
      <input
        className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
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
      <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setReason(""); }}>
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
        className="gap-1 border-amber-500/40 text-amber-700 hover:bg-amber-500/10"
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
        className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm focus:border-primary focus:outline-none"
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
        className="w-full rounded-lg border border-border bg-card p-3 text-sm focus:border-primary focus:outline-none"
        rows={2}
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          className="gap-1"
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
