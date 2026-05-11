import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface WelcomeEmailProps {
  name?: string
  role?: 'contractor' | 'corporation'
}

const SITE_NAME = 'BuildForce Prime'
const SITE_URL = 'https://buildforceprime.com'

const WelcomeEmail = ({ name, role }: WelcomeEmailProps) => {
  const isCorp = role === 'corporation'
  return (
    <Html lang="he" dir="rtl">
      <Head />
      <Preview>ברוכים הבאים ל-{SITE_NAME}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>ברוכים הבאים{name ? `, ${name}` : ''}!</Heading>
          <Text style={text}>
            תודה שהצטרפת ל-{SITE_NAME} — שוק כוח האדם החכם לענף הבנייה.
          </Text>
          <Text style={text}>
            {isCorp
              ? 'הצוות שלנו יבחן את פרטי התאגיד שלך (ח.פ., רישיון קבלן, ביטוחים) תוך 24-48 שעות. ברגע שהחשבון יאומת, תוכל להתחיל להגיש הצעות לבקשות עבודה פעילות.'
              : 'הצוות שלנו יבחן את פרטי העסק שלך תוך 24-48 שעות. ברגע שהחשבון יאומת, תוכל לפרסם בקשות עבודה ולקבל הצעות מתאגידי כוח אדם מאומתים.'}
          </Text>
          <Button style={button} href={SITE_URL}>
            כניסה לפלטפורמה
          </Button>
          <Text style={footer}>צוות {SITE_NAME}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: WelcomeEmail,
  subject: `ברוכים הבאים ל-${SITE_NAME}`,
  displayName: 'ברוכים הבאים',
  previewData: { name: 'יוסי', role: 'contractor' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Heebo, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#0b1736', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#475569', lineHeight: '1.6', margin: '0 0 18px' }
const button = { backgroundColor: '#1d4ed8', color: '#ffffff', fontSize: '14px', borderRadius: '8px', padding: '12px 22px', textDecoration: 'none', fontWeight: 'bold' as const }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '32px 0 0' }
