/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { Button, Heading, Section, Text } from 'npm:@react-email/components@0.0.22'

import type { TemplateEntry } from './registry.ts'
import { EmailLayout, card, cta, h1, label, text, value, footerNote } from './_layout.tsx'

interface SubscriptionConfirmationProps {
  name?: string
  email?: string
  planName?: string
  amount?: string
  currency?: string
  interval?: string
  startedAt?: string
  nextBillingDate?: string
  origin?: string
}

const formatAmount = (amount?: string, currency?: string, interval?: string) => {
  if (!amount) return ''
  const cur = (currency || 'USD').toUpperCase()
  const suffix = interval ? ` / ${interval}` : ''
  return `${cur} ${amount}${suffix}`
}

export const SubscriptionConfirmationEmail = ({
  name,
  email,
  planName,
  amount,
  currency,
  interval,
  startedAt,
  nextBillingDate,
  origin,
}: SubscriptionConfirmationProps) => {
  const when = startedAt ? new Date(startedAt) : new Date()
  const dashboardLink = origin ? `${origin}/dashboard` : ''

  return (
    <EmailLayout preview="Your subscription is active — welcome aboard!">
      <Heading style={h1}>Subscription confirmed</Heading>
      <Text style={text}>Hi{name ? ` ${name}` : ''},</Text>
      <Text style={text}>
        Welcome aboard! Your{planName ? ` ${planName}` : ''} subscription is now active. Here are
        the details.
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
            <Text style={label}>Price</Text>
            <Text style={value}>{formatAmount(amount, currency, interval)}</Text>
          </>
        )}
        <Text style={label}>Started on</Text>
        <Text style={value}>
          {when.toLocaleDateString('en-US', { dateStyle: 'long' })}
        </Text>
        {nextBillingDate && (
          <>
            <Text style={label}>Next billing date</Text>
            <Text style={{ ...value, margin: '0' }}>
              {new Date(nextBillingDate).toLocaleDateString('en-US', { dateStyle: 'long' })}
            </Text>
          </>
        )}
      </Section>

      {dashboardLink && (
        <Section style={{ textAlign: 'center' as const, margin: '24px 0 0' }}>
          <Button href={dashboardLink} style={cta}>
            Go to dashboard
          </Button>
        </Section>
      )}

      <Text style={footerNote}>
        This confirmation was sent to {email || 'your account email'}.
      </Text>
    </EmailLayout>
  )
}

export default SubscriptionConfirmationEmail

export const template = {
  component: SubscriptionConfirmationEmail,
  subject: 'Your subscription is confirmed',
  displayName: 'Subscription confirmation',
  previewData: {
    name: 'Jane',
    email: 'jane@example.com',
    planName: 'Agency Plan',
    amount: '49.00',
    currency: 'USD',
    interval: 'month',
    startedAt: new Date().toISOString(),
    nextBillingDate: new Date(Date.now() + 30 * 864e5).toISOString(),
    origin: 'https://3xvisibility.com',
  },
} satisfies TemplateEntry
