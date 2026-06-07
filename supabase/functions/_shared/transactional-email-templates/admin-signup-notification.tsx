/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { Heading, Hr, Link, Section, Text } from 'npm:@react-email/components@0.0.22'

import type { TemplateEntry } from './registry.ts'
import {
  EmailLayout,
  card,
  h1,
  hr,
  label,
  link,
  text,
  value,
  footerNote,
} from './_layout.tsx'

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
  <EmailLayout
    preview={`New signup${fullName ? ` — ${fullName}` : ''}${email ? ` (${email})` : ''}`}
  >
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

    <Text style={footerNote}>
      You are receiving this because you are the platform administrator.
    </Text>
  </EmailLayout>
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
