/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { Button, Heading, Section, Text } from 'npm:@react-email/components@0.0.22'

import type { TemplateEntry } from './registry.ts'
import { EmailLayout, card, cta, h1, label, text, value, footerNote } from './_layout.tsx'

interface SubscriptionCancelledProps {
  name?: string
  email?: string
  planName?: string
  cancelledAt?: string
  accessUntil?: string
  nextBillingDate?: string
  origin?: string
  portalUrl?: string
}

export const SubscriptionCancelledEmail = ({
  name,
  email,
  planName,
  cancelledAt,
  accessUntil,
  nextBillingDate,
  origin,
  portalUrl,
}: SubscriptionCancelledProps) => {
  const when = cancelledAt ? new Date(cancelledAt) : new Date()
  // Prefer a direct Stripe Customer Billing Portal link so users can update
  // billing details or reactivate immediately; fall back to the in-app page.
  const resubscribeLink = portalUrl || (origin ? `${origin}/billing` : '')

  return (
    <EmailLayout preview="Your subscription has been cancelled">
      <Heading style={h1}>Subscription cancelled</Heading>
      <Text style={text}>Hi{name ? ` ${name}` : ''},</Text>
      <Text style={text}>
        We're confirming that your{planName ? ` ${planName}` : ''} subscription has been
        cancelled. We're sorry to see you go.
      </Text>

      <Section style={card}>
        {planName && (
          <>
            <Text style={label}>Plan</Text>
            <Text style={value}>{planName}</Text>
          </>
        )}
        <Text style={label}>Cancelled on</Text>
        <Text style={value}>
          {when.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
        </Text>
        {accessUntil && (
          <>
            <Text style={label}>Access until</Text>
            <Text style={{ ...value, margin: nextBillingDate ? undefined : '0' }}>
              {new Date(accessUntil).toLocaleDateString('en-US', { dateStyle: 'long' })}
            </Text>
          </>
        )}
        {nextBillingDate && (
          <>
            <Text style={label}>Next billing date</Text>
            <Text style={{ ...value, margin: '0' }}>
              {new Date(nextBillingDate).toLocaleDateString('en-US', { dateStyle: 'long' })} —
              you will not be charged
            </Text>
          </>
        )}
      </Section>

      <Text style={text}>
        You can continue to use your plan until your access period ends. Changed your mind? You
        can reactivate any time.
      </Text>

      {resubscribeLink && (
        <Section style={{ textAlign: 'center' as const, margin: '24px 0 0' }}>
          <Button href={resubscribeLink} style={cta}>
            Reactivate plan
          </Button>
        </Section>
      )}

      <Text style={footerNote}>
        This confirmation was sent to {email || 'your account email'}.
      </Text>
    </EmailLayout>
  )
}

export default SubscriptionCancelledEmail

export const template = {
  component: SubscriptionCancelledEmail,
  subject: 'Your subscription has been cancelled',
  displayName: 'Subscription cancellation',
  previewData: {
    name: 'Jane',
    email: 'jane@example.com',
    planName: 'Agency Plan',
    cancelledAt: new Date().toISOString(),
    accessUntil: new Date(Date.now() + 20 * 864e5).toISOString(),
    nextBillingDate: new Date(Date.now() + 30 * 864e5).toISOString(),
    origin: 'https://3xvisibility.com',
    portalUrl: 'https://billing.stripe.com/p/session/test_example',
  },
} satisfies TemplateEntry
