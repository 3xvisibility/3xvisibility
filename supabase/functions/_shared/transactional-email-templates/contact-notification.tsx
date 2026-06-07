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
  messageStyle,
  text,
  value,
  footerNote,
} from './_layout.tsx'

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
  <EmailLayout
    preview={`New contact message${name ? ` from ${name}` : ''}${
      subject ? ` — ${subject}` : ''
    }`}
  >
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

    <Text style={footerNote}>
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
  </EmailLayout>
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
