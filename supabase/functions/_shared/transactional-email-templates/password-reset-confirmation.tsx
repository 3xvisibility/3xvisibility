/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { Button, Heading, Section, Text } from 'npm:@react-email/components@0.0.22'

import type { TemplateEntry } from './registry.ts'
import { EmailLayout, card, cta, h1, text, footerNote } from './_layout.tsx'

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
  const when = completedAt ? new Date(completedAt) : new Date()

  return (
    <EmailLayout preview="Your password has been updated successfully">
      <Heading style={h1}>Password updated</Heading>
      <Text style={text}>Hi{email ? ` ${email}` : ''},</Text>
      <Text style={text}>
        Your password was successfully reset on{' '}
        {when.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}.
      </Text>

      <Section style={card}>
        <Text style={{ ...text, margin: '0' }}>
          If you did not request this change, please contact support immediately to secure
          your account.
        </Text>
      </Section>

      {loginLink && (
        <Section style={{ textAlign: 'center' as const, margin: '24px 0 0' }}>
          <Button href={loginLink} style={cta}>
            Sign in
          </Button>
        </Section>
      )}

      <Text style={footerNote}>
        This is an automated message from 3Xvisibility. Please do not reply to this email.
      </Text>
    </EmailLayout>
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
