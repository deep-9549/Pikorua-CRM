import { z } from 'zod'

// ── Enums ─────────────────────────────────────────────────────────────────────

export const leadStatusSchema = z.enum(['new', 'contacted', 'qualified', 'negotiation', 'won', 'lost'])
export const leadSourceSchema = z.enum(['meta_ads', 'google_ads', 'referral', 'website', 'whatsapp', 'walk_in'])
export const leadTagSchema = z.enum(['duplicate', 'cp', 'broker', 'fake', 'vip', 'hot'])
export const propertyTypeSchema = z.enum(['apartment', 'penthouse', 'bungalow', 'villa', 'commercial', 'farmhouse', 'duplex', 'studio', 'plot'])
export const projectCategorySchema = z.enum(['apartment', 'bungalow', 'commercial', 'villa', 'penthouse', 'farmhouse', 'plot', 'general_live'])

// ── Meta Lead ─────────────────────────────────────────────────────────────────

export const createMetaLeadSchema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email().optional().nullable(),
  city: z.string().optional().nullable(),
  campaign_name: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const assignLeadSchema = z.object({
  assigned_to: z.string().uuid('Must be a valid user ID'),
})

export const bulkAssignLeadSchema = z.object({
  lead_ids: z.array(z.string().uuid()).min(1, 'At least one lead ID required'),
  assigned_to: z.string().uuid('Must be a valid user ID'),
})

// ── Lead CRM Details ──────────────────────────────────────────────────────────

export const updateLeadCrmSchema = z.object({
  call_status: z.enum(['spoken', 'not_spoken', 'call_back_later']).optional().nullable(),
  hwc: z.enum(['hot', 'warm', 'cold']).optional().nullable(),
  follow_up_date: z.string().datetime().optional().nullable(),
  buying_status: z.enum(['ready', 'exploring', 'not_ready']).optional().nullable(),
  site_visit_status: z.enum(['scheduled', 'completed', 'not_scheduled']).optional().nullable(),
  budget_range: z.string().optional().nullable(),
  profession: z.string().optional().nullable(),
  current_city: z.string().optional().nullable(),
  current_area: z.string().optional().nullable(),
})

// ── Site Visit ────────────────────────────────────────────────────────────────

export const createSiteVisitSchema = z.object({
  lead_id: z.string().uuid(),
  property_id: z.string().uuid().optional().nullable(),
  employee_id: z.string().uuid(),
  scheduled_date: z.string().datetime(),
  notes: z.string().optional().nullable(),
})

export const updateSiteVisitSchema = z.object({
  status: z.enum(['scheduled', 'completed', 'cancelled', 'no_show']).optional(),
  feedback: z.string().optional().nullable(),
  rating: z.number().min(1).max(5).optional().nullable(),
})

// ── Employee ──────────────────────────────────────────────────────────────────

export const employeeRoleSchema = z.enum(['sales_executive', 'senior_consultant', 'team_lead', 'manager', 'admin'])

// ── User / Client ─────────────────────────────────────────────────────────────

export const updateClientStatusSchema = z.object({
  status: z.string().min(1),
})

// ── Pagination ────────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
