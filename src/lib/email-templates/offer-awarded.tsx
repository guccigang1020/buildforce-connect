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
  contactName?: string;
  contactPhone?: string;
  location?: string;
  startDate?: string;
  requestId?: string;
}
const SITE_NAME = "BuildForce Prime";
const SITE_URL = "https://buildforceprime.com";

const OfferAwardedEmail = ({
  contactName,
  contactPhone,
  location,
  startDate,
  requestId,
}: Props) => (
  <Html lang="he" dir="rtl">
    <Head />
    <Preview>זכית בבקשת עבודה!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>מזל טוב — זכית בבקשה</Heading>
        <Text style={text}>
          הצעתך נבחרה ב-{SITE_NAME}. להלן פרטי הקשר של הקבלן ליצירת קשר ישיר:
        </Text>
        <table style={table}>
          <tbody>
            {contactName ? (
              <tr>
                <td style={tdLabel}>איש קשר</td>
                <td style={tdValue}>{contactName}</td>
              </tr>
            ) : null}
            {contactPhone ? (
              <tr>
                <td style={tdLabel}>טלפון</td>
                <td style={tdValue}>{contactPhone}</td>
              </tr>
            ) : null}
            {location ? (
              <tr>
                <td style={tdLabel}>מיקום</td>
                <td style={tdValue}>{location}</td>
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
        <Text style={text}>
          יש להגיע למפגש תיאום עם הקבלן תוך 48 שעות. כל תקשורת מסחרית חייבת לעבור דרך הפלטפורמה.
        </Text>
        <Button
          style={button}
          href={requestId ? `${SITE_URL}/requests/${requestId}` : `${SITE_URL}/dashboard`}
        >
          פרטי הבקשה
        </Button>
        <Text style={footer}>צוות {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: OfferAwardedEmail,
  subject: "זכית בבקשה ב-BuildForce",
  displayName: "זכייה במכרז",
  previewData: {
    contactName: "דני כהן",
    contactPhone: "050-1234567",
    location: "תל אביב",
    startDate: "15/06/2026",
    requestId: "demo",
  },
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
