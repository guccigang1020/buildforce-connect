import { createFileRoute } from "@tanstack/react-router";
import GroupIcon from "@mui/icons-material/Group";
import ScheduleIcon from "@mui/icons-material/Schedule";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

// The QR check-in flow (GPS + camera + watermarking) exists in git history —
// gated until the field pilot. This route is reachable both with a login and
// via the team QR link (?team=...), so the placeholder must work logged-out
// and standalone (no AppShell).
export const Route = createFileRoute("/team-leader")({
  component: TeamLeaderComingSoon,
});

function TeamLeaderComingSoon() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4" dir="rtl">
      <div className="coming-soon-card w-full max-w-md">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg border border-border bg-muted text-muted-foreground">
          <GroupIcon sx={{ fontSize: 20 }} />
        </div>
        <span className="status-chip-muted mt-4 inline-flex">
          <ScheduleIcon sx={{ fontSize: 12 }} /> בקרוב
        </span>
        <h1 className="mt-3 text-lg font-semibold text-foreground">צ'ק-אין לראשי צוותים</h1>
        <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
          דיווח נוכחות יומי מהאתר — סריקת QR, אימות מיקום וצילום תמונה. בלי
          התקנה ובלי סיסמה.
        </p>
        <div className="mx-auto mt-6 max-w-xs space-y-2 text-right">
          {[
            "סריקת קוד ה-QR של הצוות בתחילת היום",
            "אימות אוטומטי שהדיווח נעשה מהאתר (GPS)",
            "תמונת הצוות כראיה לתחילת וסיום יום העבודה",
          ].map((b) => (
            <div key={b} className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircleIcon sx={{ fontSize: 16 }} className="mt-0.5 shrink-0 text-muted-foreground/50" />
              <span>{b}</span>
            </div>
          ))}
        </div>
        <p className="mt-7 text-xs text-muted-foreground/70">
          היכולת תיפתח בשלב הפיילוט בשטח.
        </p>
      </div>
    </div>
  );
}
