/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

import type { TemplateEntry } from './registry.ts'

const LOGO_URL =
  'https://qmuxdkxdrxevlnckssuw.supabase.co/storage/v1/object/public/ai-images/email%2Flogo-3x.png'

interface AdminResetNotificationProps {
  email?: string
  requestedAt?: string
  userAgent?: string
  origin?: string
  language?: string
}

export const AdminResetNotificationEmail = ({
  email,
  requestedAt,
  userAgent,
  origin,
  language,
}: AdminResetNotificationProps) => {
  const searchEmail = email ? encodeURIComponent(email) : ''
  const adminLink = origin
    ? `${origin}/admin?section=users&search=${searchEmail}`
    : ''

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Password reset requested{email ? ` — ${email}` : ''}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img src={LOGO_URL} width="48" height="48" alt="3Xvisibility" style={logo} />
          <Heading style={h1}>Password reset requested</Heading>
          <Text style={text}>A user just requested a password reset link.</Text>

          <Section style={card}>
            <Text style={label}>Email</Text>
            <Text style={value}>
              {email ? (
                <Link href={`mailto:${email}`} style={link}>
                  {email}
                </Link>
              ) : (
                '—'
              )}
            </Text>

            <Text style={label}>Requested at</Text>
            <Text style={value}>{requestedAt || new Date().toISOString()}</Text>

            <Text style={label}>From page</Text>
            <Text style={value}>{origin || '—'}</Text>

            <Hr style={hr} />

            <Text style={label}>Preferred language</Text>
            <Text style={value}>{language || '—'}</Text>

            <Text style={label}>Device / browser</Text>
            <Text style={messageStyle}>{userAgent || '—'}</Text>

            {adminLink && (
              <>
                <Hr style={hr} />
                <Section style={{ textAlign: 'center' as const, marginTop: '12px' }}>
                  <Button href={adminLink} style={cta}>
                    Open user profile in admin
                  </Button>
                  <Text style={{ ...text, marginTop: '8px', fontSize: '12px' }}>
                    Or copy this link:{' '}
                    <Link href={adminLink} style={link}>
                      {adminLink}
                    </Link>
                  </Text>
                </Section>
              </>
            )}
          </Section>

          <Text style={footer}>
            You are receiving this because you are the platform administrator.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default AdminResetNotificationEmail

export const template = {
  component: AdminResetNotificationEmail,
  subject: (data: Record<string, any>) =>
    `Password reset requested${data?.email ? `: ${data.email}` : ''}`,
  displayName: 'Admin: password reset notification',
  // All password reset notifications are delivered to the admin inbox.
  to: '3xvisibility@gmail.com',
  previewData: {
    email: 'jane@example.com',
    requestedAt: new Date().toISOString(),
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    origin: 'https://3xvisibility.com',
    language: 'en',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Plus Jakarta Sans', 'Inter', Arial, sans-serif",
}
const container = { padding: '20px 25px' }
const logo = { margin: '0 0 24px', borderRadius: '12px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(252, 40%, 10%)',
  margin: '0 0 12px',
}
const text = {
  fontSize: '14px',
  color: 'hsl(220, 10%, 45%)',
  lineHeight: '1.5',
  margin: '0 0 20px',
}
const card = {
  border: '1px solid hsl(96, 40%, 85%)',
  borderRadius: '12px',
  padding: '20px 22px',
  backgroundColor: 'hsl(96, 60%, 98%)',
}
const label = {
  fontSize: '11px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  color: 'hsl(220, 10%, 55%)',
  margin: '0 0 2px',
}
const value = {
  fontSize: '14px',
  color: 'hsl(252, 40%, 12%)',
  fontWeight: 'bold' as const,
  margin: '0 0 16px',
}
const messageStyle = {
  fontSize: '13px',
  color: 'hsl(252, 40%, 12%)',
  lineHeight: '1.5',
  whiteSpace: 'pre-wrap' as const,
  wordBreak: 'break-word' as const,
  margin: '0',
}
const hr = { borderColor: 'hsl(96, 40%, 85%)', margin: '16px 0' }
const link = { color: 'hsl(217, 50%, 45%)', textDecoration: 'underline' }
const cta = {
  backgroundColor: 'hsl(217, 50%, 45%)',
  color: '#ffffff',
  borderRadius: '8px',
  padding: '10px 18px',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = { fontSize: '12px', color: 'hsl(220, 10%, 60%)', margin: '24px 0 0' }
