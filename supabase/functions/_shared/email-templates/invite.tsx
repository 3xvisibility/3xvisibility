/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { Button, Heading, Link, Section, Text } from 'npm:@react-email/components@0.0.22'

import { EmailLayout, cta, h1, link, text, footerNote } from './_layout.tsx'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: InviteEmailProps) => (
  <EmailLayout preview={`You've been invited to join ${siteName}`}>
    <Heading style={h1}>You've been invited</Heading>
    <Text style={text}>
      You've been invited to join{' '}
      <Link href={siteUrl} style={link}>
        <strong>{siteName}</strong>
      </Link>
      . Click the button below to accept the invitation and create your account.
    </Text>
    <Section style={{ margin: '4px 0 0' }}>
      <Button style={cta} href={confirmationUrl}>
        Accept Invitation
      </Button>
    </Section>
    <Text style={footerNote}>
      If you weren't expecting this invitation, you can safely ignore this email.
    </Text>
  </EmailLayout>
)

export default InviteEmail
