import type { ComponentType } from 'react'
import { template as welcome } from './welcome'
import { template as contractorApproved } from './contractor-approved'
import { template as contractorRejected } from './contractor-rejected'
import { template as newJobRequest } from './new-job-request'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 *
 * Example:
 *   import { template as welcomeTemplate } from './welcome'
 *   // then add to TEMPLATES: 'welcome': welcomeTemplate
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  welcome,
  'contractor-approved': contractorApproved,
  'contractor-rejected': contractorRejected,
  'new-job-request': newJobRequest,
}
