import type { ComponentType } from 'npm:react@18.3.1'

import { template as contactNotification } from './contact-notification.tsx'
import { template as contactReply } from './contact-reply.tsx'
import { template as adminSignupNotification } from './admin-signup-notification.tsx'
import { template as adminResetNotification } from './admin-reset-notification.tsx'
import { template as adminResetCompleted } from './admin-reset-completed.tsx'
import { template as passwordResetConfirmation } from './password-reset-confirmation.tsx'
import { template as paymentReceipt } from './payment-receipt.tsx'
import { template as paymentFailed } from './payment-failed.tsx'
import { template as adminPaymentFailed } from './admin-payment-failed.tsx'
import { template as subscriptionConfirmation } from './subscription-confirmation.tsx'
import { template as subscriptionCancelled } from './subscription-cancelled.tsx'



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
  'admin-reset-notification': adminResetNotification,
  'admin-reset-completed': adminResetCompleted,
  'password-reset-confirmation': passwordResetConfirmation,
  'payment-receipt': paymentReceipt,
  'payment-failed': paymentFailed,
  'admin-payment-failed': adminPaymentFailed,
  'subscription-confirmation': subscriptionConfirmation,
  'subscription-cancelled': subscriptionCancelled,
}
