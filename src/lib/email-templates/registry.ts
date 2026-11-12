import type { ComponentType } from 'react'
import { template as organizationInvitation } from './organization-invitation'
import { template as tournamentAccessCode } from './tournament-access-code'
import { template as tournamentReminder } from './tournament-reminder'

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
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'tournament-access-code': tournamentAccessCode,
  'organization-invitation': organizationInvitation,
  'tournament-reminder': tournamentReminder,
}
