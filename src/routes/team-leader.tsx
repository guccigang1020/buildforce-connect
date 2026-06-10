import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  listMyTeamLeaderProjects,
  startWorkday,
  endWorkday,
  reportException,
  getLastWorkersCount,
  getTeamForCheckin,
  startWorkdayByToken,
  endWorkdayByToken,
} from "@/lib/attendance.functions";
import { getGps, watermarkImage } from "@/lib/attendance-camera";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";
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
  ChevronDown,
  ChevronUp,
  Play,
  Square,
  Minus,
  Plus,
  Timer,
  Gavel,
  QrCode,
} from "lucide-react";

type TodayRecord = {
  id: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
};

type Team = {
  id: string;
  name: string;
  expected_workers: number;
  projects?: { name: string } | null;
  today?: TodayRecord | null;
};

export const Route = createFileRoute("/team-leader")({
  // Parse ?team=<id> on both server and client so the SSR and client renders
  // agree (avoids a hydration mismatch when branching to the QR check-in view).
  validateSearch: (search: Record<string, unknown>): { team?: string } => ({
    team: typeof search.team === "string" ? search.team : undefined,
  }),
  head: () => ({ meta: [{ title: "נוכחות יומית — ראש צוות" }] }),
  component: Page,
});

const STATUS_META: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> =
  {
    approved: {
      label: "אושר",
      className: "status-chip-approved",
      icon: CheckCircle2,
    },
    auto_approved: {
      label: "אושר אוטומטית",
      className: "status-chip-approved",
      icon: CheckCircle2,
    },
    exception: {
      label: "חריגה דווחה",
      className: "status-chip-disputed",
      icon: AlertTriangle,
    },
    rejected: {
      label: "נדחה",
      className: "status-chip-rejected",
      icon: XCircle,
    },
    pending: {
      label: "ממתין לאישור",
      className: "status-chip-pending",
      icon: Clock,
    },
  };

function Page() {
  const { team: focusTeamId } = Route.useSearch();

  // QR / no-account check-in: render a standalone token-mode view, no AppShell.
  if (focusTeamId) {
    return <TokenCheckinPage teamId={focusTeamId} />;
  }

  return <AuthedTeamLeaderPage />;
}

function AuthedTeamLeaderPage() {
  const list = useServerFn(listMyTeamLeaderProjects);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["tl-teams"],
    queryFn: () => list(),
  });

  const allTeams: Team[] = data?.teams ?? [];
  const teams = allTeams;

  // Daily summary
  const totalExpected = allTeams.reduce((s, t) => s + (t.expected_workers ?? 0), 0);
  const activeToday = allTeams.filter((t) => t.today?.start_time && !t.today?.end_time).length;
  const completedToday = allTeams.filter((t) => t.today?.end_time).length;

  return (
    <AppShell title="נוכחות יומית">
      <div className="mx-auto max-w-xl space-y-4">
        {/* Daily summary */}
        {allTeams.length > 0 && !isLoading && (
          <div className="enterprise-card p-4 animate-fade-up">
            <div className="grid grid-cols-3 divide-x divide-x-reverse divide-border/40">
              <div className="px-3 text-center">
                <div className="text-xl font-extrabold text-primary">{allTeams.length}</div>
                <div className="text-[11px] text-muted-foreground">צוותים</div>
              </div>
              <div className="px-3 text-center">
                <div className="text-xl font-extrabold">{totalExpected}</div>
                <div className="text-[11px] text-muted-foreground">עובדים צפויים</div>
              </div>
              <div className="px-3 text-center">
                <div
                  className={`text-xl font-extrabold ${activeToday > 0 ? "text-status-approved" : "text-muted-foreground"}`}
                >
                  {activeToday + completedToday}
                </div>
                <div className="text-[11px] text-muted-foreground">פעילים היום</div>
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
          <div className="space-y-4">
            {teams.map((t, i) => (
              <div key={t.id} className="animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
                <TeamCard team={t} onChange={refetch} />
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function TeamCard({ team, onChange }: { team: Team; onChange: () => void }) {
  const qc = useQueryClient();
  const startFn = useServerFn(startWorkday);
  const endFn = useServerFn(endWorkday);
  const excFn = useServerFn(reportException);
  const lastFn = useServerFn(getLastWorkersCount);
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"start" | "end" | null>(null);
  const [workers, setWorkers] = useState(team.expected_workers);
  const [busy, setBusy] = useState(false);
  const [excOpen, setExcOpen] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<PendingPhoto | null>(null);

  const lastQ = useQuery({
    queryKey: ["last-workers", team.id],
    queryFn: () => lastFn({ data: { teamId: team.id } }),
  });

  const today = team.today;
  const status = today?.status;
  const statusMeta = status ? (STATUS_META[status] ?? STATUS_META.pending) : null;
  const StatusIcon = statusMeta?.icon ?? Clock;

  // Shift duration
  const shiftHours =
    today?.start_time && !today?.end_time
      ? ((Date.now() - new Date(today.start_time).getTime()) / 3600000).toFixed(1)
      : null;

  // Stage determination
  const stage = !today?.start_time ? 0 : !today?.end_time ? 1 : 2;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const gps = await getGps();
      const dataUrl = await watermarkImage(file, { project: team.projects?.name ?? "", gps });
      // Show preview and wait for user confirmation
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
        const r = await startFn({
          data: {
            teamId: team.id,
            workersActual: workers,
            gpsLat: pendingPhoto.gpsLat,
            gpsLng: pendingPhoto.gpsLng,
            photoBase64: pendingPhoto.dataUrl,
          },
        });
        toast.success("יום העבודה נפתח");
        if (r?.notify) window.open(r.notify, "_blank");
      } else if (mode === "end" && today?.id) {
        const r = await endFn({
          data: {
            recordId: today.id,
            gpsLat: pendingPhoto.gpsLat,
            gpsLng: pendingPhoto.gpsLng,
            photoBase64: pendingPhoto.dataUrl,
          },
        });
        toast.success("יום העבודה נסגר ונשלח לאישור");
        if (r?.notify) window.open(r.notify, "_blank");
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

  async function exception(reason: string) {
    if (!today?.id) return;
    try {
      await excFn({ data: { recordId: today.id, reason } });
      toast.success("החריגה דווחה");
      setExcOpen(false);
      qc.invalidateQueries({ queryKey: ["tl-teams"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "שגיאה");
    }
  }

  const startTimeFormatted = today?.start_time
    ? new Date(today.start_time).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="enterprise-card overflow-hidden">
      {/* Header */}
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
              {team.projects?.name}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              {team.expected_workers} עובדים מתוכננים
            </div>
          </div>
          {statusMeta ? (
            <span className={`shrink-0 ${statusMeta.className}`}>
              <StatusIcon className="h-3.5 w-3.5" />
              {statusMeta.label}
            </span>
          ) : null}
        </div>

        {/* State machine stage header */}
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
        {/* Stage 0: Start workday */}
        {stage === 0 && (
          <>
            <div>
              <label className="mb-3 block text-sm font-semibold">כמה עובדים הגיעו היום?</label>
              {/* Worker stepper */}
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

            {lastQ.data?.workers != null && lastQ.data.workers !== workers && (
              <Button
                variant="outline"
                size="sm"
                className="h-11 w-full gap-2 text-xs"
                onClick={() => {
                  setWorkers(lastQ.data!.workers!);
                  toast.success("הוטען מהיום הקודם");
                }}
              >
                <RotateCcw className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  כמו <span dir="ltr">{lastQ.data.date}</span> — {lastQ.data.workers} עובדים
                </span>
              </Button>
            )}

            <Button
              size="lg"
              className="h-16 w-full gap-3 bg-gradient-primary text-lg text-primary-foreground shadow-elegant"
              disabled={busy}
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
          <>
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

            <Button
              variant="outline"
              size="sm"
              className="w-full h-11 gap-2 border-orange-400/40 text-status-disputed hover:bg-orange-500/5"
              onClick={() => setExcOpen((v) => !v)}
            >
              <AlertTriangle className="h-4 w-4" />
              דווח חריגה
              {excOpen ? (
                <ChevronUp className="h-4 w-4 ms-auto" />
              ) : (
                <ChevronDown className="h-4 w-4 ms-auto" />
              )}
            </Button>

            {excOpen && (
              <div className="rounded-xl border border-orange-400/30 bg-orange-500/5 p-4">
                <div className="mb-3 text-xs font-bold text-status-disputed">סוג החריגה</div>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ["left_early", "עזב מוקדם"],
                      ["partial_left", "חלק עזב"],
                      ["absent", "לא הגיע"],
                      ["half_day", "חצי יום"],
                      ["late", "איחור"],
                      ["other", "אחר"],
                    ] as const
                  ).map(([k, l]) => (
                    <Button
                      key={k}
                      variant="outline"
                      size="sm"
                      className="h-11"
                      onClick={() => exception(k)}
                    >
                      {l}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Stage 2: Workday ended */}
        {stage === 2 && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 text-sm text-status-approved">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-500" />
            <div>
              <div className="font-bold">יום העבודה הסתיים בהצלחה</div>
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
        {!pendingPhoto && <PhotoInstruction />}
      </div>

      {/* Hidden camera input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Shared photo capture/preview block (used by both TeamCard and the
// QR token check-in card)
// ──────────────────────────────────────────────────────────────────────────
type PendingPhoto = { dataUrl: string; gpsLat: number; gpsLng: number };

function PhotoCapturePreview({
  pendingPhoto,
  busy,
  onRetake,
  onConfirm,
}: {
  pendingPhoto: PendingPhoto;
  busy: boolean;
  onRetake: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-primary/30 bg-primary/5">
      <div className="flex items-center gap-2 border-b border-primary/15 px-4 py-2.5 text-xs font-bold text-primary">
        <Camera className="h-3.5 w-3.5" /> תמונה מוכנה לשליחה — אשר לפני השליחה
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
        חובה לצלם את כל הפועלים + עצמך באתר. תמונה מהגלריה לא תתקבל — המצלמה תיפתח ישירות.
      </span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// QR / no-account check-in (token mode)
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
                ראש צוות: {team.leader_name}
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

      {/* Hidden camera input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
