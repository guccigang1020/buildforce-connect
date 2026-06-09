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
  getAttendanceRecord,
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
  ChevronLeft,
  ChevronRight,
  X,
  MapPin,
  ImageIcon,
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
  rejection_reason: string | null;
  disputed_at: string | null;
  start_photo_url: string | null;
  end_photo_url: string | null;
  start_gps_lat: number | null;
  start_gps_lng: number | null;
  end_gps_lat: number | null;
  end_gps_lng: number | null;
  projects?: { name: string } | null;
  project_teams?: { name: string } | null;
};

type AttendanceEvent = {
  id: string;
  kind: string;
  created_at: string;
  payload?: Record<string, unknown> | null;
};

type RecordDetail = {
  record: AttendanceRecord;
  events: AttendanceEvent[];
  signedUrls: Record<string, string>;
};

export const Route = createFileRoute("/contractor/attendance")({
  head: () => ({ meta: [{ title: "אישורי נוכחות — BuildForce" }] }),
  component: Page,
});

const STATUS_META: Record<string, { label: string; dot: string; chipClass: string; barClass: string }> = {
  pending: {
    label: "ממתין לאישור",
    dot: "bg-amber-500",
    chipClass: "status-chip-pending",
    barClass: "status-bar-pending",
  },
  approved: {
    label: "אושר",
    dot: "bg-emerald-500",
    chipClass: "status-chip-approved",
    barClass: "status-bar-approved",
  },
  auto_approved: {
    label: "אושר אוטומטית",
    dot: "bg-slate-400",
    chipClass:
      "inline-flex items-center rounded-full border border-border/60 bg-muted/60 px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground",
    barClass: "status-bar-approved",
  },
  exception: {
    label: "חריגה",
    dot: "bg-orange-500",
    chipClass: "status-chip-disputed",
    barClass: "status-bar-disputed",
  },
  rejected: {
    label: "נדחה",
    dot: "bg-red-500",
    chipClass: "status-chip-rejected",
    barClass: "status-bar-rejected",
  },
  disputed: {
    label: "במחלוקת",
    dot: "bg-red-600",
    chipClass: "status-chip-rejected",
    barClass: "status-bar-rejected",
  },
  correction_requested: {
    label: "בקשת תיקון",
    dot: "bg-purple-500",
    chipClass:
      "inline-flex items-center rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-bold text-purple-700",
    barClass: "status-bar-disputed",
  },
};

const EXCEPTION_REASON_LABELS: Record<string, string> = {
  left_early: "כל הצוות עזב מוקדם",
  partial_left: "חלק מהצוות עזב",
  absent: "לא הגיעו",
  half_day: "חצי יום",
  late: "איחור",
  other: "אחר",
};

const EVENT_KIND_LABELS: Record<string, string> = {
  start: "פתיחת יום עבודה",
  end: "סגירת יום עבודה",
  exception: "דיווח חריגה",
  approval: "אושר",
  rejection: "נדחה",
  correction_request: "בקשת תיקון",
  auto_approval: "אושר אוטומטית",
};

const todayIso = new Date().toISOString().slice(0, 10);

function formatDateHebrew(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function Page() {
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [drawerRecord, setDrawerRecord] = useState<AttendanceRecord | null>(null);
  const [drawerDetail, setDrawerDetail] = useState<RecordDetail | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [showApproveAllDialog, setShowApproveAllDialog] = useState(false);

  const list = useServerFn(listContractorAttendance);
  const approve = useServerFn(approveAttendance);
  const approveAll = useServerFn(approveAllPending);
  const reject = useServerFn(rejectAttendance);
  const exc = useServerFn(reportException);
  const getRecord = useServerFn(getAttendanceRecord);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["contractor-att", selectedDate],
    queryFn: () => list({ data: { date: selectedDate } }),
  });

  const records = (data?.records ?? []) as AttendanceRecord[];
  const pending = records.filter(
    (r) => (r.status === "pending" || r.status === "exception") && r.end_time,
  );
  const totalHours = records.reduce((s, r) => s + (r.total_hours ?? 0), 0);
  const totalCost = records.reduce((s, r) => s + Number(r.total_cost ?? 0), 0);

  function goDate(delta: number) {
    const d = new Date(selectedDate + "T00:00:00");
    d.setDate(d.getDate() + delta);
    const next = d.toISOString().slice(0, 10);
    if (next <= todayIso) setSelectedDate(next);
  }

  async function openDrawer(record: AttendanceRecord) {
    setDrawerRecord(record);
    setDrawerDetail(null);
    setDrawerLoading(true);
    try {
      const result = await getRecord({ data: { recordId: record.id } });
      setDrawerDetail((result ?? null) as unknown as RecordDetail | null);
    } catch {
      toast.error("שגיאה בטעינת פרטי הרשומה");
    } finally {
      setDrawerLoading(false);
    }
  }

  function closeDrawer() {
    setDrawerRecord(null);
    setDrawerDetail(null);
    setDrawerLoading(false);
  }

  async function handleApprove() {
    if (!drawerRecord) return;
    await approve({ data: { recordId: drawerRecord.id } });
    const cost = drawerDetail?.record?.total_cost ?? drawerRecord.total_cost;
    toast.success(cost ? `הרשומה אושרה — ₪${Number(cost).toLocaleString()}` : "הרשומה אושרה");
    closeDrawer();
    refetch();
  }

  async function handleReject(reason: string) {
    if (!drawerRecord) return;
    const result = await reject({ data: { recordId: drawerRecord.id, reason } });
    toast.success("הרשומה נדחתה");
    const notify = (result as { ok: boolean; notify?: string | null } | undefined)?.notify;
    if (notify) window.open(notify, "_blank");
    closeDrawer();
    refetch();
  }

  async function handleApproveAll() {
    const r = await approveAll({ data: {} });
    toast.success(`אושרו ${r.count} רשומות`);
    setShowApproveAllDialog(false);
    refetch();
  }

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
        <div className="kpi-card p-4">
          <div className="kpi-icon kpi-icon-primary">
            <Users className="h-4 w-4" />
          </div>
          <div className="mt-3 text-2xl font-extrabold">{records.length}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">רשומות</div>
        </div>
        <div className={`kpi-card p-4${pending.length > 0 ? " kpi-card-warning" : ""}`}>
          <div className={`kpi-icon ${pending.length > 0 ? "kpi-icon-warning" : "kpi-icon-primary"}`}>
            <Clock className="h-4 w-4" />
          </div>
          <div className="mt-3 text-2xl font-extrabold">{pending.length}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">ממתינים לאישור</div>
        </div>
        <div className="kpi-card kpi-card-success p-4">
          <div className="kpi-icon kpi-icon-success">
            <Calendar className="h-4 w-4" />
          </div>
          <div className="mt-3 text-2xl font-extrabold">{totalHours.toFixed(1)}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">שעות סה"כ</div>
        </div>
        <div className="kpi-card p-4">
          <div className="kpi-icon kpi-icon-primary">
            <DollarSign className="h-4 w-4" />
          </div>
          <div className="mt-3 text-2xl font-extrabold">
            {totalCost > 0 ? `₪${totalCost.toLocaleString()}` : "—"}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">עלות מצטברת</div>
        </div>
      </div>

      {/* Date navigation */}
      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3 animate-fade-up delay-100">
        <button
          type="button"
          onClick={() => goDate(-1)}
          className="grid h-8 w-8 place-items-center rounded-xl border border-border/60 text-muted-foreground transition-colors hover:border-border hover:bg-secondary"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <div className="flex flex-1 items-center justify-center gap-2 text-sm font-semibold">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {formatDateHebrew(selectedDate)}
        </div>
        {selectedDate !== todayIso && (
          <button
            type="button"
            onClick={() => setSelectedDate(todayIso)}
            className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            היום
          </button>
        )}
        <button
          type="button"
          onClick={() => goDate(1)}
          disabled={selectedDate >= todayIso}
          className="grid h-8 w-8 place-items-center rounded-xl border border-border/60 text-muted-foreground transition-colors hover:border-border hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Pending approval banner */}
      {pending.length > 0 && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/8 px-5 py-4 status-bar-pending animate-fade-up delay-100">
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
            onClick={() => setShowApproveAllDialog(true)}
            className="shrink-0 gap-2 bg-gradient-primary text-primary-foreground shadow-elegant"
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
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton-kpi animate-pulse bg-muted/40" />
            ))}
          </div>
        ) : records.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon mx-auto">
              <Clock className="h-8 w-8 text-primary" />
            </div>
            <p className="mt-4 font-semibold">אין רשומות נוכחות לתאריך זה</p>
            <p className="mt-1 text-sm text-muted-foreground">
              הרשומות יופיעו כאשר צוותים יתחילו לדווח נוכחות.
            </p>
          </div>
        ) : (
          records.map((r) => {
            const s = STATUS_META[r.status] ?? STATUS_META.pending;
            const canApprove =
              (r.status === "pending" || r.status === "exception") &&
              !!r.end_time &&
              !r.frozen_at;
            return (
              <div
                key={r.id}
                className={`rounded-2xl border border-border/60 bg-card p-5 transition-colors hover:border-border ${s.barClass}`}
              >
                <div className="flex flex-wrap items-start gap-4">
                  <div className="min-w-0 flex-1 space-y-2.5">
                    {/* Header */}
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                        <span className="font-bold">
                          {r.projects?.name}
                          {r.project_teams?.name ? ` · ${r.project_teams.name}` : ""}
                        </span>
                      </div>
                      <span className={s.chipClass}>{s.label}</span>
                    </div>

                    {/* Details */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="info-chip">
                        <Users className="h-3 w-3" />
                        <span className="font-semibold">{r.workers_actual ?? "—"}</span>/{r.workers_expected} עובדים
                      </span>
                      {r.start_time && (
                        <span className="info-chip">
                          <Clock className="h-3 w-3" />
                          {new Date(r.start_time).toLocaleTimeString("he-IL", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {r.end_time &&
                            ` — ${new Date(r.end_time).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}`}
                        </span>
                      )}
                      {r.total_hours != null && (
                        <span className="info-chip">
                          <Calendar className="h-3 w-3" />
                          {r.total_hours} שעות
                        </span>
                      )}
                      {r.total_cost != null && Number(r.total_cost) > 0 && (
                        <span className="info-chip font-bold text-emerald-600">
                          ₪{Number(r.total_cost).toLocaleString()}
                        </span>
                      )}
                    </div>

                    {/* Exception note */}
                    {r.exception_reason && (
                      <div className="inline-flex items-center gap-1.5 rounded-xl border border-orange-400/30 bg-orange-500/5 px-3 py-2 text-xs text-orange-700">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        חריגה:{" "}
                        {EXCEPTION_REASON_LABELS[r.exception_reason] ?? r.exception_reason}
                        {r.exception_note ? ` — ${r.exception_note}` : ""}
                      </div>
                    )}

                    {/* Rejection reason */}
                    {r.status === "rejected" && r.rejection_reason && (
                      <div className="inline-flex items-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                        <XCircle className="h-3.5 w-3.5 shrink-0" />
                        סיבת דחייה: {r.rejection_reason}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {canApprove && (
                        <Button
                          size="sm"
                          className="gap-1.5 bg-gradient-primary text-primary-foreground shadow-elegant"
                          onClick={() => openDrawer(r)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> צפה ואשר
                        </Button>
                      )}
                      {r.end_time && !canApprove && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => openDrawer(r)}
                        >
                          <ImageIcon className="h-3.5 w-3.5" /> צפה בפרטים
                        </Button>
                      )}
                      {r.start_time && !r.end_time && (
                        <ReportExceptionInline recordId={r.id} onDone={refetch} fn={exc} />
                      )}
                    </div>
                  </div>

                  {/* Frozen indicator */}
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

      {/* Record detail drawer */}
      {drawerRecord && (
        <RecordDrawer
          record={drawerRecord}
          detail={drawerDetail}
          loading={drawerLoading}
          onClose={closeDrawer}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

      {/* Approve-all confirmation dialog */}
      {showApproveAllDialog && (
        <ApproveAllDialog
          pending={pending}
          onConfirm={handleApproveAll}
          onClose={() => setShowApproveAllDialog(false)}
        />
      )}
    </AppShell>
  );
}

function RecordDrawer({
  record,
  detail,
  loading,
  onClose,
  onApprove,
  onReject,
}: {
  record: AttendanceRecord;
  detail: RecordDetail | null;
  loading: boolean;
  onClose: () => void;
  onApprove: () => Promise<void>;
  onReject: (reason: string) => Promise<void>;
}) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const s = STATUS_META[record.status] ?? STATUS_META.pending;
  const canApprove =
    (record.status === "pending" || record.status === "exception") &&
    !!record.end_time &&
    !record.frozen_at;

  const startPhotoUrl =
    detail?.record.start_photo_url && detail.signedUrls[detail.record.start_photo_url]
      ? detail.signedUrls[detail.record.start_photo_url]
      : null;
  const endPhotoUrl =
    detail?.record.end_photo_url && detail.signedUrls[detail.record.end_photo_url]
      ? detail.signedUrls[detail.record.end_photo_url]
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-elegant animate-fade-up">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate font-bold">
                {record.projects?.name}
                {record.project_teams?.name ? ` · ${record.project_teams.name}` : ""}
              </span>
              <span className={s.chipClass}>{s.label}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ms-3 grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-border/60 text-muted-foreground transition-colors hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              <Loader2 className="ms-2 h-5 w-5 animate-spin" /> טוען פרטים…
            </div>
          ) : (
            <div className="space-y-5">
              {/* Photos */}
              <section>
                <SectionLabel>תיעוד צילומי</SectionLabel>
                <div className="grid grid-cols-2 gap-3">
                  <PhotoCard url={startPhotoUrl} label="כניסה" time={record.start_time} />
                  <PhotoCard url={endPhotoUrl} label="יציאה" time={record.end_time} />
                </div>
              </section>

              {/* Work summary */}
              <section>
                <SectionLabel>סיכום יום עבודה</SectionLabel>
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-2.5">
                  <DetailRow
                    label="עובדים"
                    value={`${record.workers_actual ?? "—"} / ${record.workers_expected} צפוי`}
                  />
                  {record.total_hours != null && (
                    <DetailRow label="שעות עבודה" value={`${record.total_hours} שעות`} />
                  )}
                  {record.total_cost != null && Number(record.total_cost) > 0 && (
                    <DetailRow
                      label="עלות"
                      value={`₪${Number(record.total_cost).toLocaleString()}`}
                      valueClassName="font-bold text-emerald-600"
                    />
                  )}
                  {record.start_time && (
                    <DetailRow
                      label="שעת כניסה"
                      value={new Date(record.start_time).toLocaleTimeString("he-IL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    />
                  )}
                  {record.end_time && (
                    <DetailRow
                      label="שעת יציאה"
                      value={new Date(record.end_time).toLocaleTimeString("he-IL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    />
                  )}
                </div>
              </section>

              {/* GPS */}
              {(record.start_gps_lat != null || record.end_gps_lat != null) && (
                <section>
                  <SectionLabel>GPS</SectionLabel>
                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-2.5">
                    {record.start_gps_lat != null && record.start_gps_lng != null && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        <span className="text-muted-foreground">כניסה:</span>
                        <span className="font-mono text-xs">
                          {record.start_gps_lat.toFixed(5)}, {record.start_gps_lng.toFixed(5)}
                        </span>
                      </div>
                    )}
                    {record.end_gps_lat != null && record.end_gps_lng != null && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-red-500" />
                        <span className="text-muted-foreground">יציאה:</span>
                        <span className="font-mono text-xs">
                          {record.end_gps_lat.toFixed(5)}, {record.end_gps_lng.toFixed(5)}
                        </span>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Exception context */}
              {record.exception_reason && (
                <div className="rounded-2xl border border-orange-400/30 bg-orange-500/5 p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-sm font-bold text-orange-700">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    חריגה דווחה
                  </div>
                  <div className="text-sm text-orange-700">
                    {EXCEPTION_REASON_LABELS[record.exception_reason] ?? record.exception_reason}
                  </div>
                  {record.exception_note && (
                    <div className="text-sm text-orange-600/80">{record.exception_note}</div>
                  )}
                </div>
              )}

              {/* Rejection reason */}
              {record.status === "rejected" && record.rejection_reason && (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-destructive">
                    <XCircle className="h-4 w-4 shrink-0" />
                    סיבת דחייה: {record.rejection_reason}
                  </div>
                </div>
              )}

              {/* Event timeline */}
              {detail && detail.events.length > 0 && (
                <section>
                  <SectionLabel>ציר זמן</SectionLabel>
                  <div className="space-y-2">
                    {detail.events.map((ev) => (
                      <div key={ev.id} className="flex items-start gap-3 text-sm">
                        <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary/40" />
                        <div className="min-w-0 flex-1">
                          <span className="font-medium">
                            {EVENT_KIND_LABELS[ev.kind] ?? ev.kind}
                          </span>
                          <span className="ms-2 text-xs text-muted-foreground">
                            {new Date(ev.created_at).toLocaleTimeString("he-IL", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

        {/* Footer: approve / reject */}
        {canApprove && !loading && (
          <div className="shrink-0 border-t border-border/60 bg-card px-5 py-4">
            {rejectOpen ? (
              <div className="space-y-3">
                <div className="text-xs font-bold text-destructive">סיבת דחייה (נדרש)</div>
                <input
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
                  placeholder="הסבר מדוע הרשומה נדחית (לפחות 3 תווים)"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={rejectReason.trim().length < 3 || submitting}
                    onClick={async () => {
                      setSubmitting(true);
                      try {
                        await onReject(rejectReason.trim());
                      } finally {
                        setSubmitting(false);
                        setRejectOpen(false);
                        setRejectReason("");
                      }
                    }}
                  >
                    {submitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5" />
                    )}
                    אשר דחייה
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setRejectOpen(false);
                      setRejectReason("");
                    }}
                  >
                    ביטול
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <Button
                  className="flex-1 gap-2 bg-gradient-primary text-primary-foreground shadow-elegant"
                  disabled={submitting}
                  onClick={async () => {
                    setSubmitting(true);
                    try {
                      await onApprove();
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  אשר רשומה
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10"
                  onClick={() => setRejectOpen(true)}
                >
                  <XCircle className="h-4 w-4" /> דחה
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ApproveAllDialog({
  pending,
  onConfirm,
  onClose,
}: {
  pending: AttendanceRecord[];
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const exceptionCount = pending.filter((r) => r.status === "exception").length;
  const totalHours = pending.reduce((s, r) => s + (r.total_hours ?? 0), 0);
  const totalCost = pending.reduce((s, r) => s + Number(r.total_cost ?? 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-elegant animate-fade-up">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold">אישור כולל — {pending.length} רשומות</h2>
            <p className="mt-1 text-sm text-muted-foreground">סקור את הסיכום לפני האישור</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-border/60 text-muted-foreground hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-5 rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-3">
          <DetailRow label="רשומות לאישור" value={`${pending.length}`} />
          <DetailRow label="שעות סה״כ" value={`${totalHours.toFixed(1)} שעות`} />
          {totalCost > 0 && (
            <DetailRow
              label="עלות סה״כ"
              value={`₪${totalCost.toLocaleString()}`}
              valueClassName="font-bold text-emerald-600"
            />
          )}
        </div>

        {exceptionCount > 0 && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/8 p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div className="text-sm">
              <span className="font-bold text-amber-700">
                {exceptionCount} רשומות מכילות חריגות.
              </span>{" "}
              <span className="text-amber-600">האישור הכולל יכלול אותן. בדוק לפני אישור.</span>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            className="flex-1 gap-2 bg-gradient-primary text-primary-foreground shadow-elegant"
            disabled={confirming}
            onClick={async () => {
              setConfirming(true);
              try {
                await onConfirm();
              } finally {
                setConfirming(false);
              }
            }}
          >
            {confirming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            אשר {pending.length} רשומות
          </Button>
          <Button variant="outline" onClick={onClose}>
            ביטול
          </Button>
        </div>
      </div>
    </div>
  );
}

function PhotoCard({
  url,
  label,
  time,
}: {
  url: string | null;
  label: string;
  time: string | null;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-muted/20">
      {url ? (
        <img src={url} alt={label} className="h-40 w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-40 items-center justify-center text-muted-foreground/30">
          <ImageIcon className="h-8 w-8" />
        </div>
      )}
      <div className="px-3 py-2">
        <div className="text-xs font-semibold">{label}</div>
        {time && (
          <div className="text-[10px] text-muted-foreground">
            {new Date(time).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
      {children}
    </div>
  );
}

function DetailRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${valueClassName ?? ""}`}>{value}</span>
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
