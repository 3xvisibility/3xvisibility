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

interface ContactNotificationProps {
  name?: string
  email?: string
  subject?: string
  message?: string
}

export const ContactNotificationEmail = ({
  name,
  email,
  subject,
  message,
}: ContactNotificationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      New contact message{name ? ` from ${name}` : ''}
      {subject ? ` — ${subject}` : ''}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} width="48" height="48" alt="3Xvisibility" style={logo} />
        <Heading style={h1}>New contact form submission</Heading>
        <Text style={text}>You received a new message through your website contact form.</Text>

        <Section style={card}>
          <Text style={label}>Name</Text>
          <Text style={value}>{name || '—'}</Text>

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

          <Text style={label}>Subject</Text>
          <Text style={value}>{subject || 'Contact request'}</Text>

          <Hr style={hr} />

          <Text style={label}>Message</Text>
          <Text style={messageStyle}>{message || '—'}</Text>
        </Section>

        <Text style={footer}>
          Reply directly to this person at{' '}
          {email ? (
            <Link href={`mailto:${email}`} style={link}>
              {email}
            </Link>
          ) : (
            'their email'
          )}
          .
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ContactNotificationEmail

export const template = {
  component: ContactNotificationEmail,
  subject: (data: Record<string, any>) =>
    `New contact message${data?.name ? ` from ${data.name}` : ''}${
      data?.subject ? `: ${data.subject}` : ''
    }`,
  displayName: 'Contact form notification',
  // All contact form submissions are delivered to this inbox.
  to: '3xvisibility@gmail.com',
  previewData: {
    name: 'Jane Doe',
    email: 'jane@example.com',
    subject: 'Question about pricing',
    message: 'Hi, I would like to know more about your plans.',
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
  fontSize: '14px',
  color: 'hsl(252, 40%, 12%)',
  lineHeight: '1.6',
  whiteSpace: 'pre-wrap' as const,
  margin: '0',
}
const hr = { borderColor: 'hsl(96, 40%, 85%)', margin: '16px 0' }
const link = { color: 'hsl(217, 50%, 45%)', textDecoration: 'underline' }
const footer = { fontSize: '12px', color: 'hsl(220, 10%, 60%)', margin: '24px 0 0' }
