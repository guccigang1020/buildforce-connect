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

  const allTeams = data?.teams ?? [];
  const focusTeamId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("team")
      : null;
  const teams = focusTeamId
    ? allTeams.filter((t: Team) => t.id === focusTeamId)
    : allTeams;

  return (
    <AppShell title="נוכחות יומית">
      <div className="mx-auto max-w-xl space-y-4">
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
            {teams.map((t: Team, i: number) => (
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

  return (
    <div className="enterprise-card overflow-hidden">
      {/* Header */}
      <div className="border-b border-border/40 bg-gradient-to-l from-primary/5 to-transparent px-5 py-4">
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
          {statusMeta && (
            <span
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.className}`}
            >
              <StatusIcon className="h-3.5 w-3.5" />
              {statusMeta.label}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4 p-5">
        {/* Start workday */}
        {!today?.start_time && (
          <>
            <div>
              <label className="mb-2 block text-sm font-semibold">כמה עובדים הגיעו היום?</label>
              <input
                type="number"
                min={1}
                max={500}
                value={workers}
                onChange={(e) => setWorkers(Number(e.target.value))}
                className="h-14 w-full rounded-xl border border-border bg-card px-4 text-2xl font-bold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
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
                <Camera className="h-5 w-5" />
              )}
              התחל יום עבודה
            </Button>
          </>
        )}

        {/* End workday */}
        {today?.start_time && !today?.end_time && (
          <>
            <Button
              size="lg"
              className="h-16 w-full gap-3 text-lg"
              disabled={busy}
              onClick={() => {
                setMode("end");
                fileRef.current?.click();
              }}
            >
              {busy ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Camera className="h-5 w-5" />
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

        {/* Workday ended */}
        {today?.end_time && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-800">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            יום העבודה הסתיים — ממתין לאישור הקבלן.
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
