import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  category?: string
  workersCount?: number
  city?: string
  startDate?: string
  requestId?: string
}
const SITE_NAME = 'BuildForce Prime'
const SITE_URL = 'https://buildforceprime.com'

const NewJobRequestEmail = ({ category, workersCount, city, startDate, requestId }: Props) => (
  <Html lang="he" dir="rtl">
    <Head />
    <Preview>בקשת עבודה חדשה זמינה להגשת הצעה</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>בקשת עבודה חדשה</Heading>
        <Text style={text}>פורסמה בקשת עבודה חדשה ב-{SITE_NAME} שמתאימה לפרופיל שלך:</Text>
        <table style={table}>
          <tbody>
            {category ? <tr><td style={tdLabel}>קטגוריה</td><td style={tdValue}>{category}</td></tr> : null}
            {workersCount ? <tr><td style={tdLabel}>מספר עובדים</td><td style={tdValue}>{workersCount}</td></tr> : null}
            {city ? <tr><td style={tdLabel}>אזור</td><td style={tdValue}>{city}</td></tr> : null}
            {startDate ? <tr><td style={tdLabel}>תאריך התחלה</td><td style={tdValue}>{startDate}</td></tr> : null}
          </tbody>
        </table>
        <Text style={text}>היכנס לפלטפורמה והגש הצעה לפני שהמכרז ייסגר.</Text>
        <Button style={button} href={requestId ? `${SITE_URL}/requests/${requestId}` : `${SITE_URL}/dashboard`}>
          הגש הצעה
        </Button>
        <Text style={footer}>צוות {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: NewJobRequestEmail,
  subject: 'בקשת עבודה חדשה ב-BuildForce',
  displayName: 'בקשת עבודה חדשה',
  previewData: { category: 'שלד', workersCount: 8, city: 'תל אביב', startDate: '15/06/2026', requestId: 'demo' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Heebo, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#0b1736', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#475569', lineHeight: '1.6', margin: '0 0 18px' }
const table = { width: '100%', borderCollapse: 'collapse' as const, margin: '0 0 20px' }
const tdLabel = { fontSize: '13px', color: '#94a3b8', padding: '8px 0', width: '40%' }
const tdValue = { fontSize: '14px', color: '#0b1736', padding: '8px 0', fontWeight: 'bold' as const }
const button = { backgroundColor: '#1d4ed8', color: '#ffffff', fontSize: '14px', borderRadius: '8px', padding: '12px 22px', textDecoration: 'none', fontWeight: 'bold' as const }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '32px 0 0' }
