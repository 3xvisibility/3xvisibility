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

interface PasswordResetConfirmationProps {
  email?: string
  completedAt?: string
  origin?: string
}

export const PasswordResetConfirmationEmail = ({
  email,
  completedAt,
  origin,
}: PasswordResetConfirmationProps) => {
  const loginLink = origin ? `${origin}/auth` : ''

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your password has been updated successfully</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img src={LOGO_URL} width="48" height="48" alt="3Xvisibility" style={logo} />
          <Heading style={h1}>Password updated</Heading>
          <Text style={text}>
            Hi{email ? ` ${email}` : ''},
          </Text>
          <Text style={text}>
            Your password was successfully reset on{' '}
            {completedAt
              ? new Date(completedAt).toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })
              : new Date().toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}.
          </Text>

          <Section style={card}>
            <Text style={{ ...text, margin: '0 0 12px' }}>
              If you did not request this change, please contact support immediately to secure your account.
            </Text>
          </Section>

          {loginLink && (
            <Section style={{ textAlign: 'center' as const, margin: '24px 0' }}>
              <Button href={loginLink} style={cta}>
                Sign in
              </Button>
            </Section>
          )}

          <Hr style={hr} />

          <Text style={footer}>
            This is an automated message from 3Xvisibility. Please do not reply to this email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default PasswordResetConfirmationEmail

export const template = {
  component: PasswordResetConfirmationEmail,
  subject: 'Your password has been updated',
  displayName: 'Password reset confirmation',
  previewData: {
    email: 'jane@example.com',
    completedAt: new Date().toISOString(),
    origin: 'https://3xvisibility.com',
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
const hr = { borderColor: 'hsl(96, 40%, 85%)', margin: '24px 0' }
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
