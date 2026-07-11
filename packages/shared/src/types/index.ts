// Core domain types shared across apps/web and apps/api

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'negotiation' | 'won' | 'lost'
export type SentimentTrend = 'heating_up' | 'cooling_down' | 'stable' | 'critical'
export type LeadSource = 'meta_ads' | 'google_ads' | 'referral' | 'website' | 'whatsapp' | 'walk_in'
export type LeadTag = 'duplicate' | 'cp' | 'broker' | 'fake' | 'vip' | 'hot'
export type PropertyType = 'apartment' | 'penthouse' | 'bungalow' | 'villa' | 'commercial' | 'farmhouse' | 'duplex' | 'studio' | 'plot'
export type ProjectCategory = 'apartment' | 'bungalow' | 'commercial' | 'villa' | 'penthouse' | 'farmhouse' | 'plot' | 'general_live'

export interface WhatsAppMessage {
  id: string
  content: string
  sender: 'lead' | 'employee'
  employeeId?: string
  timestamp: Date
  status: 'sent' | 'delivered' | 'read'
  type: 'text' | 'image' | 'document' | 'voice' | 'location'
  sentiment?: 'positive' | 'neutral' | 'negative'
  aiAnalysis?: {
    intent: string
    urgency: 'high' | 'medium' | 'low'
    suggestedAction?: string
  }
}

export interface WhatsAppConversation {
  id: string
  leadId: string
  messages: WhatsAppMessage[]
  lastMessageAt: Date
  employeeHistory: {
    employeeId: string
    employeeName: string
    messageCount: number
    firstMessageAt: Date
    lastMessageAt: Date
  }[]
  aiSentiment: {
    current: 'hot' | 'warm' | 'neutral' | 'cold'
    trend: SentimentTrend
    confidence: number
    reasoning: string
    predictedStatus: LeadStatus
    riskFactors: string[]
    opportunities: string[]
  }
  stats: {
    totalMessages: number
    responseRate: number
    avgResponseTime: number
    engagementScore: number
  }
}

export interface LeadGroup {
  id: string
  name: string
  projectCategory: ProjectCategory
  description?: string
  createdAt: Date
  leadIds: string[]
  assignedEmployees: string[]
}

export interface LeadInteraction {
  id: string
  timestamp: Date
  employeeId: string
  type: 'call' | 'whatsapp' | 'email' | 'meeting' | 'site_visit' | 'assignment' | 'note'
  outcome?: 'connected' | 'no_answer' | 'callback_requested' | 'interested' | 'not_interested' | 'follow_up'
  notes?: string
  duration?: number
}

export interface LeadAssignmentHistory {
  id: string
  employeeId: string
  employeeName: string
  assignedAt: Date
  unassignedAt?: Date
  reason?: string
}

export interface MetaLead {
  id: string
  name: string
  email: string
  phone: string
  adCampaign: string
  adSet: string
  formData: {
    propertyInterest: string
    budget: string
    location: string
    message?: string
  }
  receivedAt: Date
  status: 'pending' | 'assigned' | 'rejected'
  assignedTo?: string
  assignedAt?: Date
  linkedPropertyId?: string
  scheduledCallTime?: Date
  interactions: LeadInteraction[]
  assignmentHistory: LeadAssignmentHistory[]
  firstContactDate?: Date
  lastContactDate?: Date
  preferredContactTime?: string
  notes?: string
}

export interface LeadNote {
  id: string
  leadId: string
  employeeId: string
  content: string
  type: 'call' | 'meeting' | 'general' | 'follow_up'
  createdAt: Date
}

export interface EmployeeActivity {
  id: string
  employeeId: string
  type: 'call' | 'meeting' | 'site_visit' | 'email' | 'whatsapp' | 'note' | 'lead_update'
  description: string
  leadId?: string
  leadName?: string
  duration?: number
  outcome?: 'positive' | 'neutral' | 'negative'
  timestamp: Date
}

export interface EmployeeGoal {
  id: string
  employeeId: string
  title: string
  target: number
  current: number
  unit: string
  period: 'daily' | 'weekly' | 'monthly'
}

export interface Reminder {
  id: string
  userId: string
  title: string
  description?: string
  dueDate: Date
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'completed'
  category: 'call' | 'meeting' | 'follow_up' | 'task' | 'personal'
  relatedLeadId?: string
}

export interface PropertyCallScript {
  propertyId: string
  introduction: string
  keyHighlights: string[]
  priceJustification: string
  objectionHandling: { objection: string; response: string }[]
  closingStatement: string
}

export interface PropertyAppreciation {
  propertyId: string
  historicalRates: { year: number; rate: number }[]
  projectedRates: { years: number; estimatedValue: number; appreciationPercent: number }[]
  locationFactors: string[]
  investmentScore: number
}

export interface Lead {
  id: string
  name: string
  email: string
  phone: string
  avatar?: string
  source: LeadSource
  status: LeadStatus
  tags: LeadTag[]
  propertyInterest: PropertyType[]
  budget: string
  budgetMin: number
  budgetMax: number
  location: string
  aiScore: number
  whatsappStatus?: 'active' | 'inactive'
  assignedTo?: string
  createdAt: Date
  lastContact?: Date
  nextFollowUp?: Date
  notes?: string
  callStatus?: 'spoken' | 'not_spoken' | 'call_back_later'
  siteVisitStatus?: 'scheduled' | 'completed' | 'not_scheduled'
  buyingStatus?: 'ready' | 'exploring' | 'not_ready'
  budgetRange?: string
  configuration?: string[]
  profession?: string
  currentCity?: string
  currentArea?: string
  hwcRating?: 'hot' | 'warm' | 'cold'
  qualitativeRemarks?: string
}

export interface Employee {
  id: string
  name: string
  email: string
  phone: string
  role: 'sales_executive' | 'senior_consultant' | 'team_lead' | 'manager' | 'admin'
  status: 'online' | 'offline' | 'busy' | 'away'
  avatar?: string
  leadsAssigned: number
  leadsConverted: number
  revenue: number
  target: number
  joinDate: Date
}

export interface Property {
  id: string
  name: string
  type: PropertyType
  location: string
  area: string
  price: number
  pricePerSqft: number
  bedrooms: number
  bathrooms: number
  sqft: number
  status: 'available' | 'sold' | 'reserved' | 'upcoming'
  roi: number
  images: string[]
  amenities: string[]
  developer: string
  completionDate: string
  featured: boolean
}

export interface SiteVisit {
  id: string
  leadId: string
  leadName: string
  propertyId: string
  propertyName: string
  employeeId: string
  employeeName: string
  scheduledDate: Date
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  feedback?: string
  rating?: number
}

export interface Script {
  id: string
  title: string
  category: 'first_call' | 'follow_up' | 'objection' | 'vip' | 'negotiation' | 'luxury_psychology'
  content: string
  tags: string[]
  usageCount: number
}

export interface HniClient {
  id: string
  name: string
  email: string
  phone: string
  occupation: string
  location: string
  tier: 'platinum' | 'gold' | 'silver'
  portfolioValue: number
  propertiesOwned: number
  since: string
  preferences: string[]
}

export interface Booking {
  id: string
  leadId: string
  propertyId: string
  date: string
  amount: number
  commission: number
  status: 'confirmed' | 'pending' | 'cancelled'
}

export interface DashboardStats {
  totalRevenue: number
  revenueGrowth: number
  totalLeads: number
  leadGrowth: number
  conversionRate: number
  conversionGrowth: number
  activeDeals: number
  dealGrowth: number
  avgDealSize: number
  targetAchievement: number
  whatsappMessages: number
  siteVisits: number
}
