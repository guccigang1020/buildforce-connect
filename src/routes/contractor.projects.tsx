import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  listContractorProjects,
  setProjectSiteLocation,
  upsertProjectTeam,
  listProjectTeams,
} from "@/lib/attendance.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppShell } from "@/components/app-shell";
import {
  MapPin,
  Users,
  Phone,
  QrCode,
  Printer,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
  LocateFixed,
  ChevronDown,
  ChevronUp,
  Settings2,
  FolderOpen,
  BarChart3,
} from "lucide-react";

type Project = {
  id: string;
  name: string;
  address?: string | null;
  site_lat?: number | null;
  site_lng?: number | null;
  site_radius_meters?: number | null;
  site_manager_name?: string | null;
  site_manager_phone?: string | null;
};

type ProjectTeam = {
  id: string;
  name: string;
  team_leader_name: string | null;
  team_leader_phone: string | null;
  expected_workers: number;
  hourly_rate: number | null;
  worker_type: string | null;
};

export const Route = createFileRoute("/contractor/projects")({
  head: () => ({ meta: [{ title: "הגדרת פרויקט — קבלן" }] }),
  component: Page,
});

function Page() {
  const list = useServerFn(listContractorProjects);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["contractor-projects"],
    queryFn: () => list(),
  });
  const projects: Project[] = data?.projects ?? [];

  // Compute summary stats
  const readyCount = projects.filter((p) => p.site_lat && p.site_manager_phone).length;
  const notReadyCount = projects.length - readyCount;

  const action = (
    <Link to="/contractor/attendance">
      <Button variant="outline" size="sm">נוכחות</Button>
    </Link>
  );

  return (
    <AppShell title="פרויקטים" action={action}>
      <div className="space-y-6">
        {/* Page intro */}
        <div className="enterprise-card bg-gradient-to-l from-primary/5 to-transparent p-5 animate-fade-up">
          <div className="flex items-start gap-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-primary shadow-elegant text-primary-foreground">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold">הגדרת פרויקטים פעילים</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                לאחר זכייה במכרז: סמן מיקום האתר, הוסף פרטי מנהל אתר וצוותים. ללא הגדרה מלאה לא
                ניתן לרשום נוכחות.
              </p>
            </div>
          </div>
        </div>

        {/* Dashboard summary bar */}
        {projects.length > 0 && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 animate-fade-up delay-100">
            <div className="enterprise-card p-4 flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 shrink-0">
                <FolderOpen className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-xl font-extrabold">{projects.length}</div>
                <div className="text-[11px] text-muted-foreground">פרויקטים סה״כ</div>
              </div>
            </div>
            <div className="enterprise-card p-4 flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/15 shrink-0">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <div className="text-xl font-extrabold text-emerald-700">{readyCount}</div>
                <div className="text-[11px] text-muted-foreground">מוכנים</div>
              </div>
            </div>
            <div className="enterprise-card p-4 flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-amber-500/15 shrink-0">
                <AlertCircle className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <div className="text-xl font-extrabold text-amber-700">{notReadyCount}</div>
                <div className="text-[11px] text-muted-foreground">דרושה הגדרה</div>
              </div>
            </div>
            <div className="enterprise-card p-4 flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 shrink-0">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-xl font-extrabold">{projects.length > 0 ? Math.round((readyCount / projects.length) * 100) : 0}%</div>
                <div className="text-[11px] text-muted-foreground">אחוז מוכנות</div>
              </div>
            </div>
          </div>
        )}

        {/* Projects list */}
        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="enterprise-card overflow-hidden">
                <div className="p-5">
                  <div className="h-6 w-48 rounded bg-muted" />
                  <div className="mt-2 h-4 w-32 rounded bg-muted" />
                  <div className="mt-4 h-10 w-full rounded-xl bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="enterprise-card flex flex-col items-center gap-4 border-dashed p-14 text-center animate-fade-up delay-100">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-muted/50">
              <MapPin className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <div>
              <h3 className="font-bold">אין פרויקטים פעילים</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                פרויקטים יופיעו כאן לאחר זכייה במכרז.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map((p, i) => (
              <div key={p.id} className="animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
                <ProjectCard project={p} onChange={refetch} />
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function ProjectCard({ project, onChange }: { project: Project; onChange: () => void }) {
  const qc = useQueryClient();
  const setSite = useServerFn(setProjectSiteLocation);
  const listTeams = useServerFn(listProjectTeams);

  const [lat, setLat] = useState<string | number>(project.site_lat ?? "");
  const [lng, setLng] = useState<string | number>(project.site_lng ?? "");
  const [radius, setRadius] = useState<number>(project.site_radius_meters ?? 200);
  const [smName, setSmName] = useState(project.site_manager_name ?? "");
  const [smPhone, setSmPhone] = useState(project.site_manager_phone ?? "");
  const [savingSite, setSavingSite] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "loading" | "captured" | "error">(
    project.site_lat ? "captured" : "idle",
  );

  // Accordion state
  const [gpsOpen, setGpsOpen] = useState(!project.site_lat);
  const [managerOpen, setManagerOpen] = useState(!project.site_manager_phone);
  const [teamsOpen, setTeamsOpen] = useState(false);

  const teamsQ = useQuery({
    queryKey: ["teams", project.id],
    queryFn: () => listTeams({ data: { projectId: project.id } }),
  });

  const teams: ProjectTeam[] = teamsQ.data?.teams ?? [];
  const isReady = project.site_lat && project.site_manager_phone;

  // Progress
  const gpsConfigured = Boolean(project.site_lat);
  const managerConfigured = Boolean(project.site_manager_phone);
  const teamsConfigured = teams.length > 0;
  const stepsComplete = [gpsConfigured, managerConfigured, teamsConfigured].filter(Boolean).length;

  const useGps = () => {
    if (!navigator.geolocation) {
      toast.error("הדפדפן לא תומך ב-GPS — הזן מיקום ידנית");
      setGpsStatus("error");
      return;
    }
    setGpsStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setGpsStatus("captured");
        toast.success("מיקום GPS נלכד בהצלחה");
      },
      () => {
        setGpsStatus("error");
        toast.error("לא ניתן לקבל מיקום — ודא שאישרת גישה בדפדפן");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const saveSite = async () => {
    if (gpsStatus !== "captured" || !lat || !lng) return toast.error("יש ללכוד מיקום GPS תחילה");
    if (!smPhone || !smName) return toast.error("יש להזין שם וטלפון של מנהל האתר");
    setSavingSite(true);
    try {
      await setSite({
        data: {
          projectId: project.id,
          siteLat: Number(lat),
          siteLng: Number(lng),
          radiusMeters: Number(radius),
          siteManagerName: smName,
          siteManagerPhone: smPhone,
        },
      });
      toast.success("הגדרות האתר נשמרו");
      onChange();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setSavingSite(false);
    }
  };

  return (
    <div className="enterprise-card overflow-hidden">
      {/* Project header */}
      <div
        className={`flex items-center justify-between border-b border-border/40 px-5 py-4 ${
          isReady
            ? "bg-gradient-to-l from-emerald-500/5 to-transparent"
            : "bg-gradient-to-l from-amber-500/5 to-transparent"
        }`}
      >
        <div className="flex items-start gap-3">
          <div>
            <h3 className="text-lg font-bold">{project.name}</h3>
            <p className="text-sm text-muted-foreground">{project.address || "ללא כתובת"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Progress indicator */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground">
            <Settings2 className="h-3.5 w-3.5" />
            <span className="font-semibold">{stepsComplete}/3 שלבים</span>
          </div>
          {isReady ? (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> מוכן לעבודה
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-700">
              <AlertCircle className="h-3.5 w-3.5" /> דרושה הגדרה
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-5 pt-3 pb-1">
        <div className="flex items-center justify-between mb-1.5 text-[11px] text-muted-foreground">
          <span>התקדמות הגדרה</span>
          <span className="font-semibold">{stepsComplete}/3</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all duration-500 ${stepsComplete === 3 ? "bg-emerald-500" : stepsComplete >= 2 ? "bg-amber-500" : "bg-destructive/60"}`}
            style={{ width: `${(stepsComplete / 3) * 100}%` }}
          />
        </div>
        <div className="flex gap-3 mt-2">
          {[
            { label: "GPS", done: gpsConfigured },
            { label: "מנהל", done: managerConfigured },
            { label: "צוותים", done: teamsConfigured },
          ].map(({ label, done }) => (
            <span key={label} className={`inline-flex items-center gap-1 text-[10px] font-semibold ${done ? "text-emerald-700" : "text-muted-foreground"}`}>
              {done ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-1 p-5 pt-3">
        {/* GPS Section Accordion */}
        <AccordionSection
          title="מיקום האתר וגאו-פנס"
          icon={MapPin}
          done={gpsConfigured}
          open={gpsOpen}
          onToggle={() => setGpsOpen((v) => !v)}
          summary={gpsConfigured ? `${Number(lat || project.site_lat).toFixed(4)}, ${Number(lng || project.site_lng).toFixed(4)} · רדיוס ${radius}מ'` : "לא הוגדר"}
        >
          <div className="space-y-3 pt-3">
            {gpsStatus === "idle" && (
              <Button
                type="button"
                onClick={useGps}
                className="w-full gap-2 bg-gradient-primary text-primary-foreground shadow-elegant"
              >
                <LocateFixed className="h-4 w-4" /> קח מיקום נוכחי אוטומטית
              </Button>
            )}

            {gpsStatus === "loading" && (
              <div className="flex items-center justify-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
                מאתר מיקום GPS… ודא שאתה באתר הבנייה
              </div>
            )}

            {gpsStatus === "captured" && lat && lng && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" /> מיקום GPS נלכד
                  </div>
                  <button
                    type="button"
                    onClick={() => setGpsStatus("idle")}
                    className="text-xs text-muted-foreground underline hover:text-foreground"
                  >
                    שנה מיקום
                  </button>
                </div>
                <div className="mt-2 font-mono text-xs text-muted-foreground">
                  {Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}
                </div>
              </div>
            )}

            {gpsStatus === "error" && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                <div className="text-sm font-semibold text-destructive">
                  לא ניתן לקבל מיקום GPS
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  ודא שאישרת גישה למיקום בהגדרות הדפדפן שלך.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={useGps}
                  className="mt-3 gap-2"
                >
                  <LocateFixed className="h-3.5 w-3.5" /> נסה שוב
                </Button>
              </div>
            )}

            <div>
              <Label className="mb-1.5 block text-xs">רדיוס גאו-פנס מותר (מטר)</Label>
              <Input
                type="number"
                min={50}
                max={2000}
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="h-10"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                ראש הצוות חייב להיות בטווח זה מהמיקום שסימנת כדי לרשום נוכחות
              </p>
            </div>
          </div>
        </AccordionSection>

        {/* Site Manager Section Accordion */}
        <AccordionSection
          title="מנהל אתר / קבלן באתר"
          icon={Phone}
          done={managerConfigured}
          open={managerOpen}
          onToggle={() => setManagerOpen((v) => !v)}
          summary={managerConfigured ? `${smName || project.site_manager_name} · ${smPhone || project.site_manager_phone}` : "לא הוגדר"}
        >
          <div className="grid grid-cols-2 gap-3 pt-3">
            <div>
              <Label className="mb-1.5 block text-xs">שם מנהל האתר</Label>
              <Input
                value={smName}
                onChange={(e) => setSmName(e.target.value)}
                placeholder="ישראל ישראלי"
                className="h-10"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">טלפון נייד</Label>
              <Input
                value={smPhone}
                onChange={(e) => setSmPhone(e.target.value)}
                placeholder="050-1234567"
                className="h-10"
              />
            </div>
          </div>
        </AccordionSection>

        {/* Save site settings button */}
        {(gpsOpen || managerOpen) && (
          <Button
            onClick={saveSite}
            disabled={savingSite}
            className="w-full bg-gradient-primary text-primary-foreground shadow-elegant mt-2"
          >
            {savingSite ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" /> שומר…
              </>
            ) : (
              "שמור הגדרות אתר"
            )}
          </Button>
        )}

        {/* Teams Section Accordion */}
        <AccordionSection
          title="צוותי עבודה"
          icon={Users}
          done={teamsConfigured}
          open={teamsOpen}
          onToggle={() => setTeamsOpen((v) => !v)}
          summary={teamsConfigured ? `${teams.length} צוות${teams.length !== 1 ? "ות" : ""}` : "לא הוגדרו צוותים"}
        >
          <div className="pt-3 space-y-3">
            {/* Teams mini table */}
            {teams.length > 0 && (
              <div className="rounded-xl border border-border/60 overflow-hidden">
                <div className="grid grid-cols-5 bg-secondary/50 px-3 py-2 text-[11px] font-bold text-muted-foreground">
                  <span>צוות</span>
                  <span>ראש צוות</span>
                  <span>עובדים</span>
                  <span>תעריף</span>
                  <span>QR</span>
                </div>
                {teams.map((t) => (
                  <div key={t.id} className="grid grid-cols-5 items-center border-t border-border/40 px-3 py-2.5 text-sm">
                    <span className="font-semibold truncate">{t.name}</span>
                    <div className="text-xs text-muted-foreground truncate">
                      <div>{t.team_leader_name}</div>
                      <div>{t.team_leader_phone}</div>
                    </div>
                    <span className="font-semibold">{t.expected_workers}</span>
                    <span className="text-xs">{t.hourly_rate ? `₪${t.hourly_rate}` : "—"}</span>
                    <TeamQr teamId={t.id} teamName={t.name} projectName={project.name} />
                  </div>
                ))}
              </div>
            )}
            <div>
              <AddTeamForm
                projectId={project.id}
                onSaved={() => qc.invalidateQueries({ queryKey: ["teams", project.id] })}
              />
            </div>
          </div>
        </AccordionSection>

        {isReady && teams.length > 0 && (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/5 p-4 text-sm text-emerald-900 mt-2">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="h-4 w-4" /> הפרויקט מוכן
            </div>
            <p className="mt-1 text-xs">
              ראש הצוות יכול להיכנס ל-{" "}
              <Link to="/team-leader" className="font-bold underline">
                דף ראש צוות
              </Link>{" "}
              ולפתוח יום עבודה.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function AccordionSection({
  title,
  icon: Icon,
  done,
  open,
  onToggle,
  summary,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  done: boolean;
  open: boolean;
  onToggle: () => void;
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-sm font-semibold hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className={`grid h-7 w-7 place-items-center rounded-lg ${done ? "bg-emerald-500/15" : "bg-primary/15"}`}>
            <Icon className={`h-3.5 w-3.5 ${done ? "text-emerald-600" : "text-primary"}`} />
          </div>
          <span>{title}</span>
          {done && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
        </div>
        <div className="flex items-center gap-2">
          {!open && <span className="text-xs text-muted-foreground font-normal truncate max-w-[140px]">{summary}</span>}
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
        </div>
      </button>
      {open && (
        <div className="border-t border-border/40 bg-secondary/10 px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}

function AddTeamForm({ projectId, onSaved }: { projectId: string; onSaved: () => void }) {
  const upsert = useServerFn(upsertProjectTeam);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [tlName, setTlName] = useState("");
  const [tlPhone, setTlPhone] = useState("");
  const [tlUserId, setTlUserId] = useState("");
  const [workers, setWorkers] = useState(5);
  const [rate, setRate] = useState(60);
  const [workerType, setWorkerType] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open)
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" /> הוסף צוות
      </Button>
    );

  const save = async () => {
    if (!name || !tlName || !tlPhone || !tlUserId) return toast.error("כל השדות חובה");
    setBusy(true);
    try {
      await upsert({
        data: {
          projectId,
          name,
          teamLeaderName: tlName,
          teamLeaderPhone: tlPhone,
          teamLeaderUserId: tlUserId,
          expectedWorkers: workers,
          hourlyRate: rate,
          ...(workerType
            ? {
                workerType: workerType as
                  | "thai"
                  | "chinese"
                  | "team_leader"
                  | "professional"
                  | "custom",
              }
            : {}),
        },
      });
      toast.success("הצוות נוסף בהצלחה");
      setOpen(false);
      setName("");
      setTlName("");
      setTlPhone("");
      setTlUserId("");
      setWorkerType("");
      onSaved();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-card p-4">
      <div className="text-sm font-bold">הוספת צוות חדש</div>
      <Input
        placeholder="שם הצוות (למשל: צוות שלד)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-10"
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          placeholder="שם ראש הצוות"
          value={tlName}
          onChange={(e) => setTlName(e.target.value)}
          className="h-10"
        />
        <Input
          placeholder="טלפון 050-..."
          value={tlPhone}
          onChange={(e) => setTlPhone(e.target.value)}
          className="h-10"
        />
      </div>
      <Input
        placeholder="מזהה משתמש (UUID) של ראש הצוות"
        value={tlUserId}
        onChange={(e) => setTlUserId(e.target.value)}
        className="h-10"
      />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="mb-1.5 block text-xs">עובדים צפויים</Label>
          <Input
            type="number"
            min={1}
            value={workers}
            onChange={(e) => setWorkers(Number(e.target.value))}
            className="h-10"
          />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">תעריף ₪/שעה</Label>
          <Input
            type="number"
            min={1}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="h-10"
          />
        </div>
      </div>
      <div>
        <Label className="mb-1.5 block text-xs">סוג עובד (לתמחור)</Label>
        <select
          value={workerType}
          onChange={(e) => setWorkerType(e.target.value)}
          className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
        >
          <option value="">— בחר סוג עובד —</option>
          <option value="thai">עובד תאילנדי</option>
          <option value="chinese">עובד סיני</option>
          <option value="team_leader">ראש צוות</option>
          <option value="professional">עובד מקצועי</option>
          <option value="custom">תעריף מותאם</option>
        </select>
        <p className="mt-1 text-[11px] text-muted-foreground">
          ישמש לחישוב רווחיות בחשבון היומי של התאגיד
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={save} disabled={busy} size="sm" className="gap-2 bg-gradient-primary text-primary-foreground">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          שמור
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)} size="sm">
          ביטול
        </Button>
      </div>
    </div>
  );
}

function TeamQr({
  teamId,
  teamName,
  projectName,
}: {
  teamId: string;
  teamName: string;
  projectName: string;
}) {
  const [open, setOpen] = useState(false);
  const url =
    typeof window !== "undefined" ? `${window.location.origin}/team-leader?team=${teamId}` : "";
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=8&data=${encodeURIComponent(url)}`;

  const printQr = () => {
    const w = window.open("", "_blank", "width=420,height=600");
    if (!w) return;
    w.document.write(
      `<!doctype html><html dir="rtl"><head><title>QR — ${projectName} · ${teamName}</title>
      <style>body{font-family:sans-serif;text-align:center;padding:24px}h2{margin:6px 0}p{color:#555;margin:4px 0}img{margin-top:12px;border:1px solid #ddd;border-radius:8px}</style>
      </head><body><h2>${projectName}</h2><p>${teamName}</p><img src="${qrSrc}" alt="QR" />
      <p style="margin-top:14px;font-size:13px">סרוק כדי לפתוח את מסך הנוכחות לצוות זה</p>
      <script>window.onload=()=>setTimeout(()=>window.print(),500)</script></body></html>`,
    );
    w.document.close();
  };

  return (
    <div className="relative">
      <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)} className="gap-1.5 h-8 px-2.5 text-xs">
        <QrCode className="h-3.5 w-3.5" /> QR
      </Button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 w-52 rounded-xl border border-border/60 bg-card p-3 shadow-lg">
          <img src={qrSrc} alt={`QR ${teamName}`} width={180} height={180} className="rounded-lg" />
          <div className="mt-1.5 truncate text-[10px] text-muted-foreground">{url}</div>
          <Button size="sm" className="mt-2 w-full gap-1.5 bg-gradient-primary text-primary-foreground" onClick={printQr}>
            <Printer className="h-3.5 w-3.5" /> הדפס מדבקה
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="mt-1 w-full text-xs"
            onClick={() => setOpen(false)}
          >
            סגור
          </Button>
        </div>
      )}
    </div>
  );
}
