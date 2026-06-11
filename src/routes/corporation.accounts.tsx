import { createFileRoute } from "@tanstack/react-router";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import { ComingSoonPage } from "@/components/coming-soon-page";

export const Route = createFileRoute("/corporation/accounts")({
  component: () => (
    <ComingSoonPage
      title="חשבונות וחשבוניות"
      description="חשבונית חודשית מגובה בנתוני נוכחות — נבנית אוטומטית מרגע שהצוותים מתחילים לדווח."
      bullets={[
        "חשבון יומי מצטבר לכל פרויקט",
        "חשבונית חודשית מוכנה ומגובה בראיות",
        "פירוט שעות מאושרות מול שעות במחלוקת",
      ]}
      icon={ReceiptLongIcon}
    />
  ),
});
