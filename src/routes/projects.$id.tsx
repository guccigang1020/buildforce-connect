import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import PlaceIcon from "@mui/icons-material/Place";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import GroupIcon from "@mui/icons-material/Group";
import EngineeringIcon from "@mui/icons-material/Engineering";
import BadgeIcon from "@mui/icons-material/Badge";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { getProjectDetail } from "@/lib/projects.functions";
import { setProjectSiteLocation } from "@/lib/attendance.functions";
import { getProjectHoursSummary } from "@/lib/project-attendance.functions";
import { provisionProjectMember, removeProjectMember } from "@/lib/project-members.functions";
import { saveProjectWorkers, removeProjectWorker } from "@/lib/project-workers.functions";
import { ProjectChat } from "@/components/project-chat";
import { ProjectAttendanceTab } from "@/components/project-attendance-tab";
import { SetPageCrumb } from "@/components/page-crumb";

export const Route = createFileRoute("/projects/$id")({
  component: ProjectDetailPage,
});

type Detail = Awaited<ReturnType<typeof getProjectDetail>>;

function ProjectDetailPage() {
  const { id } = Route.useParams();
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const detailFn = useServerFn(getProjectDetail);

  useEffect(() => {
    if (!loading && !session) void navigate({ to: "/login", replace: true });
  }, [loading, session, navigate]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["project-detail", id],
    queryFn: () => detailFn({ data: { projectId: id } }),
    enabled: !!session,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["project-detail", id] });

  if (isLoading) {
    return (
      <AppShell title="פרויקט">
        <div className="space-y-4">
          <div className="h-16 animate-pulse rounded-lg bg-muted" />
          <div className="h-48 animate-pulse rounded-lg bg-muted" />
          <div className="h-48 animate-pulse rounded-lg bg-muted" />
        </div>
      </AppShell>
    );
  }
  if (error || !data?.project) {
    return (
      <AppShell title="פרויקט">
        <div className="enterprise-card p-10 text-center">
          <h2 className="text-lg font-semibold">הפרויקט לא נמצא</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            ייתכן שאין לך הרשאה לצפות בפרויקט זה.
          </p>
        </div>
      </AppShell>
    );
  }

  return <ProjectWorkspace detail={data as Detail} projectId={id} onChanged={refresh} />;
}

type TabKey = "details" | "attendance" | "hours" | "chat";

function ProjectWorkspace({
  detail: d,
  projectId,
  onChanged,
}: {
  detail: Detail;
  projectId: string;
  onChanged: () => void;
}) {
  const role = d.viewerRole;
  const isContractor = role === "contractor";
  const isCorporation = role === "corporation";
  const isOwner = isContractor || isCorporation;
  // Who can do what (single source of truth for the whole workspace):
  const canApproveAttendance = isContractor || role === "site_manager"; // contractor + foreman
  // Money view: the two principals + the corporation-side operations manager,
  // and the admin (read-only observer of everything).
  const canSeeHours = isOwner || role === "operations_manager" || role === "admin";

  // Tabs available to this role.
  const tabs: { key: TabKey; label: string }[] = [
    { key: "details", label: "פרטים" },
    { key: "attendance", label: "נוכחות" },
    ...(canSeeHours ? [{ key: "hours" as const, label: "שעות ועלויות" }] : []),
    // Coordinator (רכז) is excluded from the chat.
    ...(role !== "team_leader" ? [{ key: "chat" as const, label: "צ׳אט" }] : []),
  ];
  const [tab, setTab] = useState<TabKey>("attendance");

  return (
    <AppShell title={d.project.name}>
      <SetPageCrumb label={d.project.name} />
      <div className="space-y-4" dir="rtl">
        {role === "admin" && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <VisibilityIcon sx={{ fontSize: 15 }} />
            מצב מנהל מערכת — צפייה בלבד בכל נתוני הפרויקט.
          </div>
        )}
        <div className="pill-tabs inline-flex flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`pill-tab ${tab === t.key ? "pill-tab-active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "details" && (
          <div className="space-y-5">
            <ReadinessBar readiness={d.readiness} />
            <ContractorSection detail={d} editable={isContractor} onChanged={onChanged} />
            <CorporationSection detail={d} editable={isCorporation} onChanged={onChanged} />
          </div>
        )}

        {tab === "attendance" && (
          <ProjectAttendanceTab projectId={projectId} canApprove={canApproveAttendance} />
        )}

        {tab === "hours" && canSeeHours && <HoursTab projectId={projectId} />}

        {tab === "chat" && <ProjectChat projectId={projectId} readOnly={role === "admin"} />}
      </div>
    </AppShell>
  );
}

// Per-project hours + cost, by month. Visible to corporation, contractor, and
// the operations manager (project-scoped summary, so all three resolve data).
function HoursTab({ projectId }: { projectId: string }) {
  const now = new Date();
  const [ym, setYm] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
  );
  const summaryFn = useServerFn(getProjectHoursSummary);
  const [year, month] = ym.split("-").map(Number);

  const { data, isLoading } = useQuery({
    queryKey: ["project-hours", projectId, ym],
    queryFn: () => summaryFn({ data: { year, month, projectId } }),
  });
  const s = data?.summary;
  const daily = data?.daily ?? [];
  const hasData = (s?.days ?? 0) > 0;

  const months = Array.from({ length: 12 }, (_, i) => {
    const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const v = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
    return { v, label: dt.toLocaleDateString("he-IL", { month: "long", year: "numeric" }) };
  });

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">שעות ועלויות</h2>
        <select
          value={ym}
          onChange={(e) => setYm(e.target.value)}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm"
        >
          {months.map((m) => (
            <option key={m.v} value={m.v}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label='סה"כ עלות'
              value={`₪${Math.round(s?.totalCost ?? 0).toLocaleString()}`}
              tone="primary"
            />
            <StatCard label='סה"כ שעות' value={(s?.totalHours ?? 0).toFixed(1)} tone="sky" />
            <StatCard
              label="ימי עבודה שאושרו"
              value={`${s?.approved ?? 0}/${s?.days ?? 0}`}
              tone="emerald"
            />
            <StatCard
              label="ממוצע עובדים ליום"
              value={s?.days ? (s.totalWorkerDays / s.days).toFixed(1) : "0"}
              tone="amber"
            />
          </div>

          <div className="enterprise-card p-4">
            <div className="mb-3 text-sm font-semibold text-foreground">עלות יומית (₪)</div>
            {hasData ? (
              <div className="h-56 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={daily} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="day"
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                      stroke="var(--muted-foreground)"
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                      width={48}
                      stroke="var(--muted-foreground)"
                      tickFormatter={(v) => `₪${v}`}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                      contentStyle={{ direction: "rtl", fontSize: 12, borderRadius: 8 }}
                      formatter={(
                        v: number,
                        _n,
                        p: { payload?: { hours?: number; workers?: number } },
                      ) => [
                        `₪${Math.round(v).toLocaleString()} · ${p?.payload?.hours ?? 0} ש' · ${p?.payload?.workers ?? 0} עובדים`,
                        "יום " + (p as { payload?: { day?: number } })?.payload?.day,
                      ]}
                      labelFormatter={() => ""}
                    />
                    <Bar dataKey="cost" radius={[4, 4, 0, 0]} fill="var(--primary)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                אין נתוני נוכחות מאושרים לחודש זה עדיין.
              </p>
            )}
          </div>
        </>
      )}
      <p className="text-xs text-muted-foreground">
        העלות מחושבת לפי שעות בפועל × תעריף שעתי × מספר העובדים שדווחו, לאחר אישור.
      </p>
    </div>
  );
}

const TONE: Record<string, string> = {
  primary: "border-primary/30 bg-primary/5 text-primary",
  sky: "border-sky-500/30 bg-sky-500/5 text-sky-600 dark:text-sky-400",
  emerald: "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400",
  amber: "border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400",
};
function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: keyof typeof TONE;
}) {
  return (
    <div className={`rounded-xl border p-4 ${TONE[tone]}`}>
      <div className="text-2xl font-extrabold tabular-nums">{value}</div>
      <div className="mt-1 text-xs font-medium text-muted-foreground">{label}</div>
    </div>
  );
}

function ReadinessBar({ readiness }: { readiness: Detail["readiness"] }) {
  const items: { ok: boolean; label: string }[] = [
    { ok: readiness.siteLocationSet, label: "מיקום אתר" },
    { ok: readiness.primaryForemanSet, label: "מנהל עבודה" },
    { ok: readiness.coordinatorSet, label: "רכז" },
    { ok: readiness.opsManagerSet, label: "מנהל תפעול" },
    { ok: readiness.workersAdded, label: "רשימת עובדים" },
  ];
  return (
    <div className="enterprise-card flex flex-wrap gap-2 p-3">
      {items.map((it) => (
        <span
          key={it.label}
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${
            it.ok
              ? "border-status-approved/30 bg-status-approved/10 text-status-approved"
              : "border-border bg-muted text-muted-foreground"
          }`}
        >
          {it.ok ? (
            <CheckCircleIcon sx={{ fontSize: 14 }} />
          ) : (
            <RadioButtonUncheckedIcon sx={{ fontSize: 14 }} />
          )}
          {it.label}
        </span>
      ))}
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ sx?: object; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="enterprise-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon sx={{ fontSize: 18 }} className="text-primary" />
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary disabled:opacity-60"
      />
    </label>
  );
}

// ── Contractor side: site location + foremen ───────────────────────────────
function ContractorSection({
  detail,
  editable,
  onChanged,
}: {
  detail: Detail;
  editable: boolean;
  onChanged: () => void;
}) {
  const project = detail.project as any;
  const setSiteFn = useServerFn(setProjectSiteLocation);
  const provisionFn = useServerFn(provisionProjectMember);
  const removeFn = useServerFn(removeProjectMember);

  const [address, setAddress] = useState(project.address ?? "");
  const [lat, setLat] = useState<string>(project.site_lat != null ? String(project.site_lat) : "");
  const [lng, setLng] = useState<string>(project.site_lng != null ? String(project.site_lng) : "");
  const [radius, setRadius] = useState<string>(String(project.site_radius_meters ?? 200));
  const [foremanName, setForemanName] = useState("");
  const [foremanPhone, setForemanPhone] = useState("");

  const captureGps = () => {
    if (!navigator.geolocation) {
      toast.error("הדפדפן אינו תומך באיתור מיקום");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        toast.success("המיקום נלכד");
      },
      () => toast.error("לא ניתן לאתר מיקום — אשר הרשאת מיקום ונסה שוב"),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const saveSite = useMutation({
    mutationFn: () =>
      setSiteFn({
        data: {
          projectId: project.id,
          siteLat: Number(lat),
          siteLng: Number(lng),
          radiusMeters: Number(radius) || 200,
          address: address || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("מיקום האתר נשמר");
      onChanged();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "שמירת המיקום נכשלה"),
  });

  const addForeman = useMutation({
    mutationFn: () =>
      provisionFn({
        data: {
          projectId: project.id,
          role: "site_manager",
          name: foremanName.trim(),
          phone: foremanPhone.trim(),
        },
      }),
    onSuccess: () => {
      toast.success("מנהל העבודה נוסף — יקבל גישה בכניסה עם הטלפון");
      setForemanName("");
      setForemanPhone("");
      onChanged();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "הוספת מנהל העבודה נכשלה"),
  });

  const removeForeman = useMutation({
    mutationFn: (memberId: string) => removeFn({ data: { memberId } }),
    onSuccess: () => {
      toast.success("הוסר");
      onChanged();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "ההסרה נכשלה"),
  });

  return (
    <SectionCard title="צד הקבלן — אתר ומנהלי עבודה" icon={PlaceIcon}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="כתובת האתר" value={address} onChange={setAddress} disabled={!editable} />
        <div className="grid grid-cols-[1fr_auto] items-end gap-2">
          <Field
            label="רדיוס נוכחות (מטר)"
            type="number"
            value={radius}
            onChange={setRadius}
            disabled={!editable}
          />
          {editable && (
            <Button type="button" variant="outline" size="sm" onClick={captureGps} className="h-9">
              <MyLocationIcon sx={{ fontSize: 16 }} className="ml-1" />
              לכוד GPS
            </Button>
          )}
        </div>
        <Field label="קו רוחב (lat)" value={lat} onChange={setLat} disabled={!editable} />
        <Field label="קו אורך (lng)" value={lng} onChange={setLng} disabled={!editable} />
      </div>
      {project.geofence_enforced === false && (
        <p className="mt-2 text-xs text-muted-foreground">
          אכיפת מיקום (גדר וירטואלית) תופעל בהמשך — בשלב זה המיקום נשמר לתיעוד בלבד.
        </p>
      )}
      {editable && (
        <Button
          className="mt-3"
          size="sm"
          disabled={saveSite.isPending || !lat || !lng}
          onClick={() => saveSite.mutate()}
        >
          שמור מיקום אתר
        </Button>
      )}

      <div className="mt-5 border-t border-border pt-4">
        <h3 className="mb-2 text-xs font-semibold text-muted-foreground">
          מנהלי עבודה בשטח (ראשי + מחליף)
        </h3>
        <div className="space-y-1.5">
          {detail.foremen.length === 0 && (
            <p className="text-sm text-muted-foreground">טרם הוגדרו מנהלי עבודה.</p>
          )}
          {detail.foremen.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <span>
                <span className="font-medium">{f.name}</span>
                <span className="mr-2 text-muted-foreground">{f.phone}</span>
              </span>
              {editable && (
                <button
                  onClick={() => removeForeman.mutate(f.id)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="הסר"
                >
                  <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                </button>
              )}
            </div>
          ))}
        </div>
        {editable && detail.foremen.length < 2 && (
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label="שם מנהל עבודה" value={foremanName} onChange={setForemanName} />
            <Field
              label="טלפון"
              value={foremanPhone}
              onChange={setForemanPhone}
              placeholder="05X-XXXXXXX"
            />
            <Button
              size="sm"
              className="h-9"
              disabled={
                addForeman.isPending ||
                foremanName.trim().length < 2 ||
                foremanPhone.trim().length < 8
              }
              onClick={() => addForeman.mutate()}
            >
              <AddIcon sx={{ fontSize: 16 }} className="ml-1" />
              הוסף
            </Button>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

// ── Corporation side: coordinator + ops manager + worker roster ────────────
function CorporationSection({
  detail,
  editable,
  onChanged,
}: {
  detail: Detail;
  editable: boolean;
  onChanged: () => void;
}) {
  const project = detail.project as any;
  const provisionFn = useServerFn(provisionProjectMember);
  const saveWorkersFn = useServerFn(saveProjectWorkers);
  const removeWorkerFn = useServerFn(removeProjectWorker);

  const [coordName, setCoordName] = useState(detail.coordinator?.name ?? "");
  const [coordPhone, setCoordPhone] = useState(detail.coordinator?.phone ?? "");
  const [opsName, setOpsName] = useState(detail.opsManager?.name ?? "");
  const [opsPhone, setOpsPhone] = useState(detail.opsManager?.phone ?? "");
  const [newWorker, setNewWorker] = useState({ first: "", last: "", passport: "", nat: "" });

  const provision = (role: "team_leader" | "operations_manager", name: string, phone: string) =>
    provisionFn({ data: { projectId: project.id, role, name: name.trim(), phone: phone.trim() } });

  const saveCoord = useMutation({
    mutationFn: () => provision("team_leader", coordName, coordPhone),
    onSuccess: () => {
      toast.success("הרכז נשמר ויקבל גישה בכניסה עם הטלפון");
      onChanged();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "שמירת הרכז נכשלה"),
  });
  const saveOps = useMutation({
    mutationFn: () => provision("operations_manager", opsName, opsPhone),
    onSuccess: () => {
      toast.success("מנהל התפעול נשמר ויקבל גישה בכניסה עם הטלפון");
      onChanged();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "שמירת מנהל התפעול נכשלה"),
  });

  const addWorker = useMutation({
    mutationFn: () =>
      saveWorkersFn({
        data: {
          projectId: project.id,
          workers: [
            {
              firstName: newWorker.first.trim(),
              lastName: newWorker.last.trim(),
              passportNumber: newWorker.passport.trim(),
              nationality: newWorker.nat.trim() || undefined,
            },
          ],
        },
      }),
    onSuccess: () => {
      toast.success("העובד נוסף לרשימה");
      setNewWorker({ first: "", last: "", passport: "", nat: "" });
      onChanged();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "הוספת העובד נכשלה"),
  });

  const removeWorker = useMutation({
    mutationFn: (workerId: string) => removeWorkerFn({ data: { projectId: project.id, workerId } }),
    onSuccess: () => onChanged(),
    onError: (e) => toast.error(e instanceof Error ? e.message : "ההסרה נכשלה"),
  });

  return (
    <SectionCard title="צד התאגיד — רכז, מנהל תפעול ועובדים" icon={GroupIcon}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-md border border-border p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <GroupIcon sx={{ fontSize: 15 }} /> רכז (דיווח נוכחות יומי)
          </div>
          <div className="space-y-2">
            <Field label="שם" value={coordName} onChange={setCoordName} disabled={!editable} />
            <Field
              label="טלפון"
              value={coordPhone}
              onChange={setCoordPhone}
              disabled={!editable}
              placeholder="05X-XXXXXXX"
            />
            {editable && (
              <Button
                size="sm"
                disabled={
                  saveCoord.isPending || coordName.trim().length < 2 || coordPhone.trim().length < 8
                }
                onClick={() => saveCoord.mutate()}
              >
                {detail.coordinator ? "עדכן רכז" : "הוסף רכז"}
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-md border border-border p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <EngineeringIcon sx={{ fontSize: 15 }} /> מנהל תפעול (מעקב ותקשורת)
          </div>
          <div className="space-y-2">
            <Field label="שם" value={opsName} onChange={setOpsName} disabled={!editable} />
            <Field
              label="טלפון"
              value={opsPhone}
              onChange={setOpsPhone}
              disabled={!editable}
              placeholder="05X-XXXXXXX"
            />
            {editable && (
              <Button
                size="sm"
                disabled={
                  saveOps.isPending || opsName.trim().length < 2 || opsPhone.trim().length < 8
                }
                onClick={() => saveOps.mutate()}
              >
                {detail.opsManager ? "עדכן מנהל תפעול" : "הוסף מנהל תפעול"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <BadgeIcon sx={{ fontSize: 15 }} /> רשימת עובדים ({detail.workers.length})
        </h3>
        <div className="space-y-1.5">
          {detail.workers.length === 0 && (
            <p className="text-sm text-muted-foreground">טרם נוספו עובדים.</p>
          )}
          {detail.workers.map((w: any) => (
            <div
              key={w.id}
              className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <span>
                <span className="font-medium">
                  {w.first_name} {w.last_name}
                </span>
                <span className="mr-2 text-muted-foreground">דרכון: {w.passport_number}</span>
                {w.nationality && (
                  <span className="mr-2 text-muted-foreground">{w.nationality}</span>
                )}
                {w.added_by_role === "coordinator" && (
                  <span className="mr-2 inline-block rounded border border-amber-400/40 bg-amber-500/10 px-1.5 py-px text-[10px] font-semibold text-amber-500">
                    נוסף ע״י הרכז
                  </span>
                )}
              </span>
              {editable && (
                <button
                  onClick={() => removeWorker.mutate(w.id)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="הסר"
                >
                  <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                </button>
              )}
            </div>
          ))}
        </div>
        {editable && (
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] sm:items-end">
            <Field
              label="שם פרטי"
              value={newWorker.first}
              onChange={(v) => setNewWorker((s) => ({ ...s, first: v }))}
            />
            <Field
              label="שם משפחה"
              value={newWorker.last}
              onChange={(v) => setNewWorker((s) => ({ ...s, last: v }))}
            />
            <Field
              label="מס' דרכון"
              value={newWorker.passport}
              onChange={(v) => setNewWorker((s) => ({ ...s, passport: v }))}
            />
            <Field
              label="לאום (לא חובה)"
              value={newWorker.nat}
              onChange={(v) => setNewWorker((s) => ({ ...s, nat: v }))}
            />
            <Button
              size="sm"
              className="h-9"
              disabled={
                addWorker.isPending ||
                !newWorker.first.trim() ||
                !newWorker.last.trim() ||
                newWorker.passport.trim().length < 3
              }
              onClick={() => addWorker.mutate()}
            >
              <AddIcon sx={{ fontSize: 16 }} className="ml-1" />
              הוסף
            </Button>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
