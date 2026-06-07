/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { Button, Heading, Hr, Link, Section, Text } from 'npm:@react-email/components@0.0.22'

import type { TemplateEntry } from './registry.ts'
import {
  EmailLayout,
  card,
  cta,
  h1,
  hr,
  label,
  link,
  messageStyle,
  text,
  value,
  footerNote,
} from './_layout.tsx'

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
  const adminLink = origin ? `${origin}/admin?section=users&search=${searchEmail}` : ''

  return (
    <EmailLayout preview={`Password reset requested${email ? ` — ${email}` : ''}`}>
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

      <Text style={footerNote}>
        You are receiving this because you are the platform administrator.
      </Text>
    </EmailLayout>
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
