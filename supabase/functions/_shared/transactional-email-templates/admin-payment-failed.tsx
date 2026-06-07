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
  text,
  value,
  footerNote,
} from './_layout.tsx'

interface AdminPaymentFailedProps {
  name?: string
  email?: string
  userId?: string
  customerId?: string
  planName?: string
  amount?: string
  currency?: string
  reason?: string
  nextAttemptDate?: string
  invoiceUrl?: string
  origin?: string
}

const formatAmount = (amount?: string, currency?: string) => {
  if (!amount) return '—'
  const cur = (currency || 'USD').toUpperCase()
  return `${cur} ${amount}`
}

export const AdminPaymentFailedEmail = ({
  name,
  email,
  userId,
  customerId,
  planName,
  amount,
  currency,
  reason,
  nextAttemptDate,
  invoiceUrl,
  origin,
}: AdminPaymentFailedProps) => {
  const profileLink =
    origin && userId ? `${origin}/admin?userId=${encodeURIComponent(userId)}` : ''

  return (
    <EmailLayout
      preview={`Payment failed${email ? ` — ${email}` : ''}${
        amount ? ` (${formatAmount(amount, currency)})` : ''
      }`}
    >
      <Heading style={h1}>Payment failed</Heading>
      <Text style={text}>
        A customer&apos;s payment could not be processed. Review the affected account below.
      </Text>

      <Section style={card}>
        <Text style={label}>Customer</Text>
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

        <Text style={label}>Plan</Text>
        <Text style={value}>{planName || '—'}</Text>

        <Text style={label}>Amount due</Text>
        <Text style={value}>{formatAmount(amount, currency)}</Text>

        <Hr style={hr} />

        <Text style={label}>Failure reason</Text>
        <Text style={{ ...value, color: 'hsl(0, 65%, 48%)' }}>
          {reason || 'The payment was declined'}
        </Text>

        {nextAttemptDate && (
          <>
            <Text style={label}>Next automatic attempt</Text>
            <Text style={value}>
              {new Date(nextAttemptDate).toLocaleDateString('en-US', { dateStyle: 'long' })}
            </Text>
          </>
        )}

        <Text style={label}>Stripe customer</Text>
        <Text style={{ ...value, margin: '0' }}>{customerId || '—'}</Text>
      </Section>

      {(profileLink || invoiceUrl) && (
        <Section style={{ textAlign: 'center' as const, margin: '24px 0 0' }}>
          {profileLink && (
            <Button href={profileLink} style={cta}>
              View user profile
            </Button>
          )}
          {invoiceUrl && (
            <Text style={{ ...footerNote, margin: '12px 0 0' }}>
              <Link href={invoiceUrl} style={link}>
                Open invoice in Stripe
              </Link>
            </Text>
          )}
        </Section>
      )}

      <Text style={footerNote}>
        You are receiving this because you are the platform administrator.
      </Text>
    </EmailLayout>
  )
}

export default AdminPaymentFailedEmail

export const template = {
  component: AdminPaymentFailedEmail,
  subject: (data: Record<string, any>) =>
    `Payment failed${data?.email ? `: ${data.email}` : ''}${
      data?.amount ? ` (${(data.currency || 'USD').toUpperCase()} ${data.amount})` : ''
    }`,
  displayName: 'Admin: payment failed notification',
  // All payment-failure notifications are delivered to the admin inbox.
  to: '3xvisibility@gmail.com',
  previewData: {
    name: 'Jane Doe',
    email: 'jane@example.com',
    userId: '00000000-0000-0000-0000-000000000000',
    customerId: 'cus_example123',
    planName: 'Agency Plan',
    amount: '49.00',
    currency: 'USD',
    reason: 'Your card was declined',
    nextAttemptDate: new Date(Date.now() + 3 * 864e5).toISOString(),
    invoiceUrl: 'https://dashboard.stripe.com/invoices/in_example',
    origin: 'https://3xvisibility.com',
  },
} satisfies TemplateEntry
