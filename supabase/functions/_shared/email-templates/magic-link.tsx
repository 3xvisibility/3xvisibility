/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { Button, Heading, Section, Text } from 'npm:@react-email/components@0.0.22'

import { EmailLayout, cta, h1, text, footerNote } from './_layout.tsx'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <EmailLayout preview={`Your login link for ${siteName}`}>
    <Heading style={h1}>Your login link</Heading>
    <Text style={text}>
      Click the button below to log in to {siteName}. This link will expire shortly.
    </Text>
    <Section style={{ margin: '4px 0 0' }}>
      <Button style={cta} href={confirmationUrl}>
        Log In
      </Button>
    </Section>
    <Text style={footerNote}>
      If you didn't request this link, you can safely ignore this email.
    </Text>
  </EmailLayout>
)

export default MagicLinkEmail
