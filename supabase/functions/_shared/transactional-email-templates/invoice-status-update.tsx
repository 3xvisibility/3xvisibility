/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { Button, Heading, Section, Text } from 'npm:@react-email/components@0.0.22'

import type { TemplateEntry } from './registry.ts'
import { EmailLayout, card, cta, h1, label, text, value, footerNote } from './_layout.tsx'

interface InvoiceStatusUpdateProps {
  name?: string
  email?: string
  invoiceNumber?: string
  /** refunded | partially_refunded | voided | disputed */
  statusKey?: string
  statusLabel?: string
  amount?: string
  currency?: string
  reason?: string
  occurredAt?: string
  origin?: string
}

const formatAmount = (amount?: string, currency?: string) => {
  if (!amount) return ''
  return `${(currency || 'USD').toUpperCase()} ${amount}`
}

const HEADLINES: Record<string, { title: string; body: string }> = {
  refunded: {
    title: 'Your payment has been refunded',
    body: 'We have issued a full refund for this invoice. Depending on your bank, it can take 5–10 business days to appear on your statement.',
  },
  partially_refunded: {
    title: 'A partial refund was issued',
    body: 'We have issued a partial refund for this invoice. Depending on your bank, it can take 5–10 business days to appear on your statement.',
  },
  voided: {
    title: 'Your invoice has been voided',
    body: 'This invoice has been voided and is no longer payable. No further action is needed from you.',
  },
  disputed: {
    title: 'Your payment is under dispute review',
    body: 'A dispute (chargeback) was opened with your bank for this payment. We are reviewing it and will update you once it is resolved.',
  },
}

export const InvoiceStatusUpdateEmail = ({
  name,
  email,
  invoiceNumber,
  statusKey,
  statusLabel,
  amount,
  currency,
  reason,
  occurredAt,
  origin,
}: InvoiceStatusUpdateProps) => {
  const copy = HEADLINES[statusKey || ''] || {
    title: 'Your invoice status has changed',
    body: 'The status of one of your invoices has been updated.',
  }
  const billingLink = origin ? `${origin}/billing` : ''

  return (
    <EmailLayout preview={copy.title}>
      <Heading style={h1}>{copy.title}</Heading>
      <Text style={text}>Hi{name ? ` ${name}` : ''},</Text>
      <Text style={text}>{copy.body}</Text>

      <Section style={card}>
        {invoiceNumber && (
          <>
            <Text style={label}>Invoice</Text>
            <Text style={value}>{invoiceNumber}</Text>
          </>
        )}
        <Text style={label}>Status</Text>
        <Text style={value}>{statusLabel || copy.title}</Text>
        {amount && (
          <>
            <Text style={label}>Amount</Text>
            <Text style={value}>{formatAmount(amount, currency)}</Text>
          </>
        )}
        {reason && (
          <>
            <Text style={label}>Reason</Text>
            <Text style={value}>{reason}</Text>
          </>
        )}
        {occurredAt && (
          <>
            <Text style={label}>Date</Text>
            <Text style={{ ...value, margin: '0' }}>
              {new Date(occurredAt).toLocaleDateString('en-US', { dateStyle: 'long' })}
            </Text>
          </>
        )}
      </Section>

      {billingLink && (
        <Section style={{ textAlign: 'center' as const, margin: '24px 0 0' }}>
          <Button href={billingLink} style={cta}>
            View invoice
          </Button>
        </Section>
      )}

      <Text style={footerNote}>
        Questions about this update? Just reply to this email. Sent to{' '}
        {email || 'your account email'}.
      </Text>
    </EmailLayout>
  )
}

export default InvoiceStatusUpdateEmail

export const template = {
  component: InvoiceStatusUpdateEmail,
  subject: (data: Record<string, any>) =>
    HEADLINES[data?.statusKey || '']?.title || 'Your invoice status has changed',
  displayName: 'Invoice status update',
  previewData: {
    name: 'Jane',
    email: 'jane@example.com',
    invoiceNumber: 'INV-2026-00042',
    statusKey: 'refunded',
    statusLabel: 'Refunded',
    amount: '49.00',
    currency: 'USD',
    reason: 'Customer request',
    occurredAt: new Date().toISOString(),
    origin: 'https://3xvisibility.com',
  },
} satisfies TemplateEntry
