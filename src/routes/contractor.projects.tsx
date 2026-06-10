import { createFileRoute } from "@tanstack/react-router";
import { FolderOpen } from "lucide-react";
import { ComingSoonPage } from "@/components/coming-soon-page";

// Full implementation (site geofence, site manager, teams + QR) exists in git
// history — gated until the attendance pilot is ready for the field.
export const Route = createFileRoute("/contractor/projects")({
  component: () => (
    <ComingSoonPage
      title="פרויקטים ואתרים"
      description="ניהול הפרויקטים שנפתחו מהמכרזים שזכו: הגדרת אתר, מנהל עבודה וצוותים."
      bullets={[
        "פתיחת פרויקט אוטומטית מכל מכרז שהוכרז בו זוכה",
        "הגדרת מיקום האתר ורדיוס נוכחות (GPS)",
        "צוותי עבודה עם קוד QR לראש הצוות",
      ]}
      icon={FolderOpen}
    />
  ),
});
