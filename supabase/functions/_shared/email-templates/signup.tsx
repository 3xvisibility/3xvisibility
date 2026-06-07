/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { Button, Heading, Link, Section, Text } from 'npm:@react-email/components@0.0.22'

import { EmailLayout, cta, h1, link, text, footerNote } from './_layout.tsx'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <EmailLayout preview={`Confirm your email for ${siteName}`}>
    <Heading style={h1}>Confirm your email</Heading>
    <Text style={text}>
      Thanks for signing up for{' '}
      <Link href={siteUrl} style={link}>
        <strong>{siteName}</strong>
      </Link>
      !
    </Text>
    <Text style={text}>
      Please confirm your email address (
      <Link href={`mailto:${recipient}`} style={link}>
        {recipient}
      </Link>
      ) by clicking the button below:
    </Text>
    <Section style={{ margin: '4px 0 0' }}>
      <Button style={cta} href={confirmationUrl}>
        Verify Email
      </Button>
    </Section>
    <Text style={footerNote}>
      If you didn't create an account, you can safely ignore this email.
    </Text>
  </EmailLayout>
)

export default SignupEmail
