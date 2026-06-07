import type { ComponentType } from 'npm:react@18.3.1'

import { template as contactNotification } from './contact-notification.tsx'
import { template as contactReply } from './contact-reply.tsx'
import { template as adminSignupNotification } from './admin-signup-notification.tsx'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  // Optional fixed recipient. When set, the email always goes to this address
  // regardless of the caller-provided recipientEmail (used for admin notifications).
  to?: string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'contact-notification': contactNotification,
  'contact-reply': contactReply,
  'admin-signup-notification': adminSignupNotification,
}
