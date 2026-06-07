/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { Button, Heading, Section, Text } from 'npm:@react-email/components@0.0.22'

import type { TemplateEntry } from './registry.ts'
import { EmailLayout, card, cta, h1, label, text, value, footerNote } from './_layout.tsx'

interface PaymentFailedProps {
  name?: string
  email?: string
  planName?: string
  amount?: string
  currency?: string
  reason?: string
  nextAttemptDate?: string
  origin?: string
  portalUrl?: string
}

const formatAmount = (amount?: string, currency?: string) => {
  if (!amount) return ''
  const cur = (currency || 'USD').toUpperCase()
  return `${cur} ${amount}`
}

export const PaymentFailedEmail = ({
  name,
  email,
  planName,
  amount,
  currency,
  reason,
  nextAttemptDate,
  origin,
  portalUrl,
}: PaymentFailedProps) => {
  // Prefer a direct Stripe Customer Billing Portal link so users can update
  // their payment method immediately; fall back to the in-app billing page.
  const billingLink = portalUrl || (origin ? `${origin}/billing` : '')

  return (
    <EmailLayout preview="Action needed: your payment could not be processed">
      <Heading style={h1}>Payment failed</Heading>
      <Text style={text}>Hi{name ? ` ${name}` : ''},</Text>
      <Text style={text}>
        We were unable to process your most recent payment{planName ? ` for ${planName}` : ''}.
        To avoid any interruption to your service, please update your billing details.
      </Text>

      <Section style={card}>
        {planName && (
          <>
            <Text style={label}>Plan</Text>
            <Text style={value}>{planName}</Text>
          </>
        )}
        {amount && (
          <>
            <Text style={label}>Amount due</Text>
            <Text style={value}>{formatAmount(amount, currency)}</Text>
          </>
        )}
        <Text style={label}>Status</Text>
        <Text style={{ ...value, color: 'hsl(0, 65%, 48%)', margin: reason ? undefined : '0' }}>
          {reason || 'The payment was declined'}
        </Text>
        {nextAttemptDate && (
          <>
            <Text style={label}>Next automatic attempt</Text>
            <Text style={{ ...value, margin: '0' }}>
              {new Date(nextAttemptDate).toLocaleDateString('en-US', { dateStyle: 'long' })}
            </Text>
          </>
        )}
      </Section>

      {billingLink && (
        <Section style={{ textAlign: 'center' as const, margin: '24px 0 0' }}>
          <Button href={billingLink} style={cta}>
            Update payment method
          </Button>
        </Section>
      )}

      <Text style={footerNote}>
        If you've already updated your payment method, you can disregard this message. Sent to{' '}
        {email || 'your account email'}.
      </Text>
    </EmailLayout>
  )
}

export default PaymentFailedEmail

export const template = {
  component: PaymentFailedEmail,
  subject: 'Action needed: your payment could not be processed',
  displayName: 'Payment failed alert',
  previewData: {
    name: 'Jane',
    email: 'jane@example.com',
    planName: 'Agency Plan',
    amount: '49.00',
    currency: 'USD',
    reason: 'Your card was declined',
    nextAttemptDate: new Date(Date.now() + 3 * 864e5).toISOString(),
    origin: 'https://3xvisibility.com',
    portalUrl: 'https://billing.stripe.com/p/session/test_example',
  },
} satisfies TemplateEntry
