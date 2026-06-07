import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  pricePerHour?: number;
  workersCount?: number;
  startDate?: string;
  requestId?: string;
}
const SITE_NAME = "BuildForce Prime";
const SITE_URL = "https://buildforceprime.com";

const OfferSubmittedEmail = ({ pricePerHour, workersCount, startDate, requestId }: Props) => (
  <Html lang="he" dir="rtl">
    <Head />
    <Preview>הצעה חדשה התקבלה לבקשה שלך</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>התקבלה הצעה חדשה</Heading>
        <Text style={text}>תאגיד מאומת הגיש הצעה לבקשה שפרסמת ב-{SITE_NAME}.</Text>
        <table style={table}>
          <tbody>
            {pricePerHour ? (
              <tr>
                <td style={tdLabel}>מחיר לשעה</td>
                <td style={tdValue}>{pricePerHour} ₪</td>
              </tr>
            ) : null}
            {workersCount ? (
              <tr>
                <td style={tdLabel}>עובדים זמינים</td>
                <td style={tdValue}>{workersCount}</td>
              </tr>
            ) : null}
            {startDate ? (
              <tr>
                <td style={tdLabel}>תאריך התחלה</td>
                <td style={tdValue}>{startDate}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <Text style={text}>היכנס לפלטפורמה כדי להשוות הצעות ולבחור את המתאימה ביותר.</Text>
        <Button
          style={button}
          href={requestId ? `${SITE_URL}/requests/${requestId}` : `${SITE_URL}/dashboard`}
        >
          צפה בהצעות
        </Button>
        <Text style={footer}>צוות {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: OfferSubmittedEmail,
  subject: "הצעה חדשה לבקשה שלך — BuildForce",
  displayName: "הצעה חדשה התקבלה",
  previewData: { pricePerHour: 78, workersCount: 8, startDate: "15/06/2026", requestId: "demo" },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Heebo, Arial, sans-serif" };
const container = { padding: "24px 28px", maxWidth: "560px" };
const h1 = { fontSize: "24px", fontWeight: "bold" as const, color: "#0b1736", margin: "0 0 20px" };
const text = { fontSize: "15px", color: "#4a5568", lineHeight: "1.6", margin: "0 0 18px" };
const table = { width: "100%", margin: "16px 0", borderCollapse: "collapse" as const };
const tdLabel = { padding: "8px 0", fontSize: "13px", color: "#718096" };
const tdValue = {
  padding: "8px 0",
  fontSize: "14px",
  color: "#0b1736",
  fontWeight: 600 as const,
  textAlign: "left" as const,
};
const button = {
  backgroundColor: "#0b1736",
  color: "#ffffff",
  padding: "12px 24px",
  borderRadius: "8px",
  fontSize: "14px",
  fontWeight: "bold" as const,
  textDecoration: "none",
  display: "inline-block",
};
const footer = {
  fontSize: "13px",
  color: "#a0aec0",
  margin: "32px 0 0",
  borderTop: "1px solid #e2e8f0",
  paddingTop: "16px",
};
