/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { Heading, Hr, Section, Text } from 'npm:@react-email/components@0.0.22'

import type { TemplateEntry } from './registry.ts'
import { EmailLayout, card, h1, hr, text } from './_layout.tsx'

interface ContactReplyProps {
  name?: string
  reply?: string
  originalSubject?: string
  originalMessage?: string
}

export const ContactReplyEmail = ({
  name,
  reply,
  originalSubject,
  originalMessage,
}: ContactReplyProps) => (
  <EmailLayout preview="Reply from 3Xvisibility">
    <Heading style={h1}>Hi {name || 'there'},</Heading>
    <Text style={text}>Thanks for reaching out to 3Xvisibility. Here's our reply:</Text>

    <Section style={card}>
      <Text style={replyText}>{reply || ''}</Text>
    </Section>

    {originalMessage ? (
      <>
        <Hr style={hr} />
        <Text style={quotedLabel}>
          Your original message{originalSubject ? ` — ${originalSubject}` : ''}:
        </Text>
        <Text style={quoted}>{originalMessage}</Text>
      </>
    ) : null}

    <Text style={signoff}>— The 3Xvisibility Team</Text>
  </EmailLayout>
)

export default ContactReplyEmail

export const template = {
  component: ContactReplyEmail,
  subject: (data: Record<string, any>) =>
    data?.originalSubject ? `Re: ${data.originalSubject}` : 'Reply from 3Xvisibility',
  displayName: 'Contact reply',
  previewData: {
    name: 'Jane Doe',
    reply: 'Thanks for your question! Our Pro plan includes unlimited pages.',
    originalSubject: 'Question about pricing',
    originalMessage: 'Hi, I would like to know more about your plans.',
  },
} satisfies TemplateEntry

const replyText = {
  fontSize: '14px',
  color: 'hsl(252, 40%, 12%)',
  lineHeight: '1.6',
  whiteSpace: 'pre-wrap' as const,
  margin: '0',
}
const quotedLabel = { fontSize: '12px', color: 'hsl(220, 10%, 55%)', margin: '18px 0 6px' }
const quoted = {
  fontSize: '13px',
  color: 'hsl(220, 10%, 50%)',
  lineHeight: '1.5',
  whiteSpace: 'pre-wrap' as const,
  borderLeft: '3px solid hsl(220, 13%, 88%)',
  paddingLeft: '12px',
  margin: '0',
}
const signoff = { fontSize: '13px', color: 'hsl(220, 10%, 45%)', margin: '24px 0 0' }
