import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
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
  hourly_rate?: number | null;
  expected_workers?: number | null;
};

type ProjectTeam = {
  id: string;
  name: string;
  team_leader_name: string | null;
  team_leader_phone: string | null;
  expected_workers: number;
  hourly_rate: number | null;
};

export const Route = createFileRoute("/contractor/projects")({
  head: () => ({ meta: [{ title: "הגדרת פרויקט — קבלן" }] }),
  component: Page,
});

function Page() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const list = useServerFn(listContractorProjects);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["contractor-projects"],
    queryFn: () => list(),
    enabled: !!session,
  });

  useEffect(() => {
    if (loading) return;
    if (!session) void navigate({ to: "/login", replace: true });
  }, [loading, session, navigate]);
  const projects: Project[] = data?.projects ?? [];

  // Compute summary stats
  const readyCount = projects.filter((p) => p.site_lat && p.site_manager_phone).length;
  const notReadyCount = projects.length - readyCount;

  const action = (
    <Link to="/contractor/attendance">
      <Button variant="outline" size="sm">
        נוכחות
      </Button>
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
                לאחר זכייה במכרז: סמן מיקום האתר, הוסף פרטי מנהל אתר וצוותים. ללא הגדרה מלאה לא ניתן
                לרשום נוכחות.
              </p>
            </div>
          </div>
        </div>

        {/* Dashboard summary bar */}
        {projects.length > 0 && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 animate-fade-up delay-100">
            <div className="kpi-card p-4">
              <div className="kpi-icon kpi-icon-primary">
                <FolderOpen className="h-4 w-4" />
              </div>
              <div className="mt-3 text-xl font-extrabold">{projects.length}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">פרויקטים סה״כ</div>
            </div>
            <div className="kpi-card kpi-card-success p-4">
              <div className="kpi-icon kpi-icon-success">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="mt-3 text-xl font-extrabold">{readyCount}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">מוכנים</div>
            </div>
            <div className={`kpi-card p-4${notReadyCount > 0 ? " kpi-card-warning" : ""}`}>
              <div
                className={`kpi-icon ${notReadyCount > 0 ? "kpi-icon-warning" : "kpi-icon-muted"}`}
              >
                <AlertCircle className="h-4 w-4" />
              </div>
              <div className="mt-3 text-xl font-extrabold">{notReadyCount}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">דרושה הגדרה</div>
            </div>
            <div className="kpi-card kpi-card-primary p-4">
              <div className="kpi-icon kpi-icon-filled">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div className="mt-3 text-xl font-extrabold">
                {projects.length > 0 ? Math.round((readyCount / projects.length) * 100) : 0}%
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">אחוז מוכנות</div>
            </div>
          </div>
        )}

        {/* Projects list */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="enterprise-card overflow-hidden">
                <div className="p-5 space-y-3">
                  <div className="skeleton-title animate-pulse bg-muted/40" />
                  <div className="skeleton-body animate-pulse bg-muted/40" />
                  <div className="skeleton-kpi animate-pulse bg-muted/40" />
                </div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="empty-state animate-fade-up delay-100">
            <div className="empty-state-icon">
              <MapPin className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-bold">אין פרויקטים פעילים</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              פרויקטים יופיעו כאן לאחר זכייה במכרז.
            </p>
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
            <span className="status-chip-approved">
              <CheckCircle2 className="h-3 w-3" /> מוכן לעבודה
            </span>
          ) : (
            <span className="status-chip-pending">
              <AlertCircle className="h-3 w-3" /> דרושה הגדרה
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-5 pt-3 pb-1">
        <div className="flex items-center justify-between mb-1.5 text-[11px] text-muted-foreground">
          <span>התקדמות הגדרה</span>
          <span className="font-semibold">{stepsComplete}/3</span>
        </div>
        <div className="progress-track">
          <div
            className={`progress-fill${stepsComplete === 3 ? " progress-fill-success" : stepsComplete >= 2 ? " progress-fill-warning" : ""}`}
            style={{ width: `${(stepsComplete / 3) * 100}%` }}
          />
        </div>
        <div className="flex gap-3 mt-2">
          {[
            { label: "GPS", done: gpsConfigured },
            { label: "מנהל", done: managerConfigured },
            { label: "צוותים", done: teamsConfigured },
          ].map(({ label, done }) => (
            <span
              key={label}
              className={`inline-flex items-center gap-1 text-[11px] font-semibold ${done ? "text-status-approved" : "text-muted-foreground"}`}
            >
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
          summary={
            gpsConfigured
              ? `${Number(lat || project.site_lat).toFixed(4)}, ${Number(lng || project.site_lng).toFixed(4)} · רדיוס ${radius}מ'`
              : "לא הוגדר"
          }
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
                  <div className="flex items-center gap-2 text-sm font-bold text-status-approved">
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
                <div className="mt-2 font-mono text-xs text-muted-foreground" dir="ltr">
                  {Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}
                </div>
              </div>
            )}

            {gpsStatus === "error" && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                <div className="text-sm font-semibold text-destructive">לא ניתן לקבל מיקום GPS</div>
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
          summary={
            managerConfigured
              ? `${smName || project.site_manager_name} · ${smPhone || project.site_manager_phone}`
              : "לא הוגדר"
          }
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
                dir="ltr"
                className="h-10 text-end"
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
          summary={
            teamsConfigured
              ? `${teams.length} צוות${teams.length !== 1 ? "ות" : ""}`
              : "לא הוגדרו צוותים"
          }
        >
          <div className="pt-3 space-y-3">
            {/* Explainer: what is a team leader / how the QR check-in works */}
            <div className="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-muted-foreground">
              <QrCode className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="space-y-1">
                <p>
                  <span className="font-bold text-foreground">ראש צוות</span> הוא המנהל בשטח של
                  הצוות — הוא <span className="font-semibold text-foreground">לא צריך להירשם</span>.
                  אחרי שמוסיפים אותו כאן, מדפיסים/משתפים את ה-QR של הצוות וראש הצוות סורק אותו בנייד
                  שלו כדי לפתוח ולסגור יום עבודה עם תמונה.
                </p>
                <p className="text-[11px] text-muted-foreground/80">
                  הזמנה אוטומטית ב-WhatsApp — בקרוב
                </p>
              </div>
            </div>

            {/* Teams mini table */}
            {teams.length > 0 && (
              <>
                <div className="rounded-xl border border-border/60 overflow-hidden">
                  <div className="premium-table-header grid grid-cols-5 px-3 py-2.5">
                    <span>צוות</span>
                    <span>ראש צוות</span>
                    <span>עובדים</span>
                    <span>תעריף</span>
                    <span>QR</span>
                  </div>
                  {teams.map((t) => (
                    <div
                      key={t.id}
                      className="premium-table-row grid grid-cols-5 items-center px-3 py-2.5 text-sm"
                    >
                      <span className="font-semibold truncate">{t.name}</span>
                      <div className="text-xs text-muted-foreground truncate">
                        <div className="truncate">{t.team_leader_name}</div>
                        <div dir="ltr" className="text-end">
                          {t.team_leader_phone}
                        </div>
                      </div>
                      <span className="font-semibold">{t.expected_workers}</span>
                      <span className="text-xs" dir="ltr">
                        {t.hourly_rate ? `₪${t.hourly_rate}` : "—"}
                      </span>
                      <TeamQr teamId={t.id} teamName={t.name} projectName={project.name} />
                    </div>
                  ))}
                </div>
                <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <QrCode className="h-3 w-3 shrink-0" />
                  תן לראש הצוות לסרוק את ה-QR כדי לדווח נוכחות.
                </p>
              </>
            )}
            <div>
              <AddTeamForm
                projectId={project.id}
                hourlyRate={project.hourly_rate ?? null}
                expectedWorkers={project.expected_workers ?? null}
                onSaved={() => qc.invalidateQueries({ queryKey: ["teams", project.id] })}
              />
            </div>
          </div>
        </AccordionSection>

        {isReady && teams.length > 0 && (
          <div className="mt-2 rounded-xl border border-emerald-400/30 bg-emerald-500/5 p-4 text-sm text-status-approved">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="h-4 w-4" /> הפרויקט מוכן לעבודה
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              שתפו את קוד ה-<span className="font-semibold text-foreground">QR</span> של כל צוות עם
              ראש הצוות — סריקה בנייד פותחת מסך נוכחות (צילום + GPS), ללא הרשמה.
              <span className="mt-1 block text-muted-foreground/90">
                דיווחי הנוכחות, החשבון היומי והחשבוניות ייכנסו לפעולה בפיילוט.
              </span>
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
          <div
            className={`grid h-7 w-7 place-items-center rounded-lg ${done ? "bg-emerald-500/15" : "bg-primary/15"}`}
          >
            <Icon className={`h-3.5 w-3.5 ${done ? "text-status-approved" : "text-primary"}`} />
          </div>
          <span>{title}</span>
          {done && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
        </div>
        <div className="flex items-center gap-2">
          {!open && (
            <span className="text-xs text-muted-foreground font-normal truncate max-w-[140px]">
              {summary}
            </span>
          )}
          {open ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
        </div>
      </button>
      {open && (
        <div className="border-t border-border/40 bg-secondary/10 px-4 pb-4">{children}</div>
      )}
    </div>
  );
}

// Israeli phone: strip non-digits, accept 0XXXXXXXXX (9-10 digits) or 972XXXXXXXXX
function isValidIsraeliPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("972")) {
    const rest = digits.slice(3);
    return rest.length >= 8 && rest.length <= 9;
  }
  if (digits.startsWith("0")) {
    return digits.length >= 9 && digits.length <= 10;
  }
  return false;
}

function AddTeamForm({
  projectId,
  hourlyRate,
  expectedWorkers,
  onSaved,
}: {
  projectId: string;
  hourlyRate: number | null;
  expectedWorkers: number | null;
  onSaved: () => void;
}) {
  const upsert = useServerFn(upsertProjectTeam);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [tlName, setTlName] = useState("");
  const [tlPhone, setTlPhone] = useState("");
  const [workers, setWorkers] = useState(expectedWorkers ?? 5);
  const [busy, setBusy] = useState(false);

  const rate = hourlyRate ?? 0;

  if (!open)
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" /> הוסף צוות
      </Button>
    );

  const save = async () => {
    if (name.trim().length < 2) return toast.error("יש להזין שם צוות (לפחות 2 תווים)");
    if (tlName.trim().length < 2) return toast.error("יש להזין שם ראש צוות (לפחות 2 תווים)");
    if (!isValidIsraeliPhone(tlPhone)) return toast.error("מספר הטלפון של ראש הצוות אינו תקין");
    if (!workers || workers < 1) return toast.error("יש להזין כמות עובדים תקינה");
    setBusy(true);
    try {
      await upsert({
        data: {
          projectId,
          name: name.trim(),
          teamLeaderName: tlName.trim(),
          teamLeaderPhone: tlPhone.trim(),
          expectedWorkers: workers,
          hourlyRate: rate,
        },
      });
      toast.success("הצוות נוסף בהצלחה");
      setOpen(false);
      setName("");
      setTlName("");
      setTlPhone("");
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
        <div>
          <Input
            placeholder="טלפון 050-..."
            value={tlPhone}
            onChange={(e) => setTlPhone(e.target.value)}
            dir="ltr"
            className="h-10 text-end"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            הטלפון משמש רק לזיהוי ראש הצוות עבור ה-QR והתראות — אין צורך בהרשמה או חשבון.
          </p>
        </div>
      </div>
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
          <Input type="number" value={rate} disabled className="h-10 bg-muted/50" />
          <p className="mt-1 text-[11px] text-muted-foreground">נקבע לפי ההצעה הזוכה</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          onClick={save}
          disabled={busy}
          size="sm"
          className="gap-2 bg-gradient-primary text-primary-foreground"
        >
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
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen((v) => !v)}
        title="QR לראש הצוות"
        className="gap-1.5 h-8 px-2.5 text-xs"
      >
        <QrCode className="h-3.5 w-3.5" /> QR
      </Button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 w-52 rounded-xl border border-border/60 bg-card p-3 shadow-lg">
          <div className="mb-1.5 text-xs font-bold">QR לראש הצוות</div>
          <img src={qrSrc} alt={`QR ${teamName}`} width={180} height={180} className="rounded-lg" />
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            ראש הצוות סורק כדי לדווח נוכחות — ללא צורך בהרשמה.
          </p>
          <div className="mt-1.5 truncate text-[11px] text-muted-foreground" dir="ltr">
            {url}
          </div>
          <Button
            size="sm"
            className="mt-2 w-full gap-1.5 bg-gradient-primary text-primary-foreground"
            onClick={printQr}
          >
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
