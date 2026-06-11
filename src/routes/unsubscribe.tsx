import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import UnsubscribeIcon from "@mui/icons-material/Unsubscribe";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import BlockIcon from "@mui/icons-material/Block";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/unsubscribe")({
  component: UnsubscribePage,
  validateSearch: (s: Record<string, unknown>) => ({
    token: typeof s.token === "string" ? s.token : "",
  }),
});

function UnsubscribePage() {
  const { token } = Route.useSearch();
  const [state, setState] = useState<
    "loading" | "ready" | "already" | "invalid" | "success" | "error"
  >("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) return setState("invalid");
        if (d.valid === false && d.reason === "already_unsubscribed") return setState("already");
        if (d.valid) return setState("ready");
        setState("invalid");
      })
      .catch(() => setState("error"));
  }, [token]);

  const confirm = async () => {
    setBusy(true);
    try {
      const r = await fetch("/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const d = await r.json().catch(() => ({}));
      if (d.success) setState("success");
      else if (d.reason === "already_unsubscribed") setState("already");
      else setState("error");
    } catch {
      setState("error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <SiteNav />
      <main className="mx-auto flex min-h-[calc(100vh-72px)] max-w-md items-center px-4 py-12">
        <div className="w-full">
          <div className="rounded-3xl border border-border/60 bg-card/60 p-8 text-center shadow-elegant backdrop-blur-sm">
            {state === "loading" && (
              <>
                <CircularProgress size={32} color="inherit" className="mx-auto text-primary" />
                <p className="mt-4 text-sm text-muted-foreground">בודק את הבקשה…</p>
              </>
            )}
            {state === "ready" && (
              <>
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary">
                  <UnsubscribeIcon sx={{ fontSize: 28 }} />
                </div>
                <h1 className="mt-4 text-2xl font-extrabold">ביטול קבלת מיילים</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  לחץ לאישור כדי להפסיק לקבל מיילים שיווקיים מ-BuildForce.
                </p>
                <Button
                  onClick={confirm}
                  disabled={busy}
                  size="lg"
                  className="mt-6 w-full bg-gradient-primary text-primary-foreground shadow-elegant"
                >
                  {busy ? (
                    <>
                      <CircularProgress size={16} color="inherit" className="ml-2" /> מבטל…
                    </>
                  ) : (
                    "אישור ביטול"
                  )}
                </Button>
              </>
            )}
            {state === "success" && (
              <>
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-500">
                  <CheckCircleIcon sx={{ fontSize: 28 }} />
                </div>
                <h1 className="mt-4 text-2xl font-extrabold">בוטל בהצלחה</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  לא תקבל יותר מיילים שיווקיים מאיתנו.
                </p>
                <Button asChild variant="outline" className="mt-6">
                  <Link to="/">חזרה לדף הבית</Link>
                </Button>
              </>
            )}
            {state === "already" && (
              <>
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
                  <BlockIcon sx={{ fontSize: 28 }} />
                </div>
                <h1 className="mt-4 text-2xl font-extrabold">כבר בוטלת</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  הכתובת הזו כבר הוסרה מהרשימה.
                </p>
              </>
            )}
            {state === "invalid" && (
              <>
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-destructive/15 text-destructive">
                  <WarningAmberIcon sx={{ fontSize: 28 }} />
                </div>
                <h1 className="mt-4 text-2xl font-extrabold">קישור לא תקין</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  הקישור פג תוקף או שאינו קיים. אם יש בעיה, צור קשר עם התמיכה.
                </p>
              </>
            )}
            {state === "error" && (
              <>
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-destructive/15 text-destructive">
                  <WarningAmberIcon sx={{ fontSize: 28 }} />
                </div>
                <h1 className="mt-4 text-2xl font-extrabold">שגיאה</h1>
                <p className="mt-2 text-sm text-muted-foreground">נסה שוב מאוחר יותר.</p>
              </>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
