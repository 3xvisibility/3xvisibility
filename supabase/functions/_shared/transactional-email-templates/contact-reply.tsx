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
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

import type { TemplateEntry } from './registry.ts'

const LOGO_URL =
  'https://qmuxdkxdrxevlnckssuw.supabase.co/storage/v1/object/public/ai-images/email%2Flogo-3x.png'

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
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reply from 3Xvisibility</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} width="48" height="48" alt="3Xvisibility" style={logo} />
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

        <Text style={footer}>— The 3Xvisibility Team</Text>
      </Container>
    </Body>
  </Html>
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

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Plus Jakarta Sans', 'Inter', Arial, sans-serif",
}
const container = { padding: '20px 25px' }
const logo = { margin: '0 0 24px', borderRadius: '12px' }
const h1 = {
  fontSize: '20px',
  fontWeight: 'bold' as const,
  color: 'hsl(252, 40%, 10%)',
  margin: '0 0 12px',
}
const text = {
  fontSize: '14px',
  color: 'hsl(220, 10%, 45%)',
  lineHeight: '1.5',
  margin: '0 0 18px',
}
const card = {
  border: '1px solid hsl(96, 40%, 85%)',
  borderRadius: '12px',
  padding: '18px 20px',
  backgroundColor: 'hsl(96, 60%, 98%)',
}
const replyText = {
  fontSize: '14px',
  color: 'hsl(252, 40%, 12%)',
  lineHeight: '1.6',
  whiteSpace: 'pre-wrap' as const,
  margin: '0',
}
const hr = { borderColor: 'hsl(220, 13%, 90%)', margin: '24px 0 12px' }
const quotedLabel = { fontSize: '12px', color: 'hsl(220, 10%, 55%)', margin: '0 0 6px' }
const quoted = {
  fontSize: '13px',
  color: 'hsl(220, 10%, 50%)',
  lineHeight: '1.5',
  whiteSpace: 'pre-wrap' as const,
  borderLeft: '3px solid hsl(220, 13%, 88%)',
  paddingLeft: '12px',
  margin: '0',
}
const footer = { fontSize: '13px', color: 'hsl(220, 10%, 45%)', margin: '28px 0 0' }
