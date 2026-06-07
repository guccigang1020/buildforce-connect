import type { ComponentType } from "react";

export interface TemplateEntry {
  component: ComponentType<Record<string, unknown>>;
  subject: string | ((data: Record<string, unknown>) => string);
  displayName?: string;
  previewData?: Record<string, unknown>;
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string;
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 *
 * Example:
 *   import { template as welcomeTemplate } from './welcome'
 *   // then add to TEMPLATES: 'welcome': welcomeTemplate
 */
import { template as offerSubmitted } from "./offer-submitted";
import { template as offerAwarded } from "./offer-awarded";
import { template as offerRejected } from "./offer-rejected";
import { template as newJobRequest } from "./new-job-request";
import { template as contractorApproved } from "./contractor-approved";
import { template as contractorRejected } from "./contractor-rejected";
import { template as welcome } from "./welcome";

export const TEMPLATES: Record<string, TemplateEntry> = {
  "offer-submitted": offerSubmitted,
  "offer-awarded": offerAwarded,
  "offer-rejected": offerRejected,
  "new-job-request": newJobRequest,
  "contractor-approved": contractorApproved,
  "contractor-rejected": contractorRejected,
  welcome: welcome,
};
