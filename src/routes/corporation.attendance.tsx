import { createFileRoute } from "@tanstack/react-router";
import EngineeringIcon from "@mui/icons-material/Engineering";
import { ComingSoonPage } from "@/components/coming-soon-page";

// Corporation-side attendance review exists in git history — gated until the
// field pilot.
export const Route = createFileRoute("/corporation/attendance")({
  component: () => (
    <ComingSoonPage
      title="נוכחות צוותים"
      description="מעקב אחרי דיווחי הנוכחות של הצוותים שלך בפרויקטים פעילים."
      bullets={[
        "סטטוס נוכחות יומי לכל צוות ופרויקט",
        "התראות על חריגים ודחיות",
        "סיכום חודשי של שעות ועלויות",
      ]}
      icon={EngineeringIcon}
    />
  ),
});
