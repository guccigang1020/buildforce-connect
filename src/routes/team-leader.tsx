import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import {
  listMyTeamLeaderProjects,
  startWorkday,
  endWorkday,
  getTeamForCheckin,
  startWorkdayByToken,
  endWorkdayByToken,
} from "@/lib/attendance.functions";
import {
  setAttendancePresentWorkers,
  listProjectAttendanceDays,
} from "@/lib/project-attendance.functions";
import { listProjectWorkers, addWorkerByCoordinator } from "@/lib/project-workers.functions";
import { getGps, watermarkImage } from "@/lib/attendance-camera";
import { israelToday } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";
import { AttendanceCalendar, type CalDay } from "@/components/attendance-calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import {
  Camera,
  RotateCcw,
  Loader2,
  Users,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Clock,
  Play,
  Square,
  Minus,
  Plus,
  Timer,
  Gavel,
  QrCode,
  LogIn,
  LogOut,
  UserPlus,
  Lock,
  Image as ImageIcon,
} from "lucide-react";

// Deviation / exception reporting (חריגה) is hidden while the happy path is
// finalized. The backend + status handling stay intact — flip this to re-enable
// the "דווח חריגה" entry point. See also contractor.attendance.tsx.
const ENABLE_EXCEPTIONS = false;

// ──────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────
type TodayRecord = {
  id: string;
  status: string;
  start_time: string | null;
  end_time: string | null;
  workers_actual: number | null;
  start_photo_url: string | null;
  end_photo_url: string | null;
  entry_approved_at: string | null;
  exit_approved_at: string | null;
  entry_rejection_reason: string | null;
  exit_rejection_reason: string | null;
  frozen_at: string | null;
};

type Team = {
  id: string;
  name: string;
  expected_workers: number;
  hourly_rate?: number | null;
  project_id: string;
  projects?: { id: string; name: string; address: string | null; status: string } | null;
  today?: TodayRecord | null;
};

type ProjectWorker = {
  id: string;
  first_name: string;
  last_name: string;
  passport_number: string;
  nationality: string | null;
  status: string;
  added_by_role: string | null;
};

export const Route = createFileRoute("/team-leader")({
  // Parse ?team=<id> on both server and client so the SSR and client renders
  // agree (avoids a hydration mismatch when branching to the QR check-in view).
  validateSearch: (search: Record<string, unknown>): { team?: string } => ({
    team: typeof search.team === "string" ? search.team : undefined,
  }),
  head: () => ({ meta: [{ title: "דיווח נוכחות — רכז" }] }),
  component: Page,
});

function Page() {
  const { team: focusTeamId } = Route.useSearch();

  // QR / no-account check-in: render a standalone token-mode view, no AppShell.
  if (focusTeamId) {
    return <TokenCheckinPage teamId={focusTeamId} />;
  }

  return <AuthedTeamLeaderPage />;
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────
function fmtTime(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

function ApprovalChip({
  rejectionReason,
  approvedAt,
}: {
  rejectionReason: string | null;
  approvedAt: string | null;
}) {
  if (rejectionReason) {
    return (
      <span className="status-chip-rejected shrink-0">
        <XCircle className="h-3.5 w-3.5" />
        נדחתה: {rejectionReason}
      </span>
    );
  }
  if (approvedAt) {
    return (
      <span className="status-chip-approved shrink-0">
        <CheckCircle2 className="h-3.5 w-3.5" />
        אושרה
      </span>
    );
  }
  return (
    <span className="status-chip-pending shrink-0">
      <Clock className="h-3.5 w-3.5" />
      ממתינה לאישור
    </span>
  );
}

function PhotoUploadedBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-status-approved">
      <ImageIcon className="h-3.5 w-3.5" />
      תמונה הועלתה ✓
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Logged-in coordinator (רכז) view
// ──────────────────────────────────────────────────────────────────────────
function AuthedTeamLeaderPage() {
  const { profile } = useAuth();
  const list = useServerFn(listMyTeamLeaderProjects);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["tl-teams"],
    queryFn: () => list(),
  });

  const teams: Team[] = (data?.teams ?? []) as Team[];
  const totalExpected = teams.reduce((s, t) => s + (t.expected_workers ?? 0), 0);

  return (
    <AppShell title="דיווח נוכחות">
      <div className="mx-auto max-w-xl space-y-4">
        {/* Daily summary */}
        {teams.length > 0 && !isLoading && (
          <div className="enterprise-card p-4 animate-fade-up">
            {profile?.full_name && (
              <div className="mb-3 text-sm text-muted-foreground">
                שלום, <span className="font-bold text-foreground">{profile.full_name}</span> 👋
              </div>
            )}
            <div className="grid grid-cols-2 divide-x divide-x-reverse divide-border/40">
              <div className="px-3 text-center">
                <div className="text-xl font-extrabold text-primary">{teams.length}</div>
                <div className="text-[11px] text-muted-foreground">צוותים</div>
              </div>
              <div className="px-3 text-center">
                <div className="text-xl font-extrabold">{totalExpected}</div>
                <div className="text-[11px] text-muted-foreground">עובדים צפויים</div>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="enterprise-card overflow-hidden">
                <div className="p-5">
                  <div className="h-6 w-40 rounded bg-muted" />
                  <div className="mt-2 h-4 w-28 rounded bg-muted" />
                  <div className="mt-4 h-16 w-full rounded-xl bg-muted" />
                  <div className="mt-3 h-14 w-full rounded-xl bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : teams.length === 0 ? (
          <div className="empty-state animate-fade-up">
            <div className="empty-state-icon">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-bold">אין צוותים פעילים</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              עדיין לא שובצת לאף צוות. צור קשר עם הקבלן להקצאת צוות.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {teams.map((t, i) => (
              <div key={t.id} className="animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
                <TeamSection team={t} onChange={refetch} />
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// One team → header + Entry card + Exit card. Shares one camera input + photo
// preview between the two cards (mode picks which server fn runs on confirm).
// ──────────────────────────────────────────────────────────────────────────
function TeamSection({ team, onChange }: { team: Team; onChange: () => void }) {
  const qc = useQueryClient();
  const startFn = useServerFn(startWorkday);
  const endFn = useServerFn(endWorkday);
  const presentFn = useServerFn(setAttendancePresentWorkers);
  const listWorkersFn = useServerFn(listProjectWorkers);
  const addWorkerFn = useServerFn(addWorkerByCoordinator);
  const daysFn = useServerFn(listProjectAttendanceDays);

  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"start" | "end" | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<PendingPhoto | null>(null);

  // ── Calendar: pick which day to view. Today is the only editable day;
  // past days render a read-only summary (back-dating is not allowed).
  // "Today" is computed in Asia/Jerusalem so it matches the calendar and the
  // server's work_date (which is also Israel-based) — no UTC drift.
  const todayISO = israelToday();
  const [selected, setSelected] = useState(todayISO);
  // Which day's actions are open in the modal (null = closed).
  const [openDay, setOpenDay] = useState<string | null>(null);
  const isToday = openDay === todayISO;
  const daysQ = useQuery({
    queryKey: ["tl-days", team.project_id],
    queryFn: () => daysFn({ data: { projectId: team.project_id } }),
  });
  const days = (daysQ.data?.days ?? []) as CalDay[];
  const selectedDay = days.find((d) => d.work_date === selected);

  const today = team.today ?? null;
  const frozen = !!today?.frozen_at;
  const entryReported = !!today?.start_time;
  const exitReported = !!today?.end_time;

  // ── Worker checklist (only needed before entry is reported) ───────────────
  const rosterQ = useQuery({
    queryKey: ["tl-roster", team.project_id],
    queryFn: () => listWorkersFn({ data: { projectId: team.project_id } }),
    enabled: !entryReported && !frozen,
  });
  const roster: ProjectWorker[] = (rosterQ.data?.workers ?? []) as ProjectWorker[];

  // checked map; undefined === present (default CHECKED). Only deltas stored.
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const workers = (rosterQ.data?.workers ?? []) as ProjectWorker[];
    if (!workers.length) return;
    setChecked((prev) => {
      const next = { ...prev };
      for (const w of workers) if (!(w.id in next)) next[w.id] = true;
      return next;
    });
  }, [rosterQ.data]);

  const isChecked = (id: string) => checked[id] !== false;
  const checkedCount = roster.filter((w) => isChecked(w.id)).length;

  function toggle(id: string) {
    setChecked((prev) => ({ ...prev, [id]: !(prev[id] !== false) }));
  }

  // ── Add-worker inline form ────────────────────────────────────────────────
  const [addOpen, setAddOpen] = useState(false);
  const [fFirst, setFFirst] = useState("");
  const [fLast, setFLast] = useState("");
  const [fPassport, setFPassport] = useState("");
  const [addBusy, setAddBusy] = useState(false);

  async function handleAddWorker() {
    if (!fFirst.trim() || !fLast.trim() || fPassport.trim().length < 3) {
      toast.error("מלא שם פרטי, שם משפחה ומספר דרכון (לפחות 3 תווים)");
      return;
    }
    setAddBusy(true);
    try {
      await addWorkerFn({
        data: {
          projectId: team.project_id,
          firstName: fFirst.trim(),
          lastName: fLast.trim(),
          passportNumber: fPassport.trim(),
        },
      });
      toast.success("העובד נוסף לרשימה");
      setFFirst("");
      setFLast("");
      setFPassport("");
      setAddOpen(false);
      await rosterQ.refetch(); // new worker appears, seeded checked by the effect
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "שגיאה בהוספת עובד");
    } finally {
      setAddBusy(false);
    }
  }

  // ── Photo capture (shared) ────────────────────────────────────────────────
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const gps = await getGps();
      const dataUrl = await watermarkImage(file, { project: team.projects?.name ?? "", gps });
      setPendingPhoto({ dataUrl, gpsLat: gps.lat, gpsLng: gps.lng });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "שגיאה בצילום");
      setMode(null);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function confirmSubmit() {
    if (!pendingPhoto) return;
    setBusy(true);
    try {
      if (mode === "start") {
        const presentWorkers = roster.map((w) => ({ workerId: w.id, present: isChecked(w.id) }));
        // workersActual must be >= 1. When a roster exists, use the checked
        // count; with no roster configured, fall back to expected_workers.
        const workersActual =
          roster.length > 0 ? checkedCount : Math.max(1, team.expected_workers || 1);
        const r = await startFn({
          data: {
            teamId: team.id,
            workersActual: Math.max(1, workersActual),
            gpsLat: pendingPhoto.gpsLat,
            gpsLng: pendingPhoto.gpsLng,
            photoBase64: pendingPhoto.dataUrl,
          },
        });
        if (r?.recordId && presentWorkers.length > 0) {
          await presentFn({ data: { recordId: r.recordId, workers: presentWorkers } });
        }
        toast.success("דווחה כניסה ✓");
      } else if (mode === "end" && today?.id) {
        await endFn({
          data: {
            recordId: today.id,
            gpsLat: pendingPhoto.gpsLat,
            gpsLng: pendingPhoto.gpsLng,
            photoBase64: pendingPhoto.dataUrl,
          },
        });
        toast.success("דווחה יציאה ✓");
      }
      qc.invalidateQueries({ queryKey: ["tl-teams"] });
      onChange();
      setPendingPhoto(null);
      setMode(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-border/60 bg-card px-3 py-2.5 text-sm outline-none focus:border-primary/60";

  return (
    <div className="space-y-3">
      {/* Team header */}
      <div className="flex items-start justify-between gap-3 px-1">
        <div>
          <h3 className="text-lg font-bold leading-tight">{team.name}</h3>
          <div className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {team.projects?.name}
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground">
          <Users className="h-3 w-3" />
          {team.expected_workers} צפויים
        </div>
      </div>

      {/* Primary CTA — the coordinator's main daily action, always obvious. */}
      <Button
        className="h-12 w-full gap-2 text-base"
        onClick={() => {
          setSelected(todayISO);
          setOpenDay(todayISO);
        }}
      >
        {frozen ? (
          <>
            <CheckCircle2 className="h-5 w-5" /> הדיווח של היום אושר — צפה
          </>
        ) : !entryReported ? (
          <>
            <Play className="h-5 w-5" /> דווח כניסה להיום
          </>
        ) : !exitReported ? (
          <>
            <Square className="h-5 w-5" /> דווח יציאה להיום
          </>
        ) : (
          <>
            <CheckCircle2 className="h-5 w-5" /> צפה בדיווח של היום
          </>
        )}
      </Button>

      {/* Calendar — click a day to open its actions in a modal */}
      <div className="text-xs font-medium text-muted-foreground">
        או בחר יום בלוח לצפייה (ניתן לדווח על היום בלבד):
      </div>
      <AttendanceCalendar
        days={days}
        selected={selected}
        onSelect={(iso) => {
          setSelected(iso);
          setOpenDay(iso);
        }}
      />

      {/* Day actions — opened in a modal when a calendar day is clicked */}
      <Dialog open={!!openDay} onOpenChange={(o) => !o && setOpenDay(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{openDay ? dayLabel(openDay) : ""}</DialogTitle>
          </DialogHeader>

          {!isToday ? (
            <PastDaySummary day={selectedDay} date={selected} />
          ) : (
            <div className="space-y-3">
              {pendingPhoto ? (
                // Once a photo is captured, show ONLY the confirm step so it's
                // the clear focus (not buried below the exit card).
                <PhotoCapturePreview
                  label={
                    mode === "end"
                      ? "תמונת יציאה — אשר לפני השליחה"
                      : "תמונת כניסה — אשר לפני השליחה"
                  }
                  pendingPhoto={pendingPhoto}
                  busy={busy}
                  onRetake={() => {
                    setPendingPhoto(null);
                    setMode(null);
                  }}
                  onConfirm={confirmSubmit}
                />
              ) : (
                <>
                  {frozen && (
                    <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                      <Lock className="h-3.5 w-3.5" />
                      היום אושר ונסגר — לקריאה בלבד
                    </div>
                  )}

                  {/* ───────────── ENTRY CARD ───────────── */}
                  <div className="enterprise-card overflow-hidden">
                    <div className="flex items-center justify-between gap-3 border-b border-border/40 bg-gradient-to-l from-emerald-500/10 to-transparent px-4 py-3">
                      <div className="flex items-center gap-2 text-base font-bold">
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-500/15 text-status-approved">
                          <LogIn className="h-4 w-4" />
                        </span>
                        כניסה
                      </div>
                      {entryReported && (
                        <ApprovalChip
                          rejectionReason={today?.entry_rejection_reason ?? null}
                          approvedAt={today?.entry_approved_at ?? null}
                        />
                      )}
                    </div>

                    <div className="space-y-3 p-4">
                      {!entryReported && !frozen ? (
                        <>
                          {/* Worker checklist */}
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-semibold">מי הגיע היום?</label>
                            <span className="status-chip-approved">{checkedCount} נבחרו</span>
                          </div>

                          {rosterQ.isLoading ? (
                            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" /> טוען רשימת עובדים…
                            </div>
                          ) : roster.length === 0 ? (
                            <p className="rounded-lg bg-muted/40 px-3 py-3 text-xs text-muted-foreground">
                              אין עדיין עובדים ברשימה. הוסף עובד למטה, או דווח כניסה לפי הכמות
                              המתוכננת.
                            </p>
                          ) : (
                            <div className="space-y-1.5">
                              {roster.map((w) => {
                                const on = isChecked(w.id);
                                return (
                                  <label
                                    key={w.id}
                                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                                      on
                                        ? "border-emerald-500/30 bg-emerald-500/5"
                                        : "border-border/60 bg-card opacity-70"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={on}
                                      onChange={() => toggle(w.id)}
                                      className="h-5 w-5 shrink-0 accent-emerald-500"
                                    />
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate text-sm font-semibold">
                                        {w.first_name} {w.last_name}
                                      </span>
                                      <span
                                        className="block truncate text-[11px] text-muted-foreground"
                                        dir="ltr"
                                      >
                                        {w.passport_number}
                                      </span>
                                    </span>
                                    {w.added_by_role === "coordinator" && (
                                      <span className="status-chip-muted shrink-0">
                                        נוסף ע״י הרכז
                                      </span>
                                    )}
                                  </label>
                                );
                              })}
                            </div>
                          )}

                          {/* Add worker */}
                          {addOpen ? (
                            <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  className={inputCls}
                                  placeholder="שם פרטי"
                                  value={fFirst}
                                  onChange={(e) => setFFirst(e.target.value)}
                                />
                                <input
                                  className={inputCls}
                                  placeholder="שם משפחה"
                                  value={fLast}
                                  onChange={(e) => setFLast(e.target.value)}
                                />
                              </div>
                              <input
                                className={inputCls}
                                placeholder="מס׳ דרכון (חובה)"
                                dir="ltr"
                                value={fPassport}
                                onChange={(e) => setFPassport(e.target.value)}
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-11"
                                  disabled={addBusy}
                                  onClick={() => setAddOpen(false)}
                                >
                                  ביטול
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-11 gap-2 bg-gradient-primary text-primary-foreground"
                                  disabled={addBusy}
                                  onClick={handleAddWorker}
                                >
                                  {addBusy ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Plus className="h-4 w-4" />
                                  )}
                                  הוסף
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-11 w-full gap-2"
                              onClick={() => setAddOpen(true)}
                            >
                              <UserPlus className="h-4 w-4" />
                              הוסף עובד
                            </Button>
                          )}

                          {/* Report entry */}
                          <Button
                            size="lg"
                            className="h-14 w-full gap-2 bg-gradient-primary text-primary-foreground shadow-elegant"
                            disabled={busy || (roster.length > 0 && checkedCount === 0)}
                            onClick={() => {
                              setMode("start");
                              fileRef.current?.click();
                            }}
                          >
                            {busy && mode === "start" ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <Camera className="h-5 w-5" />
                            )}
                            דווח כניסה
                            {roster.length > 0 ? ` (${checkedCount})` : ""}
                          </Button>
                          <PhotoInstruction />
                        </>
                      ) : (
                        // Read-only entry summary
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            שעת כניסה:{" "}
                            <span className="font-bold">{fmtTime(today?.start_time ?? null)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            עובדים שדווחו:{" "}
                            <span className="font-bold">{today?.workers_actual ?? "—"}</span>
                          </div>
                          {today?.start_photo_url && <PhotoUploadedBadge />}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ───────────── EXIT CARD ───────────── */}
                  <div
                    className={`enterprise-card overflow-hidden ${!entryReported ? "pointer-events-none opacity-55" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-border/40 bg-gradient-to-l from-rose-500/10 to-transparent px-4 py-3">
                      <div className="flex items-center gap-2 text-base font-bold">
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-rose-500/15 text-status-rejected">
                          <LogOut className="h-4 w-4" />
                        </span>
                        יציאה
                      </div>
                      {exitReported && (
                        <ApprovalChip
                          rejectionReason={today?.exit_rejection_reason ?? null}
                          approvedAt={today?.exit_approved_at ?? null}
                        />
                      )}
                    </div>

                    <div className="space-y-3 p-4">
                      {!entryReported ? (
                        <p className="rounded-lg bg-muted/40 px-3 py-3 text-xs text-muted-foreground">
                          יש לדווח כניסה לפני שניתן לדווח יציאה.
                        </p>
                      ) : !exitReported && !frozen ? (
                        <>
                          <Button
                            size="lg"
                            className="h-14 w-full gap-2 border-2 border-border/60 bg-card text-foreground hover:bg-secondary"
                            disabled={busy}
                            onClick={() => {
                              setMode("end");
                              fileRef.current?.click();
                            }}
                          >
                            {busy && mode === "end" ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <Camera className="h-5 w-5 text-destructive" />
                            )}
                            דווח יציאה
                          </Button>
                          <PhotoInstruction />
                        </>
                      ) : (
                        // Read-only exit summary
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            שעת יציאה:{" "}
                            <span className="font-bold">{fmtTime(today?.end_time ?? null)}</span>
                          </div>
                          {today?.end_photo_url && <PhotoUploadedBadge />}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Hidden camera input — stays mounted while the modal is open
                  so the live photo capture flow keeps working */}
              {/* No `capture` attribute → on mobile the OS offers BOTH camera
                  and photo library; on desktop it's a normal file picker. */}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFile}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Hebrew label for a calendar day (used as the modal title).
function dayLabel(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// Status resolver for a past day: rejection → נדחתה, approved → אושרה,
// time set → ממתינה, otherwise לא דווח.
function dayStatus(rej: string | null, appr: string | null, time: string | null) {
  if (rej) return { t: "נדחתה", c: "status-chip-rejected" };
  if (appr) return { t: "אושרה", c: "status-chip-approved" };
  if (time) return { t: "ממתינה", c: "status-chip-pending" };
  return { t: "לא דווח", c: "status-chip-muted" };
}

// Read-only summary of a PAST day (no photo capture, no editing — back-dating
// is intentionally not allowed). Renders when the calendar selects a past day.
function PastDaySummary({ day, date }: { day: CalDay | undefined; date: string }) {
  const en = dayStatus(
    day?.entry_rejection_reason ?? null,
    day?.entry_approved_at ?? null,
    day?.start_time ?? null,
  );
  const ex = dayStatus(
    day?.exit_rejection_reason ?? null,
    day?.exit_approved_at ?? null,
    day?.end_time ?? null,
  );
  const label = new Date(date + "T00:00:00").toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="enterprise-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border/40 bg-muted/20 px-4 py-3">
        <div className="flex items-center gap-2 text-base font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-muted/60 text-muted-foreground">
            <Lock className="h-4 w-4" />
          </span>
          {label}
        </div>
        <span className="status-chip-muted shrink-0">לקריאה בלבד</span>
      </div>

      <div className="divide-y divide-border/40">
        {/* Entry */}
        <div className="flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-500/15 text-status-approved">
              <LogIn className="h-4 w-4" />
            </span>
            <span>
              כניסה: <span className="font-bold">{fmtTime(day?.start_time ?? null) ?? "—"}</span>
            </span>
          </div>
          <span className={`${en.c} shrink-0`}>{en.t}</span>
        </div>
        {/* Exit */}
        <div className="flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-rose-500/15 text-status-rejected">
              <LogOut className="h-4 w-4" />
            </span>
            <span>
              יציאה: <span className="font-bold">{fmtTime(day?.end_time ?? null) ?? "—"}</span>
            </span>
          </div>
          <span className={`${ex.c} shrink-0`}>{ex.t}</span>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Shared photo capture/preview block (used by TeamSection and token check-in)
// ──────────────────────────────────────────────────────────────────────────
type PendingPhoto = { dataUrl: string; gpsLat: number; gpsLng: number };

function PhotoCapturePreview({
  pendingPhoto,
  busy,
  onRetake,
  onConfirm,
  label = "תמונה מוכנה לשליחה — אשר לפני השליחה",
}: {
  pendingPhoto: PendingPhoto;
  busy: boolean;
  onRetake: () => void;
  onConfirm: () => void;
  label?: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-primary/30 bg-primary/5">
      <div className="flex items-center gap-2 border-b border-primary/15 px-4 py-2.5 text-xs font-bold text-primary">
        <Camera className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="p-4 space-y-3">
        <img
          src={pendingPhoto.dataUrl}
          alt="תמונת נוכחות"
          className="w-full rounded-lg object-cover"
          style={{ maxHeight: "200px" }}
        />
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <span>
            GPS:{" "}
            <span dir="ltr">
              {pendingPhoto.gpsLat.toFixed(4)}, {pendingPhoto.gpsLng.toFixed(4)}
            </span>
          </span>
          <CheckCircle2 className="ms-1 h-3.5 w-3.5 text-emerald-500" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={onRetake}
            className="h-12 gap-2"
          >
            <RotateCcw className="h-3.5 w-3.5" /> צלם שוב
          </Button>
          <Button
            size="sm"
            disabled={busy}
            onClick={onConfirm}
            className="h-12 gap-2 bg-gradient-primary text-primary-foreground"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            אשר ושלח
          </Button>
        </div>
      </div>
    </div>
  );
}

function PhotoInstruction() {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span>
        צלם את כל הפועלים + עצמך באתר, או העלה תמונה מהמכשיר. במובייל ניתן לבחור בין מצלמה לגלריה.
      </span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// QR / no-account check-in (token mode) — kept as-is
// ──────────────────────────────────────────────────────────────────────────
type CheckinTeam = {
  id: string;
  name: string;
  expected_workers: number;
  leader_name: string | null;
  project_name: string;
  site_configured: boolean;
};

type CheckinToday = {
  id: string;
  status: string;
  start_time: string | null;
  end_time: string | null;
  workers_actual: number | null;
} | null;

function BrandHeader() {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow-sm">
        <Gavel className="h-6 w-6 text-primary-foreground" />
      </div>
      <div className="leading-none">
        <div className="text-base font-extrabold tracking-tight">BuildForce</div>
        <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">
          Prime
        </div>
      </div>
    </div>
  );
}

function TokenCheckinPage({ teamId }: { teamId: string }) {
  const getTeam = useServerFn(getTeamForCheckin);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["tl-checkin", teamId],
    queryFn: () => getTeam({ data: { teamId } }),
    retry: false,
  });

  return (
    <div className="min-h-screen bg-background px-4 py-8" dir="rtl">
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <BrandHeader />

        {isLoading ? (
          <div className="enterprise-card animate-pulse overflow-hidden">
            <div className="p-5">
              <div className="h-6 w-40 rounded bg-muted" />
              <div className="mt-2 h-4 w-28 rounded bg-muted" />
              <div className="mt-4 h-16 w-full rounded-xl bg-muted" />
              <div className="mt-3 h-14 w-full rounded-xl bg-muted" />
            </div>
          </div>
        ) : isError || !data?.team ? (
          <div className="empty-state animate-fade-up">
            <div className="empty-state-icon">
              <QrCode className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-bold">צוות לא נמצא</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">בדוק את קוד ה-QR.</p>
          </div>
        ) : (
          <TokenCheckinCard
            teamId={teamId}
            team={data.team as CheckinTeam}
            today={data.today as CheckinToday}
            onChange={refetch}
          />
        )}
      </div>
    </div>
  );
}

function TokenCheckinCard({
  teamId,
  team,
  today,
  onChange,
}: {
  teamId: string;
  team: CheckinTeam;
  today: CheckinToday;
  onChange: () => void;
}) {
  const startFn = useServerFn(startWorkdayByToken);
  const endFn = useServerFn(endWorkdayByToken);
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"start" | "end" | null>(null);
  const [workers, setWorkers] = useState(team.expected_workers || 1);
  const [busy, setBusy] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<PendingPhoto | null>(null);

  const stage = !today?.start_time ? 0 : !today?.end_time ? 1 : 2;

  const startTimeFormatted = today?.start_time
    ? new Date(today.start_time).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })
    : null;

  const shiftHours =
    today?.start_time && !today?.end_time
      ? ((Date.now() - new Date(today.start_time).getTime()) / 3600000).toFixed(1)
      : null;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const gps = await getGps();
      const dataUrl = await watermarkImage(file, { project: team.project_name, gps });
      setPendingPhoto({ dataUrl, gpsLat: gps.lat, gpsLng: gps.lng });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "שגיאה בצילום");
      setMode(null);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function confirmSubmit() {
    if (!pendingPhoto) return;
    setBusy(true);
    try {
      if (mode === "start") {
        await startFn({
          data: {
            teamId,
            workersActual: workers,
            gpsLat: pendingPhoto.gpsLat,
            gpsLng: pendingPhoto.gpsLng,
            photoBase64: pendingPhoto.dataUrl,
          },
        });
        toast.success("יום העבודה נפתח");
      } else if (mode === "end" && today?.id) {
        await endFn({
          data: {
            recordId: today.id,
            gpsLat: pendingPhoto.gpsLat,
            gpsLng: pendingPhoto.gpsLng,
            photoBase64: pendingPhoto.dataUrl,
          },
        });
        toast.success("יום העבודה נסגר ונשלח לאישור");
      }
      onChange();
      setPendingPhoto(null);
      setMode(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="enterprise-card overflow-hidden animate-fade-up">
      {/* Header: project / team / leader context */}
      <div
        className={`border-b border-border/40 px-5 py-4 ${
          stage === 0
            ? "bg-gradient-to-l from-muted/20 to-transparent"
            : stage === 1
              ? "bg-gradient-to-l from-emerald-500/8 to-transparent"
              : "bg-gradient-to-l from-primary/5 to-transparent"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold leading-tight">{team.name}</h3>
            <div className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {team.project_name}
            </div>
            {team.leader_name && (
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                רכז: {team.leader_name}
              </div>
            )}
          </div>
        </div>

        {/* Stage header */}
        <div
          className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
            stage === 0
              ? "bg-muted/60 text-muted-foreground"
              : stage === 1
                ? "bg-emerald-500/15 text-status-approved"
                : "bg-primary/15 text-primary"
          }`}
        >
          {stage === 0 && (
            <>
              <Clock className="h-3.5 w-3.5" /> יום עבודה לא התחיל
            </>
          )}
          {stage === 1 && startTimeFormatted && (
            <>
              <Timer className="h-3.5 w-3.5" /> יום עבודה פעיל · התחיל ב-{startTimeFormatted}
              {shiftHours ? ` · ${shiftHours} שעות` : ""}
            </>
          )}
          {stage === 2 && (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" /> יום העבודה הסתיים
            </>
          )}
        </div>
      </div>

      <div className="space-y-4 p-5">
        {/* Site not configured notice */}
        {!team.site_configured && stage === 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-orange-400/30 bg-orange-500/5 p-4 text-sm text-status-disputed">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>האתר עדיין לא הוגדר על ידי הקבלן — לא ניתן לפתוח יום עבודה.</span>
          </div>
        )}

        {/* Stage 0: Start workday */}
        {stage === 0 && (
          <>
            <div>
              <label className="mb-3 block text-sm font-semibold">כמה עובדים הגיעו היום?</label>
              <div className="flex items-center justify-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  disabled={workers <= 1}
                  onClick={() => setWorkers((w) => Math.max(1, w - 1))}
                  className="h-14 w-14 rounded-2xl text-xl font-bold"
                >
                  <Minus className="h-6 w-6" />
                </Button>
                <div className="grid h-20 w-28 place-items-center rounded-2xl border-2 border-primary/30 bg-primary/5">
                  <span className="text-4xl font-extrabold text-primary">{workers}</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  disabled={workers >= 500}
                  onClick={() => setWorkers((w) => Math.min(500, w + 1))}
                  className="h-14 w-14 rounded-2xl text-xl font-bold"
                >
                  <Plus className="h-6 w-6" />
                </Button>
              </div>
            </div>

            <Button
              size="lg"
              className="h-16 w-full gap-3 bg-gradient-primary text-lg text-primary-foreground shadow-elegant"
              disabled={busy || !team.site_configured}
              onClick={() => {
                setMode("start");
                fileRef.current?.click();
              }}
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
              התחל יום עבודה
            </Button>
          </>
        )}

        {/* Stage 1: Active workday */}
        {stage === 1 && (
          <Button
            size="lg"
            className="h-16 w-full gap-3 text-lg border-2 border-border/60 bg-card hover:bg-secondary text-foreground"
            disabled={busy}
            onClick={() => {
              setMode("end");
              fileRef.current?.click();
            }}
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Square className="h-5 w-5 text-destructive" />
            )}
            סיים יום עבודה
          </Button>
        )}

        {/* Stage 2: Workday ended */}
        {stage === 2 && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 text-sm text-status-approved">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-500" />
            <div>
              <div className="font-bold">יום העבודה הסתיים ונשלח לאישור</div>
              <div className="mt-0.5 text-xs text-muted-foreground">ממתין לאישור הקבלן</div>
            </div>
          </div>
        )}

        {/* Photo preview + confirmation */}
        {pendingPhoto && (
          <PhotoCapturePreview
            pendingPhoto={pendingPhoto}
            busy={busy}
            onRetake={() => {
              setPendingPhoto(null);
              setMode(null);
            }}
            onConfirm={confirmSubmit}
          />
        )}

        {/* Photo instruction */}
        {!pendingPhoto && stage !== 2 && <PhotoInstruction />}
      </div>

      {/* No `capture` → mobile offers camera OR photo library. */}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

// Exception reporting stays disabled in the coordinator happy-path. Referenced
// here to keep the flag intentional and easy to flip back on.
void ENABLE_EXCEPTIONS;
