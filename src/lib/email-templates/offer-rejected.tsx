import * as React from "react";
import { Body, Container, Head, Heading, Html, Preview, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";

const SITE_NAME = "BuildForce Prime";

const OfferRejectedEmail = () => (
  <Html lang="he" dir="rtl">
    <Head />
    <Preview>הבקשה נסגרה והוענקה לתאגיד אחר</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>הבקשה נסגרה</Heading>
        <Text style={text}>תודה שהגשת הצעה ב-{SITE_NAME}. הקבלן בחר הפעם הצעה אחרת.</Text>
        <Text style={text}>
          אנו מזמינים אותך להמשיך לעקוב אחרי בקשות חדשות שמתאימות לפרופיל שלך.
        </Text>
        <Text style={footer}>צוות {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: OfferRejectedEmail,
  subject: "עדכון על הבקשה — BuildForce",
  displayName: "הצעה לא נבחרה",
  previewData: {},
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Heebo, Arial, sans-serif" };
const container = { padding: "24px 28px", maxWidth: "560px" };
const h1 = { fontSize: "24px", fontWeight: "bold" as const, color: "#0b1736", margin: "0 0 20px" };
const text = { fontSize: "15px", color: "#4a5568", lineHeight: "1.6", margin: "0 0 18px" };
const footer = {
  fontSize: "13px",
  color: "#a0aec0",
  margin: "32px 0 0",
  borderTop: "1px solid #e2e8f0",
  paddingTop: "16px",
};
