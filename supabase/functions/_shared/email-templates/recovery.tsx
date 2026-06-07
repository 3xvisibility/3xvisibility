/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { Button, Heading, Section, Text } from 'npm:@react-email/components@0.0.22'

import { EmailLayout, cta, h1, text, footerNote } from './_layout.tsx'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <EmailLayout preview={`Reset your password for ${siteName}`}>
    <Heading style={h1}>Reset your password</Heading>
    <Text style={text}>
      We received a request to reset your password for {siteName}. Click the button below to
      choose a new password.
    </Text>
    <Section style={{ margin: '4px 0 0' }}>
      <Button style={cta} href={confirmationUrl}>
        Reset Password
      </Button>
    </Section>
    <Text style={footerNote}>
      If you didn't request a password reset, you can safely ignore this email. Your password
      will not be changed.
    </Text>
  </EmailLayout>
)

export default RecoveryEmail
