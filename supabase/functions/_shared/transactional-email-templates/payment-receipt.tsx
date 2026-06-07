/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { Button, Heading, Hr, Section, Text } from 'npm:@react-email/components@0.0.22'

import type { TemplateEntry } from './registry.ts'
import { EmailLayout, card, cta, h1, hr, label, text, value, footerNote } from './_layout.tsx'

interface PaymentReceiptProps {
  name?: string
  email?: string
  planName?: string
  amount?: string
  currency?: string
  invoiceNumber?: string
  paidAt?: string
  nextBillingDate?: string
  origin?: string
}

const formatAmount = (amount?: string, currency?: string) => {
  if (!amount) return ''
  const cur = (currency || 'USD').toUpperCase()
  return `${cur} ${amount}`
}

export const PaymentReceiptEmail = ({
  name,
  email,
  planName,
  amount,
  currency,
  invoiceNumber,
  paidAt,
  nextBillingDate,
  origin,
}: PaymentReceiptProps) => {
  const when = paidAt ? new Date(paidAt) : new Date()
  const billingLink = origin ? `${origin}/settings/billing` : ''

  return (
    <EmailLayout preview="Your payment receipt from 3Xvisibility">
      <Heading style={h1}>Payment received</Heading>
      <Text style={text}>Hi{name ? ` ${name}` : ''},</Text>
      <Text style={text}>
        Thank you for your payment. This email confirms your transaction was processed
        successfully. A summary of your receipt is below.
      </Text>

      <Section style={card}>
        {planName && (
          <>
            <Text style={label}>Plan</Text>
            <Text style={value}>{planName}</Text>
          </>
        )}
        <Text style={label}>Amount paid</Text>
        <Text style={value}>{formatAmount(amount, currency) || '—'}</Text>
        <Text style={label}>Date</Text>
        <Text style={value}>
          {when.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
        </Text>
        {invoiceNumber && (
          <>
            <Text style={label}>Invoice number</Text>
            <Text style={{ ...value, margin: '0' }}>{invoiceNumber}</Text>
          </>
        )}
      </Section>

      {nextBillingDate && (
        <>
          <Hr style={hr} />
          <Text style={text}>
            Your next billing date is{' '}
            {new Date(nextBillingDate).toLocaleDateString('en-US', { dateStyle: 'long' })}.
          </Text>
        </>
      )}

      {billingLink && (
        <Section style={{ textAlign: 'center' as const, margin: '24px 0 0' }}>
          <Button href={billingLink} style={cta}>
            View billing
          </Button>
        </Section>
      )}

      <Text style={footerNote}>
        This receipt was sent to {email || 'your account email'}. Keep it for your records.
      </Text>
    </EmailLayout>
  )
}

export default PaymentReceiptEmail

export const template = {
  component: PaymentReceiptEmail,
  subject: 'Your payment receipt from 3Xvisibility',
  displayName: 'Payment receipt',
  previewData: {
    name: 'Jane',
    email: 'jane@example.com',
    planName: 'Agency Plan',
    amount: '49.00',
    currency: 'USD',
    invoiceNumber: 'INV-00123',
    paidAt: new Date().toISOString(),
    nextBillingDate: new Date(Date.now() + 30 * 864e5).toISOString(),
    origin: 'https://3xvisibility.com',
  },
} satisfies TemplateEntry
