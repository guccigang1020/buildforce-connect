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
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import {
  MapPin,
  Users,
  Phone,
  QrCode,
  Printer,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  Plus,
  LocateFixed,
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
  const projects = data?.projects ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-4xl px-4 py-10 md:px-6 md:py-14" dir="rtl">
        <Link
          to="/contractor/attendance"
          className="mb-6 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> חזרה לנוכחות
        </Link>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-primary">
            ניהול פרויקטים
          </div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">הגדרת פרויקטים פעילים</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            לאחר זכייה במכרז: סמן את מיקום האתר, הוסף את פרטי מנהל האתר וראש הצוות. ללא הגדרה
            מלאה לא ניתן לרשום נוכחות.
          </p>
        </div>

        <div className="mt-8">
          {isLoading ? (
            <div className="flex items-center justify-center rounded-2xl border border-border/60 bg-card p-12 text-sm text-muted-foreground">
              <Loader2 className="ml-2 h-4 w-4 animate-spin" /> טוען פרויקטים…
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
              <MapPin className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                אין פרויקטים פעילים עדיין. פרויקטים יופיעו לאחר זכייה במכרז.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map((p: Project) => (
                <ProjectCard key={p.id} project={p} onChange={refetch} />
              ))}
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function ProjectCard({ project, onChange }: { project: Project; onChange: () => void }) {
  const qc = useQueryClient();
  const setSite = useServerFn(setProjectSiteLocation);
  const listTeams = useServerFn(listProjectTeams);
  const upsert = useServerFn(upsertProjectTeam);

  const [lat, setLat] = useState(project.site_lat ?? "");
  const [lng, setLng] = useState(project.site_lng ?? "");
  const [radius, setRadius] = useState(project.site_radius_meters ?? 200);
  const [smName, setSmName] = useState(project.site_manager_name ?? "");
  const [smPhone, setSmPhone] = useState(project.site_manager_phone ?? "");
  const [savingSite, setSavingSite] = useState(false);

  const teamsQ = useQuery({
    queryKey: ["teams", project.id],
    queryFn: () => listTeams({ data: { projectId: project.id } }),
  });

  const useGps = () => {
    if (!navigator.geolocation) return toast.error("דפדפן לא תומך ב-GPS");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        toast.success("המיקום הנוכחי נלכד");
      },
      () => toast.error("לא ניתן לקבל מיקום"),
      { enableHighAccuracy: true },
    );
  };

  const saveSite = async () => {
    if (!lat || !lng) return toast.error("יש להזין מיקום");
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

  const isReady = project.site_lat && project.site_manager_phone;
  const teams = teamsQ.data?.teams ?? [];

  return (
    <Card className="overflow-hidden">
      <div
        className={`flex items-center justify-between border-b border-border/60 px-5 py-4 ${isReady ? "bg-emerald-500/5" : "bg-amber-500/5"}`}
      >
        <div>
          <div className="font-bold text-lg">{project.name}</div>
          <div className="text-sm text-muted-foreground">{project.address || "ללא כתובת"}</div>
        </div>
        {isReady ? (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> מוכן לעבודה
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700">
            <AlertCircle className="h-3.5 w-3.5" /> דרושה הגדרה
          </div>
        )}
      </div>

      <div className="space-y-6 p-5">
        {/* Site location */}
        <div>
          <div className="mb-3 flex items-center gap-2 font-semibold text-sm">
            <MapPin className="h-4 w-4 text-primary" /> מיקום האתר וגאו-פנס
          </div>
          <Button type="button" variant="outline" size="sm" onClick={useGps} className="mb-3 gap-2">
            <LocateFixed className="h-4 w-4" /> קח מיקום נוכחי
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-xs">קו רוחב</Label>
              <Input
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="32.0853"
                className="h-10"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">קו אורך</Label>
              <Input
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="34.7818"
                className="h-10"
              />
            </div>
          </div>
          <div className="mt-3">
            <Label className="mb-1.5 block text-xs">רדיוס מותר (מטר)</Label>
            <Input
              type="number"
              min={50}
              max={2000}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="h-10"
            />
          </div>
        </div>

        {/* Site manager */}
        <div>
          <div className="mb-3 flex items-center gap-2 font-semibold text-sm">
            <Phone className="h-4 w-4 text-primary" /> מנהל אתר / קבלן באתר
          </div>
          <div className="grid grid-cols-2 gap-3">
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
        </div>

        <Button
          onClick={saveSite}
          disabled={savingSite}
          className="w-full bg-gradient-primary text-primary-foreground shadow-elegant"
        >
          {savingSite ? (
            <>
              <Loader2 className="ml-2 h-4 w-4 animate-spin" /> שומר…
            </>
          ) : (
            "שמור הגדרות אתר"
          )}
        </Button>

        {/* Teams */}
        <div className="border-t border-border/60 pt-5">
          <div className="mb-3 flex items-center gap-2 font-semibold text-sm">
            <Users className="h-4 w-4 text-primary" /> צוותי עבודה
          </div>
          <div className="space-y-2">
            {teams.map((t: ProjectTeam) => (
              <div
                key={t.id}
                className="relative flex items-center justify-between rounded-xl border border-border/60 bg-secondary/30 px-4 py-3 text-sm"
              >
                <div>
                  <div className="font-semibold">{t.name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    ראש צוות: {t.team_leader_name} · {t.team_leader_phone} ·{" "}
                    {t.expected_workers} עובדים · ₪{t.hourly_rate}/שעה
                  </div>
                </div>
                <TeamQr teamId={t.id} teamName={t.name} projectName={project.name} />
              </div>
            ))}
          </div>
          <div className="mt-3">
            <AddTeamForm
              projectId={project.id}
              onSaved={() => qc.invalidateQueries({ queryKey: ["teams", project.id] })}
            />
          </div>
        </div>

        {isReady && teams.length > 0 && (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/5 p-4 text-sm text-emerald-900">
            <div className="flex items-center gap-2 font-semibold">
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
    </Card>
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
        },
      });
      toast.success("הצוות נוסף בהצלחה");
      setOpen(false);
      setName("");
      setTlName("");
      setTlPhone("");
      setTlUserId("");
      onSaved();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-card p-4">
      <div className="text-sm font-semibold">הוספת צוות חדש</div>
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
        placeholder="מזהה משתמש (UUID) של ראש הצוות במערכת"
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
      <div className="flex gap-2">
        <Button onClick={save} disabled={busy} size="sm" className="gap-2">
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
      <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)} className="gap-1.5">
        <QrCode className="h-4 w-4" /> QR
      </Button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 w-52 rounded-xl border border-border/60 bg-card p-3 shadow-lg">
          <img src={qrSrc} alt={`QR ${teamName}`} width={180} height={180} className="rounded-lg" />
          <div className="mt-1.5 truncate text-[10px] text-muted-foreground">{url}</div>
          <Button size="sm" className="mt-2 w-full gap-1.5" onClick={printQr}>
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
