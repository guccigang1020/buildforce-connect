import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "bf_cookie_consent_v1";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      // ignore (private mode etc.)
    }
  }, []);

  const decide = (value: "accepted" | "rejected") => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ value, at: Date.now() }));
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="הסכמה לקוקיז"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl rounded-2xl border border-border/60 bg-card/95 p-4 shadow-elegant backdrop-blur md:p-5"
      dir="rtl"
    >
      <div className="flex flex-wrap items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
          <Cookie className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 text-sm">
          <div className="font-bold">אנחנו משתמשים בעוגיות</div>
          <p className="mt-1 text-xs text-muted-foreground">
            אנו משתמשים בעוגיות חיוניות לתפעול האתר ובעוגיות אופציונליות לשיפור החוויה. ניתן לקרוא ב
            <Link to="/privacy" className="underline hover:text-foreground">
              מדיניות הפרטיות
            </Link>{" "}
            שלנו.
          </p>
        </div>
        <button
          onClick={() => decide("rejected")}
          aria-label="סגור"
          className="absolute left-3 top-3 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => decide("rejected")}>
          דחה לא-חיוניות
        </Button>
        <Button
          size="sm"
          className="bg-gradient-primary text-primary-foreground"
          onClick={() => decide("accepted")}
        >
          אשר הכל
        </Button>
      </div>
    </div>
  );
}
