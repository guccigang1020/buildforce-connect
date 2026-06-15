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
  name?: string;
}
const SITE_NAME = "BuildForce Prime";
const SITE_URL = "https://buildforceprime.com";

const ContractorApprovedEmail = ({ name }: Props) => (
  <Html lang="he" dir="rtl">
    <Head />
    <Preview>החשבון שלך אומת בהצלחה</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>החשבון אומת בהצלחה ✓</Heading>
        <Text style={text}>
          שלום{name ? ` ${name}` : ""}, החשבון שלך ב-{SITE_NAME} אומת ופעיל.
        </Text>
        <Text style={text}>
          אתה יכול כעת לפרסם בקשות כוח אדם ולקבל הצעות תחרותיות מתאגידים מאומתים.
        </Text>
        <Button style={button} href={`${SITE_URL}/dashboard`}>
          כניסה לדשבורד
        </Button>
        <Text style={footer}>צוות {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: ContractorApprovedEmail,
  subject: "החשבון שלך ב-BuildForce אומת",
  displayName: "אישור קבלן",
  previewData: { name: "יוסי" },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Heebo, Arial, sans-serif" };
const container = { padding: "24px 28px", maxWidth: "560px" };
const h1 = { fontSize: "24px", fontWeight: "bold" as const, color: "#0b1736", margin: "0 0 20px" };
const text = { fontSize: "15px", color: "#475569", lineHeight: "1.6", margin: "0 0 18px" };
const button = {
  backgroundColor: "#1d4ed8",
  color: "#ffffff",
  fontSize: "14px",
  borderRadius: "8px",
  padding: "12px 22px",
  textDecoration: "none",
  fontWeight: "bold" as const,
};
const footer = { fontSize: "12px", color: "#94a3b8", margin: "32px 0 0" };
