/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { Heading, Section, Text } from 'npm:@react-email/components@0.0.22'

import { EmailLayout, h1, text, footerNote } from './_layout.tsx'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <EmailLayout preview="Your verification code">
    <Heading style={h1}>Confirm reauthentication</Heading>
    <Text style={text}>Use the code below to confirm your identity:</Text>
    <Section style={codeWrap}>
      <Text style={codeStyle}>{token}</Text>
    </Section>
    <Text style={footerNote}>
      This code will expire shortly. If you didn't request this, you can safely ignore this
      email.
    </Text>
  </EmailLayout>
)

export default ReauthenticationEmail

const codeWrap = {
  border: '1px solid hsl(220, 13%, 91%)',
  borderRadius: '12px',
  backgroundColor: 'hsl(220, 20%, 98%)',
  padding: '18px',
  textAlign: 'center' as const,
}
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '30px',
  letterSpacing: '6px',
  fontWeight: 'bold' as const,
  color: 'hsl(252, 40%, 10%)',
  margin: '0',
}
