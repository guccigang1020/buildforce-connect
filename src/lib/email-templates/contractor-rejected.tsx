import * as React from "react";
import { Body, Container, Head, Heading, Html, Preview, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  name?: string;
  reason?: string;
}
const SITE_NAME = "BuildForce Prime";

const ContractorRejectedEmail = ({ name, reason }: Props) => (
  <Html lang="he" dir="rtl">
    <Head />
    <Preview>עדכון בנוגע לחשבון שלך</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>החשבון לא אומת</Heading>
        <Text style={text}>
          שלום{name ? ` ${name}` : ""}, לאחר בדיקת המסמכים שצירפת, לא יכולנו לאמת את החשבון שלך ב-
          {SITE_NAME} בשלב זה.
        </Text>
        {reason ? (
          <Text style={text}>
            <strong>סיבה:</strong> {reason}
          </Text>
        ) : null}
        <Text style={text}>
          אתה מוזמן לפנות אלינו לבירור או לעדכן את הפרטים והמסמכים ולנסות שוב.
        </Text>
        <Text style={footer}>צוות {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: ContractorRejectedEmail,
  subject: "עדכון בנוגע לחשבון שלך ב-BuildForce",
  displayName: "דחיית קבלן",
  previewData: { name: "יוסי", reason: "תעודת קבלן רשום חסרה" },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Heebo, Arial, sans-serif" };
const container = { padding: "24px 28px", maxWidth: "560px" };
const h1 = { fontSize: "24px", fontWeight: "bold" as const, color: "#0b1736", margin: "0 0 20px" };
const text = { fontSize: "15px", color: "#475569", lineHeight: "1.6", margin: "0 0 18px" };
const footer = { fontSize: "12px", color: "#94a3b8", margin: "32px 0 0" };
