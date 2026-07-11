// Shared CRM types and zero-state exports.
// Real records should come from Supabase/API routes, not bundled seed data.

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

export interface PropertyUnitConfiguration {
  configuration: string
  bedrooms?: number | null
  area_sqft?: string | null
  carpet_area_sqft?: string | null
  basic_rate?: string | null
  price?: string | null
  price_min?: number | null
}

export interface PropertyPlotSize {
  superbuilt_area?: string | null
  carpet_area?: string | null
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
  relevance?: string
  sampleHouse?: boolean
  towerCount?: number | null
  storeys?: string | null
  totalUnits?: string | null
  unitsPerFloor?: string | null
  specifications?: string | null
  plotSize?: PropertyPlotSize | null
  unitConfigurations?: PropertyUnitConfiguration[]
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
  metaAdsSpend: number
  metaAdsLeads: number
  costPerLead: number
}

export const metaLeads: MetaLead[] = []
export const leadNotes: LeadNote[] = []
export const employeeActivities: EmployeeActivity[] = []
export const employeeGoals: EmployeeGoal[] = []
export const reminders: Reminder[] = []
export const propertyCallScripts: PropertyCallScript[] = []
export const propertyAppreciations: PropertyAppreciation[] = []
export const employees: Employee[] = []
export const leads: Lead[] = []
export const leadGroups: LeadGroup[] = []
export const whatsappConversations: WhatsAppConversation[] = []
export const properties: Property[] = []
export const siteVisits: SiteVisit[] = []
export const scripts: Script[] = [
  {
    id: 'luxury-project-ahmedabad-first-call',
    title: 'Luxury Project in Ahmedabad',
    category: 'first_call',
    content: `Script for Luxury Project in Ahmedabad

SM: Hi Sir, this is ______. Aapko actually invite karne ke liye call kiya hai.

Beech mein aapka inquiry aaya tha apna Luxury Project hai, Ahmedabad me, uske liye.

Facebook, Instagram par aapne shayad ad dekha hoga. Usme aapne inquiry kiya tha.

So usi ke liye ek to aapko invite karna tha and dusra jaan na tha ki aap kya dekh rahe hain, 4 BHK dekh rahe hain ya 5 BHK dekh rahe hain?

Customer replies:

Okay 4 BHK, thik hai.

And mota mota kya budget mein dekh rahe hain?

Customer replies:

5 Cr? Okay theek hai.

To apna yeh jo project hai na Sir, this is a beautiful gated community of luxury apartments.

Ismein 4 and 5 BHK options milenge aapko.

Plus saari club-class amenities rahengi society mein jaise swimming pool, club house, gym, library, yoga deck, meditation, mini theatre, kids play area, garden, banquet hall, etc.

Apna jo 4 BHK hai yeh approximately 5700 sqft ka hai, and 5 BHK jo hai woh approx 7500 sqft ka hai.

Possession jo hai woh aapko 2.5 years mein milega.

So hum log abhi kya kar rahe hain na Sir, ki jo clients interest dikha rahe hain, hum unko personally invite karte hain site visit ke liye aur yahi par unko sari details jaise layout, brochure, elevation, video, sab share karte hain.

So just ek 30 minutes ka time lungi aapka. Kya time aapko convenient rahega site visit ke liye?

Kal 11:00 baje, 12:00 baje?

Customer replies:

12 baje?

Theek hai, to kal 12:00 baje ka aapka appointment confirm rakhti hu. Us time par fir aur kisi ka appointment nahi leti so that aapko wait karne ki jarurat na pade.

Thodi der mein aapko Appointment Confirmation Code and Google Map Location dono WhatsApp pe aa jayenge.

And just to know you well Sir, aapka kis cheez ka business hai?

Customer replies:

Ok great, and abhi kaha rehte hai?

Customer replies:

Chalo perfect.

Milte hai kal 12:00 baje Sir.
Thank you!

Then send a "Pleasure talking wala" message on WhatsApp immediately.`,
    tags: ['luxury project', 'ahmedabad', 'site visit', '4 BHK', '5 BHK', 'hinglish'],
    usageCount: 0,
  },
]
export const hniClients: HniClient[] = []
export const bookings: Booking[] = []

export const dashboardStats: DashboardStats = {
  totalRevenue: 0,
  revenueGrowth: 0,
  totalLeads: 0,
  leadGrowth: 0,
  conversionRate: 0,
  conversionGrowth: 0,
  activeDeals: 0,
  dealGrowth: 0,
  avgDealSize: 0,
  targetAchievement: 0,
  whatsappMessages: 0,
  siteVisits: 0,
  metaAdsSpend: 0,
  metaAdsLeads: 0,
  costPerLead: 0,
}

export const revenueData: { month: string; revenue: number; leads: number; conversions: number }[] = []

export const metaAdsData = {
  campaigns: [] as { name: string; spend: number; leads: number; cpl: number; quality: 'high' | 'medium' | 'low' }[],
  totalSpend: 0,
  totalLeads: 0,
  avgCPL: 0,
  impressions: 0,
  clicks: 0,
  ctr: 0,
}

export const locations: string[] = []

export const budgetRanges = [
  { label: 'Under ₹2 Cr', min: 0, max: 20000000 },
  { label: '₹2 Cr - ₹5 Cr', min: 20000000, max: 50000000 },
  { label: '₹5 Cr - ₹10 Cr', min: 50000000, max: 100000000 },
  { label: '₹10 Cr - ₹25 Cr', min: 100000000, max: 250000000 },
  { label: '₹25 Cr - ₹50 Cr', min: 250000000, max: 500000000 },
  { label: 'Above ₹50 Cr', min: 500000000, max: Infinity },
]

export const propertyTypes: { label: string; value: PropertyType }[] = [
  { label: 'Apartment', value: 'apartment' },
  { label: 'Penthouse', value: 'penthouse' },
  { label: 'Bungalow', value: 'bungalow' },
  { label: 'Villa', value: 'villa' },
  { label: 'Commercial', value: 'commercial' },
  { label: 'Farmhouse', value: 'farmhouse' },
  { label: 'Duplex', value: 'duplex' },
  { label: 'Studio', value: 'studio' },
  { label: 'Plot', value: 'plot' },
]

export function formatCurrency(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`
  return `₹${amount.toLocaleString('en-IN')}`
}

export function formatNumber(num: number): string {
  return num.toLocaleString('en-IN')
}

export function getStatusColor(status: LeadStatus): string {
  const colors: Record<LeadStatus, string> = {
    new: 'bg-info/10 text-info border-info/20',
    contacted: 'bg-warning/10 text-warning border-warning/20',
    qualified: 'bg-primary/10 text-primary border-primary/20',
    negotiation: 'bg-chart-2/10 text-chart-2 border-chart-2/20',
    won: 'bg-success/10 text-success border-success/20',
    lost: 'bg-destructive/10 text-destructive border-destructive/20',
  }
  return colors[status]
}

export function getTagColor(tag: LeadTag): string {
  const colors: Record<LeadTag, string> = {
    duplicate: 'bg-warning/10 text-warning border-warning/30',
    cp: 'bg-chart-3/10 text-chart-3 border-chart-3/30',
    broker: 'bg-destructive/10 text-destructive border-destructive/30',
    fake: 'bg-destructive/20 text-destructive border-destructive/40',
    vip: 'bg-gold/10 text-gold border-gold/30',
    hot: 'bg-chart-5/10 text-chart-5 border-chart-5/30',
  }
  return colors[tag]
}

export function getEmployeeById(id: string): Employee | undefined {
  return employees.find(e => e.id === id)
}

export function getPropertyById(id: string): Property | undefined {
  return properties.find(p => p.id === id)
}

export function getLeadById(id: string): Lead | undefined {
  return leads.find(l => l.id === id)
}

export function getLeadGroupById(id: string): LeadGroup | undefined {
  return leadGroups.find(g => g.id === id)
}

export function getProjectCategoryColor(category: ProjectCategory): string {
  const colors: Record<ProjectCategory, string> = {
    apartment: 'bg-info/10 text-info border-info/20',
    bungalow: 'bg-primary/10 text-primary border-primary/20',
    commercial: 'bg-chart-3/10 text-chart-3 border-chart-3/20',
    villa: 'bg-success/10 text-success border-success/20',
    penthouse: 'bg-destructive/10 text-destructive border-destructive/20',
    farmhouse: 'bg-green-500/10 text-green-600 border-green-500/20',
    plot: 'bg-lime-500/10 text-lime-600 border-lime-500/20',
    general_live: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  }
  return colors[category]
}

export function getProjectCategoryLabel(category: ProjectCategory): string {
  const labels: Record<ProjectCategory, string> = {
    apartment: 'Apartment',
    bungalow: 'Bungalow',
    commercial: 'Commercial',
    villa: 'Villa',
    penthouse: 'Penthouse',
    farmhouse: 'Farmhouse',
    plot: 'Plot',
    general_live: 'General Live',
  }
  return labels[category]
}

export function getWhatsAppConversationByLeadId(leadId: string): WhatsAppConversation | undefined {
  return whatsappConversations.find(c => c.leadId === leadId)
}

export function getSentimentColor(sentiment: 'hot' | 'warm' | 'neutral' | 'cold'): string {
  const colors = {
    hot: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    warm: 'text-primary bg-primary/10 border-primary/20',
    neutral: 'text-muted-foreground bg-muted border-border',
    cold: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  }
  return colors[sentiment]
}

export function getTrendIcon(trend: SentimentTrend): { icon: string; color: string; label: string } {
  const trends = {
    heating_up: { icon: 'TrendingUp', color: 'text-success', label: 'Heating Up' },
    cooling_down: { icon: 'TrendingDown', color: 'text-destructive', label: 'Cooling Down' },
    stable: { icon: 'Minus', color: 'text-muted-foreground', label: 'Stable' },
    critical: { icon: 'AlertTriangle', color: 'text-warning', label: 'Critical - Action Needed' },
  }
  return trends[trend]
}

export const callingScripts = scripts.map(s => ({
  id: s.id,
  title: s.title,
  category: s.category === 'first_call' ? 'Cold Call' :
            s.category === 'follow_up' ? 'Follow Up' :
            s.category === 'objection' ? 'Objection Handling' :
            s.category === 'vip' ? 'Site Visit' :
            s.category === 'negotiation' ? 'Negotiation' : 'Closing',
  content: s.content,
  language: s.tags.includes('hinglish') ? 'Hinglish' : 'English',
  tips: s.tags.map(tag => `Best used for ${tag} scenarios`),
}))

export const siteVisitsFormatted = siteVisits.map(sv => ({
  id: sv.id,
  leadId: sv.leadId,
  propertyId: sv.propertyId,
  employeeId: sv.employeeId,
  date: sv.scheduledDate.toISOString().split('T')[0],
  time: sv.scheduledDate.toTimeString().slice(0, 5),
  status: sv.status,
}))

export const employeesUI = employees.map(emp => ({
  ...emp,
  phone: emp.phone,
  email: emp.email,
  role: emp.role === 'sales_executive' ? 'Sales Executive' :
        emp.role === 'senior_consultant' ? 'Senior Consultant' :
        emp.role === 'team_lead' ? 'Team Lead' :
        emp.role === 'manager' ? 'Manager' : 'Admin',
  performance: emp.leadsAssigned > 0 ? Math.round((emp.leadsConverted / emp.leadsAssigned) * 100) : 0,
  conversions: emp.leadsConverted,
  status: emp.status === 'online' ? 'active' as const : 'inactive' as const,
}))
