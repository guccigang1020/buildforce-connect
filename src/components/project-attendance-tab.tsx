import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Clock, Users, Coins, LogIn, LogOut, Camera } from "lucide-react";
import { toast } from "sonner";
import {
  listProjectAttendanceDays,
  listAttendancePresentWorkers,
} from "@/lib/project-attendance.functions";
import {
  getAttendanceRecord,
  approveEntry,
  rejectEntry,
  approveExit,
  rejectExit,
} from "@/lib/attendance.functions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AttendanceCalendar, type CalDay } from "@/components/attendance-calendar";
import { SIDE_TEXT, type Side } from "@/lib/sides";
import { israelToday } from "@/lib/dates";

// Calendar dashboard for a single project's attendance. A month grid sits on top
// (each day dotted by entry/exit status); selecting a day opens a detail panel
// below with the entry (כניסה) + exit (יציאה) photos, times, present workers and
// — crucially — WHO approved each phase. The contractor + site foreman
// (canApprove) can approve/reject; everyone else gets a read-only view. Rendered
// inside a project tab — no page chrome of its own.

type AttendanceDay = CalDay & {
  id: string;
  status: string;
  workers_actual: number | null;
  workers_expected: number | null;
  total_hours: number | null;
  total_cost: number | null;
  frozen_at: string | null;
  start_photo_url: string | null;
  end_photo_url: string | null;
};

type FullRecord = {
  id: string;
  start_time: string | null;
  end_time: string | null;
  total_hours: number | null;
  total_cost: number | null;
  start_photo_url: string | null;
  end_photo_url: string | null;
  entry_approved_at: string | null;
  exit_approved_at: string | null;
  entry_rejection_reason: string | null;
  exit_rejection_reason: string | null;
  frozen_at: string | null;
};

type Approver = { name: string; side: Side; role: string };

type PresentWorker = {
  worker_id: string;
  first_name: string;
  last_name: string;
  passport_number: string;
  present: boolean;
  note: string | null;
};

type ChipKind = "approved" | "pending" | "rejected" | "muted";

function resolvePhase(opts: {
  rejectionReason: string | null;
  approvedAt: string | null;
  timeSet: string | null;
}): { kind: ChipKind; label: string } {
  if (opts.rejectionReason) return { kind: "rejected", label: "נדחתה" };
  if (opts.approvedAt) return { kind: "approved", label: "אושרה" };
  if (opts.timeSet) return { kind: "pending", label: "ממתינה" };
  return { kind: "muted", label: "לא דווח" };
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

function formatDayLabel(workDate: string): string {
  const isToday = workDate === israelToday();
  const label = new Date(workDate + "T00:00:00").toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return isToday ? `היום · ${label}` : label;
}

export function ProjectAttendanceTab({
  projectId,
  canApprove,
}: {
  projectId: string;
  canApprove: boolean;
}) {
  const listDaysFn = useServerFn(listProjectAttendanceDays);
  const [selected, setSelected] = useState<string>(() => israelToday());
  const [openDay, setOpenDay] = useState<string | null>(null);

  const daysQuery = useQuery({
    queryKey: ["project-attendance-days", projectId],
    queryFn: () => listDaysFn({ data: { projectId } }),
  });

  const days = (daysQuery.data?.days ?? []) as AttendanceDay[];
  const selectedDay = openDay ? (days.find((d) => d.work_date === openDay) ?? null) : null;

  return (
    <div dir="rtl" className="space-y-4">
      {daysQuery.isLoading ? (
        <div className="enterprise-card h-80 animate-pulse" />
      ) : (
        <AttendanceCalendar
          days={days}
          selected={selected}
          onSelect={(iso) => {
            setSelected(iso);
            setOpenDay(iso);
          }}
        />
      )}

      <Dialog open={!!openDay} onOpenChange={(o) => !o && setOpenDay(null)}>
        <DialogContent dir="rtl" className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{openDay ? formatDayLabel(openDay) : ""}</DialogTitle>
          </DialogHeader>
          {selectedDay ? (
            <SelectedDayDetail day={selectedDay} canApprove={canApprove} projectId={projectId} />
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">אין דיווח ליום זה</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SelectedDayDetail({
  day,
  canApprove,
  projectId,
}: {
  day: AttendanceDay;
  canApprove: boolean;
  projectId: string;
}) {
  const recordId = day.id;
  const qc = useQueryClient();
  const getRecordFn = useServerFn(getAttendanceRecord);
  const listWorkersFn = useServerFn(listAttendancePresentWorkers);
  const approveEntryFn = useServerFn(approveEntry);
  const rejectEntryFn = useServerFn(rejectEntry);
  const approveExitFn = useServerFn(approveExit);
  const rejectExitFn = useServerFn(rejectExit);

  const recordQuery = useQuery({
    queryKey: ["attendance-record", recordId],
    queryFn: () => getRecordFn({ data: { recordId } }),
  });
  const workersQuery = useQuery({
    queryKey: ["attendance-present-workers", recordId],
    queryFn: () => listWorkersFn({ data: { recordId } }),
  });

  const record = (recordQuery.data?.record ?? null) as FullRecord | null;
  const signedUrls = (recordQuery.data?.signedUrls ?? {}) as Record<string, string>;
  const entryApprover = (recordQuery.data?.entryApprover ?? null) as Approver | null;
  const exitApprover = (recordQuery.data?.exitApprover ?? null) as Approver | null;
  const workers = (workersQuery.data?.workers ?? []) as PresentWorker[];
  const presentWorkers = workers.filter((w) => w.present);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["project-attendance-days", projectId] });
    void qc.invalidateQueries({ queryKey: ["attendance-record", recordId] });
    void qc.invalidateQueries({ queryKey: ["attendance-present-workers", recordId] });
  };

  // Prefer the freshly-fetched full record; fall back to the day row from the list.
  const r = record ?? day;
  const frozen = !!r.frozen_at;

  const startPhotoUrl = r.start_photo_url ? signedUrls[r.start_photo_url] : undefined;
  const endPhotoUrl = r.end_photo_url ? signedUrls[r.end_photo_url] : undefined;

  const entry = resolvePhase({
    rejectionReason: r.entry_rejection_reason,
    approvedAt: r.entry_approved_at,
    timeSet: r.start_time,
  });
  const exit = resolvePhase({
    rejectionReason: r.exit_rejection_reason,
    approvedAt: r.exit_approved_at,
    timeSet: r.end_time,
  });

  return (
    <div className="space-y-4">
      {/* Hours / cost summary */}
      {r.total_hours != null || r.total_cost != null ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="kpi-card flex items-center gap-2 p-3">
            <Clock className="size-5 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">שעות עבודה</span>
              <span className="text-sm font-semibold text-foreground">
                {r.total_hours != null ? r.total_hours : "—"}
              </span>
            </div>
          </div>
          <div className="kpi-card flex items-center gap-2 p-3">
            <Coins className="size-5 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">עלות</span>
              <span className="text-sm font-semibold text-foreground">
                {r.total_cost != null ? `₪${Number(r.total_cost).toLocaleString("he-IL")}` : "—"}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* 🟢 כניסה */}
        <PhaseBlock
          title="🟢 כניסה"
          phaseKind={entry.kind}
          phaseLabel={entry.label}
          photoUrl={startPhotoUrl}
          photoLoading={recordQuery.isLoading}
          time={formatTime(r.start_time)}
          approverNote={
            <ApproverNote
              phaseLabel="כניסה"
              approver={entryApprover}
              approvedAt={r.entry_approved_at}
              rejectionReason={r.entry_rejection_reason}
              reported={!!r.start_time}
            />
          }
        >
          <PresentWorkersList loading={workersQuery.isLoading} workers={presentWorkers} />
          {canApprove &&
          r.start_time &&
          !frozen &&
          !r.entry_approved_at &&
          !r.entry_rejection_reason ? (
            <ApprovalControls
              approveLabel="אשר כניסה"
              rejectLabel="דחה כניסה"
              onApprove={async () => {
                await approveEntryFn({ data: { recordId } });
              }}
              onReject={async (reason) => {
                await rejectEntryFn({ data: { recordId, reason } });
              }}
              onDone={refresh}
            />
          ) : null}
        </PhaseBlock>

        {/* 🔴 יציאה */}
        <PhaseBlock
          title="🔴 יציאה"
          phaseKind={exit.kind}
          phaseLabel={exit.label}
          photoUrl={endPhotoUrl}
          photoLoading={recordQuery.isLoading}
          time={formatTime(r.end_time)}
          approverNote={
            <ApproverNote
              phaseLabel="יציאה"
              approver={exitApprover}
              approvedAt={r.exit_approved_at}
              rejectionReason={r.exit_rejection_reason}
              reported={!!r.end_time}
            />
          }
        >
          {canApprove &&
          r.end_time &&
          !frozen &&
          !r.exit_approved_at &&
          !r.exit_rejection_reason ? (
            <ApprovalControls
              approveLabel="אשר יציאה"
              rejectLabel="דחה יציאה"
              onApprove={async () => {
                await approveExitFn({ data: { recordId } });
              }}
              onReject={async (reason) => {
                await rejectExitFn({ data: { recordId, reason } });
              }}
              onDone={refresh}
            />
          ) : null}
        </PhaseBlock>
      </div>
    </div>
  );
}

// Crystal-clear accountability: WHO approved (or rejected, or whether it's still
// pending) this phase. The approver's name is tinted by their side color.
function ApproverNote({
  phaseLabel,
  approver,
  approvedAt,
  rejectionReason,
  reported,
}: {
  phaseLabel: string;
  approver: Approver | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  reported: boolean;
}) {
  if (rejectionReason) {
    return (
      <div className="flex items-start gap-1.5 rounded-md bg-destructive/10 px-2 py-1.5 text-xs text-status-rejected">
        <XCircle className="mt-0.5 size-3.5 shrink-0" />
        <span>
          {phaseLabel} נדחתה: {rejectionReason}
        </span>
      </div>
    );
  }
  if (approvedAt) {
    return (
      <div className="flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-1.5 text-xs text-foreground">
        <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
        {approver ? (
          <span>
            אושר ע״י{" "}
            <span className={`font-semibold ${SIDE_TEXT[approver.side]}`}>{approver.name}</span>
            {approver.role ? ` · ${approver.role}` : ""}
          </span>
        ) : (
          <span>אושר</span>
        )}
      </div>
    );
  }
  if (reported) {
    return (
      <div className="flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-1.5 text-xs text-amber-600 dark:text-amber-400">
        <Clock className="size-3.5 shrink-0" />
        <span>ממתינה לאישור</span>
      </div>
    );
  }
  return null;
}

function PhaseBlock({
  title,
  phaseKind,
  phaseLabel,
  photoUrl,
  photoLoading,
  time,
  approverNote,
  children,
}: {
  title: string;
  phaseKind: ChipKind;
  phaseLabel: string;
  photoUrl: string | undefined;
  photoLoading: boolean;
  time: string;
  approverNote: React.ReactNode;
  children?: React.ReactNode;
}) {
  const phaseIcon = title.includes("כניסה") ? (
    <LogIn className="size-4 text-muted-foreground" />
  ) : (
    <LogOut className="size-4 text-muted-foreground" />
  );
  return (
    <div className="rounded-xl border border-border bg-surface-2/40 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          {phaseIcon}
          {title}
        </h4>
        <span className={`status-chip-${phaseKind}`}>{phaseLabel}</span>
      </div>

      <div className="mb-3 overflow-hidden rounded-lg border border-border bg-muted">
        {photoLoading ? (
          <div className="aspect-video w-full animate-pulse bg-muted" />
        ) : photoUrl ? (
          // eslint-disable-next-line jsx-a11y/img-redundant-alt
          <img src={photoUrl} alt="תמונת נוכחות" className="aspect-video w-full object-cover" />
        ) : (
          <div className="flex aspect-video w-full flex-col items-center justify-center gap-1 text-muted-foreground">
            <Camera className="size-6" />
            <span className="text-xs">אין תמונה</span>
          </div>
        )}
      </div>

      <div className="mb-2 flex items-center gap-1.5 text-sm text-foreground">
        <Clock className="size-4 text-muted-foreground" />
        <span>שעה: {time}</span>
      </div>

      <div className="mb-3">{approverNote}</div>

      {children}
    </div>
  );
}

function PresentWorkersList({ loading, workers }: { loading: boolean; workers: PresentWorker[] }) {
  return (
    <div className="mb-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Users className="size-3.5" />
        עובדים שדווחו ({loading ? "…" : workers.length})
      </div>
      {loading ? (
        <div className="space-y-1">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-6 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : workers.length === 0 ? (
        <p className="text-xs text-muted-foreground">לא דווחו עובדים נוכחים.</p>
      ) : (
        <ul className="max-h-40 space-y-1 overflow-y-auto">
          {workers.map((w) => (
            <li
              key={w.worker_id}
              className="flex items-center justify-between gap-2 rounded-md bg-surface-3/50 px-2 py-1 text-xs"
            >
              <span className="text-foreground">
                {w.first_name} {w.last_name}
              </span>
              <span className="text-muted-foreground">{w.passport_number}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ApprovalControls({
  approveLabel,
  rejectLabel,
  onApprove,
  onReject,
  onDone,
}: {
  approveLabel: string;
  rejectLabel: string;
  onApprove: () => Promise<unknown>;
  onReject: (reason: string) => Promise<unknown>;
  onDone: () => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const approveMut = useMutation({
    mutationFn: () => onApprove(),
    onSuccess: () => {
      toast.success("אושר בהצלחה");
      onDone();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "האישור נכשל"),
  });

  const rejectMut = useMutation({
    mutationFn: (r: string) => onReject(r),
    onSuccess: () => {
      toast.success("הדיווח נדחה");
      setRejecting(false);
      setReason("");
      onDone();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "הדחייה נכשלה"),
  });

  const submitReject = () => {
    const r = reason.trim();
    if (r.length < 3) {
      toast.error("יש לציין סיבת דחייה (3 תווים לפחות)");
      return;
    }
    rejectMut.mutate(r);
  };

  const busy = approveMut.isPending || rejectMut.isPending;

  if (rejecting) {
    return (
      <div className="space-y-2">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="סיבת הדחייה…"
          rows={2}
          className="w-full resize-none rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <div className="flex gap-2">
          <Button size="sm" variant="destructive" onClick={submitReject} disabled={busy}>
            <XCircle className="size-4" />
            שלח דחייה
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setRejecting(false);
              setReason("");
            }}
            disabled={busy}
          >
            ביטול
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={() => approveMut.mutate()} disabled={busy}>
        <CheckCircle2 className="size-4" />
        {approveLabel}
      </Button>
      <Button size="sm" variant="outline" onClick={() => setRejecting(true)} disabled={busy}>
        <XCircle className="size-4" />
        {rejectLabel}
      </Button>
    </div>
  );
}
