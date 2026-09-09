/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { Heading, Hr, Link, Section, Text } from 'npm:@react-email/components@0.0.22'

import type { TemplateEntry } from './registry.ts'
import {
  EmailLayout,
  card,
  h1,
  hr,
  label,
  link,
  text,
  value,
  footerNote,
} from './_layout.tsx'

interface AdminAnalyzerLeadProps {
  url?: string
  host?: string
  pageTitle?: string
  overallScore?: number | string
  seoScore?: number | string
  aiScore?: number | string
  technicalScore?: number | string
  issueCount?: number | string
  topIssues?: string[]
  email?: string
  userEmail?: string
  referrer?: string
  userAgent?: string
  analyzedAt?: string
}

export const AdminAnalyzerLeadEmail = ({
  url,
  host,
  pageTitle,
  overallScore,
  seoScore,
  aiScore,
  technicalScore,
  issueCount,
  topIssues,
  email,
  userEmail,
  referrer,
  userAgent,
  analyzedAt,
}: AdminAnalyzerLeadProps) => (
  <EmailLayout preview={`Website analyzed: ${host || url || 'unknown site'}`}>
    <Heading style={h1}>New website analysis (lead)</Heading>
    <Text style={text}>
      Someone just ran the free website analyzer on your homepage. Here is everything we captured.
    </Text>

    <Section style={card}>
      <Text style={label}>Website</Text>
      <Text style={value}>
        {url ? (
          <Link href={url} style={link}>
            {url}
          </Link>
        ) : (
          '—'
        )}
      </Text>

      <Text style={label}>Page title</Text>
      <Text style={value}>{pageTitle || '—'}</Text>

      <Hr style={hr} />

      <Text style={label}>Contact email (entered)</Text>
      <Text style={value}>
        {email ? (
          <Link href={`mailto:${email}`} style={link}>
            {email}
          </Link>
        ) : (
          'not provided'
        )}
      </Text>

      <Text style={label}>Signed-in account</Text>
      <Text style={value}>{userEmail || 'anonymous visitor'}</Text>

      <Hr style={hr} />

      <Text style={label}>Scores</Text>
      <Text style={value}>
        Overall {overallScore ?? '—'} · SEO {seoScore ?? '—'} · AI/GEO {aiScore ?? '—'} · Technical{' '}
        {technicalScore ?? '—'}
      </Text>

      <Text style={label}>Issues found</Text>
      <Text style={value}>{issueCount ?? '—'}</Text>

      {topIssues && topIssues.length > 0 ? (
        <>
          <Text style={label}>Top issues</Text>
          {topIssues.map((issue, i) => (
            <Text key={i} style={value}>
              • {issue}
            </Text>
          ))}
        </>
      ) : null}

      <Hr style={hr} />

      <Text style={label}>Came from</Text>
      <Text style={value}>{referrer || 'direct'}</Text>

      <Text style={label}>Browser</Text>
      <Text style={value}>{userAgent || '—'}</Text>

      <Text style={label}>Analyzed at</Text>
      <Text style={value}>{analyzedAt || new Date().toISOString()}</Text>
    </Section>

    <Text style={footerNote}>
      This lead is also saved in your admin dashboard under “Analyzer leads”.
    </Text>
  </EmailLayout>
)

export default AdminAnalyzerLeadEmail

export const template = {
  component: AdminAnalyzerLeadEmail,
  subject: (data: Record<string, any>) =>
    `Website analyzed: ${data?.host || data?.url || 'unknown site'}${
      data?.email ? ` — ${data.email}` : ''
    }`,
  displayName: 'Admin: website analyzer lead',
  to: '3xvisibility@gmail.com',
  previewData: {
    url: 'https://example.com',
    host: 'example.com',
    pageTitle: 'Example Domain',
    overallScore: 62,
    seoScore: 70,
    aiScore: 45,
    technicalScore: 75,
    issueCount: 7,
    topIssues: ['Meta description — Missing meta description', 'Structured data (JSON-LD) — No schema markup'],
    email: 'visitor@example.com',
    userEmail: '',
    referrer: 'https://google.com',
    userAgent: 'Mozilla/5.0',
    analyzedAt: new Date().toISOString(),
  },
} satisfies TemplateEntry
