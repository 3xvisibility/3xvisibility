/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
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

interface AdminSignupNotificationProps {
  fullName?: string
  email?: string
  company?: string
  aiLanguage?: string
  signedUpAt?: string
}

export const AdminSignupNotificationEmail = ({
  fullName,
  email,
  company,
  aiLanguage,
  signedUpAt,
}: AdminSignupNotificationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New signup{fullName ? ` — ${fullName}` : ''}{email ? ` (${email})` : ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} width="48" height="48" alt="3Xvisibility" style={logo} />
        <Heading style={h1}>New user signed up</Heading>
        <Text style={text}>A new user just created an account on your platform.</Text>

        <Section style={card}>
          <Text style={label}>Name</Text>
          <Text style={value}>{fullName || '—'}</Text>

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

          <Text style={label}>Company</Text>
          <Text style={value}>{company || '—'}</Text>

          <Hr style={hr} />

          <Text style={label}>Preferred language</Text>
          <Text style={value}>{aiLanguage || '—'}</Text>

          <Text style={label}>Signed up at</Text>
          <Text style={value}>{signedUpAt || new Date().toISOString()}</Text>
        </Section>

        <Text style={footer}>
          You are receiving this because you are the platform administrator.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default AdminSignupNotificationEmail

export const template = {
  component: AdminSignupNotificationEmail,
  subject: (data: Record<string, any>) =>
    `New signup${data?.fullName ? `: ${data.fullName}` : ''}${
      data?.email ? ` (${data.email})` : ''
    }`,
  displayName: 'Admin: new signup notification',
  // All new-signup notifications are delivered to the admin inbox.
  to: '3xvisibility@gmail.com',
  previewData: {
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    company: 'Acme Inc',
    aiLanguage: 'en',
    signedUpAt: new Date().toISOString(),
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
const hr = { borderColor: 'hsl(96, 40%, 85%)', margin: '16px 0' }
const link = { color: 'hsl(217, 50%, 45%)', textDecoration: 'underline' }
const footer = { fontSize: '12px', color: 'hsl(220, 10%, 60%)', margin: '24px 0 0' }
