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

interface AdminPaymentReceivedProps {
  name?: string
  email?: string
  userId?: string
  customerId?: string
  planName?: string
  amount?: string
  currency?: string
  invoiceNumber?: string
  paidAt?: string
  invoiceUrl?: string
  origin?: string
}

const formatAmount = (amount?: string, currency?: string) => {
  if (!amount) return '—'
  const cur = (currency || 'EUR').toUpperCase()
  return `${cur} ${amount}`
}

export const AdminPaymentReceivedEmail = ({
  name,
  email,
  userId,
  customerId,
  planName,
  amount,
  currency,
  invoiceNumber,
  paidAt,
  invoiceUrl,
  origin,
}: AdminPaymentReceivedProps) => {
  const adminLink = origin ? `${origin}/admin?tab=payments` : ''
  const when = paidAt ? new Date(paidAt) : new Date()

  return (
    <EmailLayout
      preview={`Payment received${email ? ` — ${email}` : ''}${
        amount ? ` (${formatAmount(amount, currency)})` : ''
      }`}
    >
      <Heading style={h1}>Payment received</Heading>
      <Text style={text}>
        A customer payment was processed successfully and an invoice was generated
        automatically.
      </Text>

      <Section style={card}>
        <Text style={label}>Invoice number</Text>
        <Text style={value}>{invoiceNumber || '—'}</Text>

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

        <Text style={label}>Plan / item</Text>
        <Text style={value}>{planName || '—'}</Text>

        <Hr style={hr} />

        <Text style={label}>Amount paid</Text>
        <Text style={{ ...value, color: 'hsl(142, 60%, 42%)' }}>
          {formatAmount(amount, currency)}
        </Text>

        <Text style={label}>Paid at</Text>
        <Text style={value}>
          {when.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
        </Text>

        <Text style={label}>Stripe customer</Text>
        <Text style={{ ...value, margin: '0' }}>{customerId || '—'}</Text>
      </Section>

      <Section style={{ textAlign: 'center' as const, margin: '24px 0 0' }}>
        {adminLink && (
          <Button href={adminLink} style={cta}>
            Open admin payments
          </Button>
        )}
        {invoiceUrl && (
          <Text style={{ ...footerNote, margin: '12px 0 0' }}>
            <Link href={invoiceUrl} style={link}>
              Open invoice in Stripe
            </Link>
          </Text>
        )}
        {userId && (
          <Text style={{ ...footerNote, margin: '6px 0 0' }}>User ID: {userId}</Text>
        )}
      </Section>

      <Text style={footerNote}>
        You are receiving this because you are the platform administrator.
      </Text>
    </EmailLayout>
  )
}

export default AdminPaymentReceivedEmail

export const template = {
  component: AdminPaymentReceivedEmail,
  subject: (data: Record<string, any>) =>
    `Payment received${data?.email ? `: ${data.email}` : ''}${
      data?.amount ? ` (${(data.currency || 'EUR').toUpperCase()} ${data.amount})` : ''
    }`,
  displayName: 'Admin: payment received notification',
  to: '3xvisibility@gmail.com',
  previewData: {
    name: 'Jane Doe',
    email: 'jane@example.com',
    userId: '00000000-0000-0000-0000-000000000000',
    customerId: 'cus_example123',
    planName: 'Agency Plan',
    amount: '49.00',
    currency: 'EUR',
    invoiceNumber: 'INV-2026-01001',
    paidAt: new Date().toISOString(),
    invoiceUrl: 'https://dashboard.stripe.com/invoices/in_example',
    origin: 'https://3xvisibility.com',
  },
} satisfies TemplateEntry
