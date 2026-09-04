/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { Button, Heading, Section, Text } from 'npm:@react-email/components@0.0.22'

import type { TemplateEntry } from './registry.ts'
import { EmailLayout, card, cta, h1, label, text, value, footerNote } from './_layout.tsx'

interface InvoiceDocumentProps {
  name?: string
  email?: string
  invoiceNumber?: string
  amount?: string
  issuedAt?: string
  planName?: string
  pdfUrl?: string
  origin?: string
}

export const InvoiceDocumentEmail = ({
  name,
  email,
  invoiceNumber,
  amount,
  issuedAt,
  planName,
  pdfUrl,
  origin,
}: InvoiceDocumentProps) => {
  const billingLink = origin ? `${origin}/billing` : ''

  return (
    <EmailLayout preview={`Your invoice ${invoiceNumber || ''}`}>
      <Heading style={h1}>Your invoice is ready</Heading>
      <Text style={text}>Hi{name ? ` ${name}` : ''},</Text>
      <Text style={text}>
        Please find your invoice (facture) below. It is a French-compliant PDF including VAT
        details and a QR code for instant verification.
      </Text>

      <Section style={card}>
        {invoiceNumber && (
          <>
            <Text style={label}>Invoice number</Text>
            <Text style={value}>{invoiceNumber}</Text>
          </>
        )}
        {planName && (
          <>
            <Text style={label}>Item</Text>
            <Text style={value}>{planName}</Text>
          </>
        )}
        {amount && (
          <>
            <Text style={label}>Total (incl. VAT)</Text>
            <Text style={value}>{amount}</Text>
          </>
        )}
        {issuedAt && (
          <>
            <Text style={label}>Issue date</Text>
            <Text style={{ ...value, margin: '0' }}>
              {new Date(issuedAt).toLocaleDateString('fr-FR', { dateStyle: 'long' })}
            </Text>
          </>
        )}
      </Section>

      {pdfUrl && (
        <Section style={{ textAlign: 'center' as const, margin: '24px 0 0' }}>
          <Button href={pdfUrl} style={cta}>
            Download the PDF invoice
          </Button>
        </Section>
      )}

      {billingLink && (
        <Text style={{ ...text, textAlign: 'center' as const, fontSize: '13px' }}>
          All your invoices are also available in your <a href={billingLink}>billing page</a>.
        </Text>
      )}

      <Text style={footerNote}>
        VERODAV GROUP (3xvisibility) — SIRET 843 715 954 00027 — VAT FR95 843715954. Sent to{' '}
        {email || 'your account email'}.
      </Text>
    </EmailLayout>
  )
}

export default InvoiceDocumentEmail

export const template = {
  component: InvoiceDocumentEmail,
  subject: (data: Record<string, any>) =>
    `Your invoice ${data?.invoiceNumber || ''}`.trim(),
  displayName: 'Invoice PDF delivery',
  previewData: {
    name: 'Jane',
    email: 'jane@example.com',
    invoiceNumber: 'INV-2026-00042',
    amount: '49,00 €',
    issuedAt: new Date().toISOString(),
    planName: 'Pro plan — monthly',
    pdfUrl: 'https://example.com/invoice.pdf',
    origin: 'https://3xvisibility.com',
  },
} satisfies TemplateEntry
