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

interface AdminResetCompletedProps {
  email?: string
  completedAt?: string
  userAgent?: string
  origin?: string
  language?: string
}

export const AdminResetCompletedEmail = ({
  email,
  completedAt,
  userAgent,
  origin,
  language,
}: AdminResetCompletedProps) => {
  const searchEmail = email ? encodeURIComponent(email) : ''
  const adminLink = origin ? `${origin}/admin?section=users&search=${searchEmail}` : ''

  return (
    <EmailLayout preview={`Password reset completed${email ? ` — ${email}` : ''}`}>
      <Heading style={h1}>Password reset completed</Heading>
      <Text style={text}>A user has successfully reset their password via email link.</Text>

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

        <Text style={label}>Completed at</Text>
        <Text style={value}>{completedAt || new Date().toISOString()}</Text>

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

export default AdminResetCompletedEmail

export const template = {
  component: AdminResetCompletedEmail,
  subject: (data: Record<string, any>) =>
    `Password reset completed${data?.email ? `: ${data.email}` : ''}`,
  displayName: 'Admin: password reset completed',
  // All password reset completed notifications are delivered to the admin inbox.
  to: '3xvisibility@gmail.com',
  previewData: {
    email: 'jane@example.com',
    completedAt: new Date().toISOString(),
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    origin: 'https://3xvisibility.com',
    language: 'en',
  },
} satisfies TemplateEntry
