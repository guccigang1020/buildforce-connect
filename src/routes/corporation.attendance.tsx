import { createFileRoute } from "@tanstack/react-router";
import { HardHat } from "lucide-react";
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
      icon={HardHat}
    />
  ),
});
