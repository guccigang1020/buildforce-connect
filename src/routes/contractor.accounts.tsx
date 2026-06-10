import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";
import { ComingSoonPage } from "@/components/coming-soon-page";

// Daily-account aggregation + CSV export exist in git history — gated until
// the attendance pipeline that feeds them is live.
export const Route = createFileRoute("/contractor/accounts")({
  component: () => (
    <ComingSoonPage
      title="חשבון יומי"
      description="חשבון יומי שקוף שנבנה אוטומטית מנתוני הנוכחות המאושרים — בלי ויכוחים בסוף החודש."
      bullets={[
        "סיכום יומי: עובדים, שעות ועלות לכל צוות",
        "ייצוא לקובץ CSV להנהלת החשבונות",
        "חשבונית חודשית מגובה בנתוני נוכחות",
      ]}
      icon={ClipboardList}
    />
  ),
});
