/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

export const LOGO_URL =
  'https://qmuxdkxdrxevlnckssuw.supabase.co/storage/v1/object/public/ai-images/email%2Flogo-3x.png'

export const BRAND_NAME = '3Xvisibility'
export const BRAND_URL = 'https://3xvisibility.com'

interface EmailLayoutProps {
  preview: string
  children: React.ReactNode
}

export const EmailLayout = ({ preview, children }: EmailLayoutProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={main}>
      <Container style={shell}>
        {/* Branded header */}
        <Section style={header}>
          <Img
            src={LOGO_URL}
            width="44"
            height="44"
            alt={BRAND_NAME}
            style={headerLogo}
          />
          <Text style={headerBrand}>{BRAND_NAME}</Text>
        </Section>

        {/* Content card */}
        <Section style={content}>{children}</Section>

        {/* Branded footer */}
        <Section style={footerWrap}>
          <Text style={footerBrand}>{BRAND_NAME}</Text>
          <Text style={footerText}>
            Automated AI page generation &amp; SEO at scale.
          </Text>
          <Text style={footerText}>
            <Link href={BRAND_URL} style={footerLink}>
              3xvisibility.com
            </Link>
          </Text>
          <Text style={footerMuted}>
            © {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default EmailLayout

/* ---------- shared brand styles ---------- */

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Plus Jakarta Sans', 'Inter', Arial, sans-serif",
  padding: '24px 0',
}

const shell = {
  width: '100%',
  maxWidth: '560px',
  margin: '0 auto',
  borderRadius: '16px',
  overflow: 'hidden' as const,
  border: '1px solid hsl(220, 13%, 91%)',
  backgroundColor: '#ffffff',
}

const header = {
  backgroundColor: 'hsl(222, 47%, 7%)',
  padding: '28px 32px',
  textAlign: 'center' as const,
}

const headerLogo = {
  borderRadius: '12px',
  margin: '0 auto',
  display: 'block',
}

const headerBrand = {
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: 'bold' as const,
  letterSpacing: '-0.01em',
  margin: '12px 0 0',
}

const content = {
  padding: '32px',
}

const footerWrap = {
  borderTop: '1px solid hsl(220, 13%, 91%)',
  backgroundColor: 'hsl(220, 20%, 98%)',
  padding: '24px 32px',
  textAlign: 'center' as const,
}

const footerBrand = {
  fontSize: '13px',
  fontWeight: 'bold' as const,
  color: 'hsl(252, 40%, 12%)',
  margin: '0 0 4px',
}

const footerText = {
  fontSize: '12px',
  color: 'hsl(220, 10%, 50%)',
  lineHeight: '1.5',
  margin: '0 0 2px',
}

const footerLink = { color: 'hsl(217, 60%, 50%)', textDecoration: 'none' }

const footerMuted = {
  fontSize: '11px',
  color: 'hsl(220, 10%, 65%)',
  margin: '10px 0 0',
}

/* ---------- reusable content styles ---------- */

export const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(252, 40%, 10%)',
  margin: '0 0 12px',
}

export const text = {
  fontSize: '14px',
  color: 'hsl(220, 10%, 42%)',
  lineHeight: '1.6',
  margin: '0 0 18px',
}

export const card = {
  border: '1px solid hsl(220, 13%, 91%)',
  borderRadius: '12px',
  padding: '20px 22px',
  backgroundColor: 'hsl(220, 20%, 98%)',
  margin: '0 0 8px',
}

export const label = {
  fontSize: '11px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  color: 'hsl(220, 10%, 55%)',
  margin: '0 0 2px',
}

export const value = {
  fontSize: '14px',
  color: 'hsl(252, 40%, 12%)',
  fontWeight: 'bold' as const,
  margin: '0 0 16px',
}

export const messageStyle = {
  fontSize: '13px',
  color: 'hsl(252, 40%, 12%)',
  lineHeight: '1.6',
  whiteSpace: 'pre-wrap' as const,
  wordBreak: 'break-word' as const,
  margin: '0',
}

export const hr = { borderColor: 'hsl(220, 13%, 91%)', margin: '16px 0' }

export const link = { color: 'hsl(217, 60%, 50%)', textDecoration: 'underline' }

export const cta = {
  backgroundColor: 'hsl(222, 47%, 7%)',
  color: '#ffffff',
  borderRadius: '10px',
  padding: '13px 26px',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  textDecoration: 'none',
  display: 'inline-block',
}

export const footerNote = {
  fontSize: '12px',
  color: 'hsl(220, 10%, 55%)',
  margin: '20px 0 0',
}
