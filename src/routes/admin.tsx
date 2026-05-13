import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck, Users, FileCheck2, FileX2, Loader2, ExternalLink, Search, Building2, HardHat } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { adminSetVerificationStatus, adminToggleRole, adminGetDocumentUrl } from "@/lib/admin.functions";
import { sendTransactionalEmail } from "@/lib/email/send";
import { useAuth } from "@/hooks/use-auth";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

type AdminProfile = {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  business_name: string | null;
  business_id: string | null;
  company_name: string | null;
  city: string | null;
  contractor_license_number: string | null;
  contractor_classification: string | null;
  verification_status: "pending" | "approved" | "rejected";
  is_verified: boolean;
  license_doc_url: string | null;
  insurance_doc_url: string | null;
  books_cert_url: string | null;
  admin_notes: string | null;
  created_at: string;
  email: string | null;
};

function AdminPage() {
  const { hasRole, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !hasRole("admin")) {
      toast.error("אין לך הרשאת אדמין");
      navigate({ to: "/" });
    }
  }, [loading, hasRole, navigate]);

  if (loading || !hasRole("admin")) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNav />
        <div className="grid place-items-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return <AdminDashboard />;
}

function AdminDashboard() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("pending");

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AdminProfile[];
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role");
      if (error) throw error;
      return data ?? [];
    },
  });

  const rolesByUser = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const r of roles) {
      const arr = m.get(r.user_id) ?? [];
      arr.push(r.role);
      m.set(r.user_id, arr);
    }
    return m;
  }, [roles]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return profiles.filter((p) => {
      if (tab === "pending" && p.verification_status !== "pending") return false;
      if (tab === "approved" && p.verification_status !== "approved") return false;
      if (tab === "rejected" && p.verification_status !== "rejected") return false;
      if (!q) return true;
      return [p.full_name, p.business_name, p.business_id, p.contractor_license_number, p.phone, p.city]
        .some((v) => v?.toLowerCase().includes(q));
    });
  }, [profiles, tab, search]);

  const stats = useMemo(() => ({
    total: profiles.length,
    pending: profiles.filter((p) => p.verification_status === "pending").length,
    approved: profiles.filter((p) => p.verification_status === "approved").length,
    rejected: profiles.filter((p) => p.verification_status === "rejected").length,
  }), [profiles]);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["admin-profiles"] });
    void qc.invalidateQueries({ queryKey: ["admin-roles"] });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-primary shadow-elegant">
            <ShieldCheck className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">דשבורד אדמין</h1>
            <p className="text-sm text-muted-foreground">ניהול משתמשים, אימות תאגידים וקבלנים</p>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="סה״כ משתמשים" value={stats.total} icon={<Users className="h-5 w-5" />} />
          <StatCard label="ממתינים לאישור" value={stats.pending} icon={<Loader2 className="h-5 w-5" />} highlight />
          <StatCard label="מאושרים" value={stats.approved} icon={<FileCheck2 className="h-5 w-5" />} />
          <StatCard label="נדחו" value={stats.rejected} icon={<FileX2 className="h-5 w-5" />} />
        </div>

        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="pending">ממתינים ({stats.pending})</TabsTrigger>
              <TabsTrigger value="approved">מאושרים ({stats.approved})</TabsTrigger>
              <TabsTrigger value="rejected">נדחו ({stats.rejected})</TabsTrigger>
              <TabsTrigger value="all">הכל ({stats.total})</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative w-full md:w-72">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="חיפוש לפי שם / ח.פ / רישיון..." className="pr-10" />
          </div>
        </div>

        {isLoading ? (
          <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">אין משתמשים בקטגוריה זו</Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((p) => (
              <UserRow key={p.id} profile={p} roles={rolesByUser.get(p.user_id) ?? []} onChange={refresh} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, icon, highlight }: { label: string; value: number; icon: React.ReactNode; highlight?: boolean }) {
  return (
    <Card className={`p-4 ${highlight && value > 0 ? "border-primary/50 bg-primary/5" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <div className="mt-1 text-3xl font-extrabold">{value}</div>
    </Card>
  );
}

function UserRow({ profile, roles, onChange }: { profile: AdminProfile; roles: string[]; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const isContractor = roles.includes("contractor");
  const isCorporation = roles.includes("corporation");
  const isAdmin = roles.includes("admin");

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold">{profile.full_name}</h3>
            <StatusBadge status={profile.verification_status} />
            {isAdmin && <Badge variant="outline" className="border-primary/50 text-primary">אדמין</Badge>}
            {isCorporation && <Badge variant="secondary"><Building2 className="me-1 h-3 w-3" /> תאגיד</Badge>}
            {isContractor && <Badge variant="secondary"><HardHat className="me-1 h-3 w-3" /> קבלן/יזם</Badge>}
          </div>
          <div className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
            {profile.business_name && <span>עסק: <span className="text-foreground">{profile.business_name}</span></span>}
            {profile.business_id && <span>ח.פ: <span className="text-foreground">{profile.business_id}</span></span>}
            {profile.contractor_license_number && <span>רישיון קבלן: <span className="text-foreground">{profile.contractor_license_number}</span></span>}
            {profile.contractor_classification && <span>סיווג: <span className="text-foreground">{profile.contractor_classification}</span></span>}
            {profile.phone && <span>טלפון: <span className="text-foreground">{profile.phone}</span></span>}
            {profile.city && <span>עיר: <span className="text-foreground">{profile.city}</span></span>}
          </div>
        </div>
        <Button onClick={() => setOpen(true)} variant="outline" size="sm">פתח לבדיקה</Button>
      </div>
      {open && <ReviewDialog profile={profile} roles={roles} onClose={() => setOpen(false)} onChange={onChange} />}
    </Card>
  );
}

function StatusBadge({ status }: { status: AdminProfile["verification_status"] }) {
  if (status === "approved") return <Badge className="bg-green-500/15 text-green-400 hover:bg-green-500/20">מאושר</Badge>;
  if (status === "rejected") return <Badge className="bg-red-500/15 text-red-400 hover:bg-red-500/20">נדחה</Badge>;
  return <Badge className="bg-amber-500/15 text-amber-400 hover:bg-amber-500/20">ממתין</Badge>;
}

function ReviewDialog({ profile, roles, onClose, onChange }: { profile: AdminProfile; roles: string[]; onClose: () => void; onChange: () => void }) {
  const [notes, setNotes] = useState(profile.admin_notes ?? "");
  const [busy, setBusy] = useState(false);
  const [docs, setDocs] = useState<{ label: string; url: string | null }[]>([]);
  const setStatusFn = useServerFn(adminSetVerificationStatus);
  const toggleRoleFn = useServerFn(adminToggleRole);
  const getDocUrlFn = useServerFn(adminGetDocumentUrl);

  useEffect(() => {
    const load = async () => {
      const items: { label: string; path: string | null }[] = [
        { label: "תעודת קבלן רשום", path: profile.license_doc_url },
        { label: "ביטוח צד ג׳", path: profile.insurance_doc_url },
        { label: "אישור ניהול ספרים", path: profile.books_cert_url },
      ];
      const resolved = await Promise.all(
        items.map(async (it) => {
          if (!it.path) return { label: it.label, url: null };
          try {
            const res = await getDocUrlFn({ data: { path: it.path } });
            return { label: it.label, url: res.url };
          } catch {
            return { label: it.label, url: null };
          }
        }),
      );
      setDocs(resolved);
    };
    void load();
  }, [profile, getDocUrlFn]);

  const setStatus = async (status: "approved" | "rejected") => {
    setBusy(true);
    try {
      await setStatusFn({ data: { profileId: profile.id, status, notes: notes || null } });
    } catch (e) {
      setBusy(false);
      toast.error(e instanceof Error ? e.message : "שגיאה");
      return;
    }
    setBusy(false);
    if (profile.email) {
      try {
        await sendTransactionalEmail({
          templateName: status === "approved" ? "contractor-approved" : "contractor-rejected",
          recipientEmail: profile.email,
          idempotencyKey: `${status}-${profile.id}`,
          templateData: status === "approved"
            ? { name: profile.full_name }
            : { name: profile.full_name, reason: notes || undefined },
        });
      } catch (e) {
        console.warn("Email send failed (non-blocking)", e);
      }
    }
    toast.success(status === "approved" ? "המשתמש אושר" : "המשתמש נדחה");
    onChange();
    onClose();
  };

  const toggleRole = async (role: "corporation" | "admin") => {
    setBusy(true);
    const action = roles.includes(role) ? "remove" : "add";
    try {
      await toggleRoleFn({ data: { targetUserId: profile.user_id, role, action } });
      toast.success(action === "add" ? "נוסף תפקיד " + role : "הוסר תפקיד " + role);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "שגיאה");
    }
    setBusy(false);
    onChange();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>בדיקת משתמש: {profile.full_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <section>
            <h4 className="mb-2 font-semibold">פרטי עסק</h4>
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/60 bg-muted/30 p-3">
              <Field label="שם עסק" value={profile.business_name} />
              <Field label="ח.פ / ע.מ" value={profile.business_id} />
              <Field label="רישיון קבלן" value={profile.contractor_license_number} />
              <Field label="סיווג" value={profile.contractor_classification} />
              <Field label="טלפון" value={profile.phone} />
              <Field label="עיר" value={profile.city} />
            </div>
          </section>

          <section>
            <h4 className="mb-2 font-semibold">מסמכים</h4>
            <div className="space-y-2">
              {docs.map((d) => (
                <div key={d.label} className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                  <span>{d.label}</span>
                  {d.url ? (
                    <a href={d.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                      <ExternalLink className="h-4 w-4" /> צפה
                    </a>
                  ) : (
                    <span className="text-muted-foreground">לא הועלה</span>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h4 className="mb-2 font-semibold">הערות אדמין</h4>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="סיבת דחייה / הערות פנימיות..." />
          </section>

          <section>
            <h4 className="mb-2 font-semibold">תפקידים</h4>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={roles.includes("corporation") ? "default" : "outline"} onClick={() => toggleRole("corporation")} disabled={busy}>
                {roles.includes("corporation") ? "הסר תאגיד" : "הפוך לתאגיד"}
              </Button>
              <Button size="sm" variant={roles.includes("admin") ? "default" : "outline"} onClick={() => toggleRole("admin")} disabled={busy}>
                {roles.includes("admin") ? "הסר אדמין" : "הפוך לאדמין"}
              </Button>
            </div>
          </section>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>סגור</Button>
          <Button variant="destructive" onClick={() => setStatus("rejected")} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><FileX2 className="me-1 h-4 w-4" /> דחה</>}
          </Button>
          <Button onClick={() => setStatus("approved")} disabled={busy} className="bg-gradient-primary">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><FileCheck2 className="me-1 h-4 w-4" /> אשר</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value || "—"}</div>
    </div>
  );
}
