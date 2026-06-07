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
  head: () => ({ meta: [{ title: "נוכחות יומית — ראש צוות" }] }),
  component: Page,
});

const STATUS_META: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> =
  {
    approved: {
      label: "אושר",
      className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
      icon: CheckCircle2,
    },
    auto_approved: {
      label: "אושר אוטומטית",
      className: "border-slate-400/40 bg-slate-100 text-slate-600",
      icon: CheckCircle2,
    },
    exception: {
      label: "חריגה דווחה",
      className: "border-orange-500/40 bg-orange-500/10 text-orange-700",
      icon: AlertTriangle,
    },
    rejected: {
      label: "נדחה",
      className: "border-destructive/40 bg-destructive/10 text-destructive",
      icon: XCircle,
    },
    pending: {
      label: "ממתין לאישור",
      className: "border-amber-500/40 bg-amber-500/10 text-amber-700",
      icon: Clock,
    },
  };

function Page() {
  const list = useServerFn(listMyTeamLeaderProjects);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["tl-teams"],
    queryFn: () => list(),
  });

  const allTeams: Team[] = data?.teams ?? [];
  const focusTeamId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("team")
      : null;
  const teams = focusTeamId
    ? allTeams.filter((t) => t.id === focusTeamId)
    : allTeams;

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
                <div className={`text-xl font-extrabold ${activeToday > 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
                  {activeToday + completedToday}
                </div>
                <div className="text-[11px] text-muted-foreground">פעילים היום</div>
              </div>
            </div>
          </div>
        )}

        {focusTeamId && (
          <div className="enterprise-card border-primary/30 bg-primary/5 px-4 py-3 animate-fade-up">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-primary">
                <MapPin className="h-3.5 w-3.5" /> נכנסת דרך QR אתר — מוצג צוות בודד
              </div>
              <a
                href="/team-leader"
                className="text-muted-foreground underline hover:text-foreground"
              >
                הצג הכל
              </a>
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
          <div className="enterprise-card flex flex-col items-center gap-4 border-dashed p-14 text-center animate-fade-up">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-muted/50">
              <Users className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <div>
              <h3 className="font-bold">אין צוותים פעילים</h3>
              <p className="mt-1 text-sm text-muted-foreground">צור קשר עם הקבלן להקצאת צוות.</p>
            </div>
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

  const lastQ = useQuery({
    queryKey: ["last-workers", team.id],
    queryFn: () => lastFn({ data: { teamId: team.id } }),
  });

  const today = team.today;
  const status = today?.status;
  const statusMeta = status ? (STATUS_META[status] ?? STATUS_META.pending) : null;
  const StatusIcon = statusMeta?.icon ?? Clock;

  // Shift duration
  const shiftHours = today?.start_time && !today?.end_time
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
      if (mode === "start") {
        const r = await startFn({
          data: {
            teamId: team.id,
            workersActual: workers,
            gpsLat: gps.lat,
            gpsLng: gps.lng,
            photoBase64: dataUrl,
          },
        });
        toast.success("יום העבודה נפתח");
        if (r?.notify) window.open(r.notify, "_blank");
      } else if (mode === "end" && today?.id) {
        const r = await endFn({
          data: { recordId: today.id, gpsLat: gps.lat, gpsLng: gps.lng, photoBase64: dataUrl },
        });
        toast.success("יום העבודה נסגר ונשלח לאישור");
        if (r?.notify) window.open(r.notify, "_blank");
      }
      qc.invalidateQueries({ queryKey: ["tl-teams"] });
      onChange();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setBusy(false);
      setMode(null);
      if (fileRef.current) fileRef.current.value = "";
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
      <div className={`border-b border-border/40 px-5 py-4 ${
        stage === 0
          ? "bg-gradient-to-l from-muted/20 to-transparent"
          : stage === 1
            ? "bg-gradient-to-l from-emerald-500/8 to-transparent"
            : "bg-gradient-to-l from-primary/5 to-transparent"
      }`}>
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
            <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.className}`}>
              <StatusIcon className="h-3.5 w-3.5" />
              {statusMeta.label}
            </span>
          ) : null}
        </div>

        {/* State machine stage header */}
        <div className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
          stage === 0
            ? "bg-muted/60 text-muted-foreground"
            : stage === 1
              ? "bg-emerald-500/15 text-emerald-700"
              : "bg-primary/15 text-primary"
        }`}>
          {stage === 0 && (
            <><Clock className="h-3.5 w-3.5" /> יום עבודה לא התחיל</>
          )}
          {stage === 1 && startTimeFormatted && (
            <><Timer className="h-3.5 w-3.5" /> יום עבודה פעיל · התחיל ב-{startTimeFormatted}{shiftHours ? ` · ${shiftHours} שעות` : ""}</>
          )}
          {stage === 2 && (
            <><CheckCircle2 className="h-3.5 w-3.5" /> יום העבודה הסתיים</>
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
                className="w-full gap-2"
                onClick={() => {
                  setWorkers(lastQ.data!.workers!);
                  toast.success("הוטען מהיום הקודם");
                }}
              >
                <RotateCcw className="h-4 w-4" />
                אותו דבר כמו {lastQ.data.date} — {lastQ.data.workers} עובדים
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
              {busy ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Play className="h-5 w-5" />
              )}
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
              className="w-full gap-2 border-orange-400/40 text-orange-700 hover:bg-orange-500/5"
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
                <div className="mb-3 text-xs font-bold text-orange-700">סוג החריגה</div>
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
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 text-sm text-emerald-800">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
            <div>
              <div className="font-bold">יום העבודה הסתיים בהצלחה</div>
              <div className="mt-0.5 text-xs text-emerald-700/70">ממתין לאישור הקבלן</div>
            </div>
          </div>
        )}

        {/* Photo instruction */}
        <div className="flex items-start gap-2 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>
            חובה לצלם את כל הפועלים + עצמך באתר. תמונה מהגלריה לא תתקבל — המצלמה תיפתח ישירות.
          </span>
        </div>
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
