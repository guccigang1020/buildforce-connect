import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

const ALLOWED_EMAIL = "chmv1243@gmail.com";

export const Route = createFileRoute("/admin-setup")({
  component: AdminSetupPage,
});

function AdminSetupPage() {
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen grid place-items-center bg-background text-foreground">
        <p>טוען…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div dir="rtl" className="min-h-screen grid place-items-center bg-background text-foreground">
        <div className="text-center space-y-4">
          <p className="text-lg">יש להתחבר תחילה</p>
          <Link to="/login" className="text-primary underline">התחברות</Link>
        </div>
      </div>
    );
  }

  const isAllowed = (user.email ?? "").toLowerCase() === ALLOWED_EMAIL;

  if (!isAllowed) {
    return (
      <div dir="rtl" className="min-h-screen grid place-items-center bg-background text-foreground">
        <p className="text-xl font-semibold">אין הרשאה</p>
      </div>
    );
  }

  const handleMakeAdmin = async () => {
    setBusy(true);
    setError(null);
    try {
      const { error: roleErr } = await supabase
        .from("user_roles")
        .insert({ user_id: user.id, role: "admin" });
      if (roleErr && !roleErr.message.toLowerCase().includes("duplicate")) {
        throw roleErr;
      }
      const { error: profErr } = await supabase
        .from("profiles")
        .update({ verification_status: "approved", is_verified: true })
        .eq("user_id", user.id);
      if (profErr) throw profErr;
      setDone(true);
    } catch (e: any) {
      setError(e?.message ?? "שגיאה");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen grid place-items-center bg-background text-foreground p-6">
      <div className="max-w-md w-full text-center space-y-6 rounded-2xl border border-border p-8">
        <h1 className="text-2xl font-semibold">הגדרת אדמין</h1>
        {done ? (
          <div className="space-y-4">
            <p className="text-lg">✅ אתה עכשיו אדמין</p>
            <Link to="/admin" className="inline-block text-primary underline">
              כניסה לפאנל האדמין
            </Link>
          </div>
        ) : (
          <>
            <p className="text-muted-foreground">{user.email}</p>
            <Button onClick={handleMakeAdmin} disabled={busy} className="w-full">
              {busy ? "מגדיר…" : "הגדר אותי כאדמין"}
            </Button>
            {error && <p className="text-destructive text-sm">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}