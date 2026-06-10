import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { ComingSoonPage } from "@/components/coming-soon-page";

// Full implementation (entry/exit approval, exceptions, corrections, audit
// trail) exists in git history — gated until the field pilot.
export const Route = createFileRoute("/contractor/attendance")({
  component: () => (
    <ComingSoonPage
      title="נוכחות"
      description="אישור נוכחות יומי של הצוותים באתר — כל שעת עבודה מתועדת ב-GPS ותמונה."
      bullets={[
        "צ'ק-אין וצ'ק-אאוט יומי של ראש הצוות עם GPS ותמונה",
        "אישור או דחייה של דיווחי נוכחות",
        "דיווח חריגים ובקשות תיקון עם תיעוד מלא",
      ]}
      icon={CheckCircle2}
    />
  ),
});
