// Lead Types and Data
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'negotiation' | 'won' | 'lost'

// WhatsApp Conversation Types
export type SentimentTrend = 'heating_up' | 'cooling_down' | 'stable' | 'critical'

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
    avgResponseTime: number // in minutes
    engagementScore: number
  }
}
export type LeadSource = 'meta_ads' | 'google_ads' | 'referral' | 'website' | 'whatsapp' | 'walk_in'
export type LeadTag = 'duplicate' | 'cp' | 'broker' | 'fake' | 'vip' | 'hot'
export type PropertyType = 'apartment' | 'penthouse' | 'bungalow' | 'villa' | 'commercial' | 'farmhouse' | 'duplex' | 'studio'

// Project Category for grouping leads
export type ProjectCategory = 'apartment' | 'bungalow' | 'commercial' | 'villa' | 'penthouse' | 'farmhouse' | 'general_live'

// Lead Group for organizing leads by project
export interface LeadGroup {
  id: string
  name: string
  projectCategory: ProjectCategory
  description?: string
  createdAt: Date
  leadIds: string[]
  assignedEmployees: string[]
}

// Meta Lead for Distribution
export interface LeadInteraction {
  id: string
  timestamp: Date
  employeeId: string
  type: 'call' | 'whatsapp' | 'email' | 'meeting' | 'site_visit' | 'assignment' | 'note'
  outcome?: 'connected' | 'no_answer' | 'callback_requested' | 'interested' | 'not_interested' | 'follow_up'
  notes?: string
  duration?: number // in seconds for calls
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
  // New fields for enhanced tracking
  linkedPropertyId?: string
  scheduledCallTime?: Date
  interactions: LeadInteraction[]
  assignmentHistory: LeadAssignmentHistory[]
  firstContactDate?: Date
  lastContactDate?: Date
  preferredContactTime?: string
  notes?: string
}

// Mock Meta Leads (unassigned)
export const metaLeads: MetaLead[] = [
  {
    id: 'meta-1',
    name: 'Aditya Verma',
    email: 'aditya.v@gmail.com',
    phone: '+91 99887 11111',
    adCampaign: 'Luxury Penthouses - Mumbai',
    adSet: 'HNI Targeting',
    formData: {
      propertyInterest: 'Penthouse',
      budget: '5-10 Cr',
      location: 'Bandra West',
      message: 'Looking for sea-facing penthouse'
    },
    receivedAt: new Date(Date.now() - 1000 * 60 * 15),
    status: 'pending',
    linkedPropertyId: 'prop-1',
    scheduledCallTime: new Date(Date.now() + 1000 * 60 * 60 * 2),
    interactions: [],
    assignmentHistory: [],
    preferredContactTime: 'Evening 6-8 PM'
  },
  {
    id: 'meta-2',
    name: 'Pooja Sharma',
    email: 'pooja.s@outlook.com',
    phone: '+91 99887 22222',
    adCampaign: 'Sea-Facing Properties',
    adSet: 'Retargeting',
    formData: {
      propertyInterest: 'Apartment',
      budget: '3-5 Cr',
      location: 'Worli'
    },
    receivedAt: new Date(Date.now() - 1000 * 60 * 45),
    status: 'pending',
    linkedPropertyId: 'prop-2',
    interactions: [],
    assignmentHistory: [],
    preferredContactTime: 'Morning 10-12 PM'
  },
  {
    id: 'meta-3',
    name: 'Karan Malhotra',
    email: 'karan.m@business.com',
    phone: '+91 99887 33333',
    adCampaign: 'BKC Commercial',
    adSet: 'Business Owners',
    formData: {
      propertyInterest: 'Commercial',
      budget: '10-20 Cr',
      location: 'BKC',
      message: 'Need 10,000 sqft office space'
    },
    receivedAt: new Date(Date.now() - 1000 * 60 * 120),
    status: 'pending',
    linkedPropertyId: 'prop-4',
    scheduledCallTime: new Date(Date.now() + 1000 * 60 * 60 * 4),
    interactions: [],
    assignmentHistory: [],
    preferredContactTime: 'Afternoon 2-4 PM'
  },
  {
    id: 'meta-4',
    name: 'Simran Kaur',
    email: 'simran.k@email.com',
    phone: '+91 99887 44444',
    adCampaign: 'Luxury Penthouses - Mumbai',
    adSet: 'Lookalike Audience',
    formData: {
      propertyInterest: 'Villa',
      budget: '8-15 Cr',
      location: 'Juhu'
    },
    receivedAt: new Date(Date.now() - 1000 * 60 * 180),
    status: 'pending',
    linkedPropertyId: 'prop-3',
    interactions: [],
    assignmentHistory: [],
    preferredContactTime: 'Evening 5-7 PM'
  },
  {
    id: 'meta-5',
    name: 'Rohan Gupta',
    email: 'rohan.g@corp.in',
    phone: '+91 99887 55555',
    adCampaign: 'Alibaug Farmhouses',
    adSet: 'Weekend Getaway',
    formData: {
      propertyInterest: 'Farmhouse',
      budget: '5-8 Cr',
      location: 'Alibaug',
      message: 'Want farmhouse for weekend retreats'
    },
    receivedAt: new Date(Date.now() - 1000 * 60 * 240),
    status: 'pending',
    linkedPropertyId: 'prop-5',
    scheduledCallTime: new Date(Date.now() + 1000 * 60 * 60 * 24),
    interactions: [],
    assignmentHistory: [],
    preferredContactTime: 'Weekend mornings'
  },
  // Pre-assigned leads with history (for demo)
  {
    id: 'meta-6',
    name: 'Jitendra p.',
    email: 'jitendra.s@business.com',
    phone: '+91 99887 66666',
    adCampaign: 'Luxury Penthouses - Mumbai',
    adSet: 'HNI Targeting',
    formData: {
      propertyInterest: 'Penthouse',
      budget: '6-12 Cr',
      location: 'Lower Parel',
      message: 'Interested in sky penthouses with city view'
    },
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 72), // 3 days ago
    status: 'assigned',
    assignedTo: 'emp-2',
    assignedAt: new Date(Date.now() - 1000 * 60 * 60 * 70),
    linkedPropertyId: 'prop-7',
    scheduledCallTime: new Date(Date.now() + 1000 * 60 * 60 * 1),
    firstContactDate: new Date(Date.now() - 1000 * 60 * 60 * 68),
    lastContactDate: new Date(Date.now() - 1000 * 60 * 60 * 2),
    preferredContactTime: 'After 7 PM',
    interactions: [
      {
        id: 'int-1',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 70),
        employeeId: 'emp-4',
        type: 'assignment',
        notes: 'Initially assigned to Neha for qualification'
      },
      {
        id: 'int-2',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 68),
        employeeId: 'emp-4',
        type: 'call',
        outcome: 'connected',
        duration: 180,
        notes: 'Initial call - client busy, asked for callback after 7 PM'
      },
      {
        id: 'int-3',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
        employeeId: 'emp-4',
        type: 'call',
        outcome: 'no_answer',
        notes: 'No response, left voicemail'
      },
      {
        id: 'int-4',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
        employeeId: 'emp-4',
        type: 'whatsapp',
        outcome: 'callback_requested',
        notes: 'Client responded via WhatsApp, wants senior consultant'
      },
      {
        id: 'int-5',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 20),
        employeeId: 'emp-2',
        type: 'assignment',
        notes: 'Reassigned to Priya (Team Lead) as per client request'
      },
      {
        id: 'int-6',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
        employeeId: 'emp-2',
        type: 'call',
        outcome: 'interested',
        duration: 720,
        notes: 'Detailed discussion about Lower Parel penthouse. Very interested, scheduling site visit'
      }
    ],
    assignmentHistory: [
      {
        id: 'ah-1',
        employeeId: 'emp-4',
        employeeName: 'Neha Gupta',
        assignedAt: new Date(Date.now() - 1000 * 60 * 60 * 70),
        unassignedAt: new Date(Date.now() - 1000 * 60 * 60 * 20),
        reason: 'Client requested senior consultant'
      },
      {
        id: 'ah-2',
        employeeId: 'emp-2',
        employeeName: 'Priya Patel',
        assignedAt: new Date(Date.now() - 1000 * 60 * 60 * 20)
      }
    ],
    notes: 'HNI client - handles carefully. Budget flexible for right property.'
  },
  {
    id: 'meta-7',
    name: 'Ananya Reddy',
    email: 'ananya.r@corp.com',
    phone: '+91 99887 77777',
    adCampaign: 'Sea-Facing Properties',
    adSet: 'Retargeting',
    formData: {
      propertyInterest: 'Apartment',
      budget: '4-6 Cr',
      location: 'Powai',
      message: 'Looking for lake-view apartment'
    },
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
    status: 'assigned',
    assignedTo: 'emp-1',
    assignedAt: new Date(Date.now() - 1000 * 60 * 60 * 46),
    linkedPropertyId: 'prop-6',
    firstContactDate: new Date(Date.now() - 1000 * 60 * 60 * 44),
    lastContactDate: new Date(Date.now() - 1000 * 60 * 60 * 6),
    preferredContactTime: 'Lunch hours 12-2 PM',
    interactions: [
      {
        id: 'int-7',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 46),
        employeeId: 'emp-1',
        type: 'assignment',
        notes: 'Assigned to Rajesh'
      },
      {
        id: 'int-8',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 44),
        employeeId: 'emp-1',
        type: 'call',
        outcome: 'connected',
        duration: 300,
        notes: 'Good conversation, interested in Powai lake view. Wants to see property brochure'
      },
      {
        id: 'int-9',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 40),
        employeeId: 'emp-1',
        type: 'email',
        notes: 'Sent property brochure and pricing details'
      },
      {
        id: 'int-10',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6),
        employeeId: 'emp-1',
        type: 'call',
        outcome: 'interested',
        duration: 480,
        notes: 'Follow-up call - client reviewing options, site visit tentatively scheduled for weekend'
      }
    ],
    assignmentHistory: [
      {
        id: 'ah-3',
        employeeId: 'emp-1',
        employeeName: 'Rajesh Sharma',
        assignedAt: new Date(Date.now() - 1000 * 60 * 60 * 46)
      }
    ]
  }
]

// Lead Notes
export interface LeadNote {
  id: string
  leadId: string
  employeeId: string
  content: string
  type: 'call' | 'meeting' | 'general' | 'follow_up'
  createdAt: Date
}

export const leadNotes: LeadNote[] = [
  {
    id: 'note-1',
    leadId: 'lead-1',
    employeeId: 'emp-2',
    content: 'Discussed property requirements. Client very interested in sea-facing properties with private pool.',
    type: 'call',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2)
  },
  {
    id: 'note-2',
    leadId: 'lead-1',
    employeeId: 'emp-2',
    content: 'Sent brochure for Azure Heights Penthouse. Client requested site visit.',
    type: 'follow_up',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24)
  },
  {
    id: 'note-3',
    leadId: 'lead-2',
    employeeId: 'emp-1',
    content: 'Client comparing with property in Lower Parel. Need to highlight our USPs.',
    type: 'meeting',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48)
  }
]

// Employee Activity
export interface EmployeeActivity {
  id: string
  employeeId: string
  type: 'call' | 'meeting' | 'site_visit' | 'email' | 'whatsapp' | 'note' | 'lead_update'
  description: string
  leadId?: string
  leadName?: string
  duration?: number // in minutes
  outcome?: 'positive' | 'neutral' | 'negative'
  timestamp: Date
}

export const employeeActivities: EmployeeActivity[] = [
  { id: 'act-1', employeeId: 'emp-1', type: 'call', description: 'Called Kavita Desai regarding Worli property', leadId: 'lead-2', leadName: 'Kavita Desai', duration: 12, outcome: 'positive', timestamp: new Date(Date.now() - 1000 * 60 * 30) },
  { id: 'act-2', employeeId: 'emp-1', type: 'whatsapp', description: 'Sent property brochure to Meera Nair', leadId: 'lead-8', leadName: 'Meera Nair', timestamp: new Date(Date.now() - 1000 * 60 * 60) },
  { id: 'act-3', employeeId: 'emp-1', type: 'site_visit', description: 'Completed site visit at Alibaug Farmhouse', leadId: 'lead-8', leadName: 'Meera Nair', duration: 90, outcome: 'positive', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3) },
  { id: 'act-4', employeeId: 'emp-2', type: 'call', description: 'Follow-up call with Arjun Mehta', leadId: 'lead-1', leadName: 'Arjun Mehta', duration: 8, outcome: 'positive', timestamp: new Date(Date.now() - 1000 * 60 * 45) },
  { id: 'act-5', employeeId: 'emp-2', type: 'meeting', description: 'Meeting with Ritu Sharma for final negotiation', leadId: 'lead-10', leadName: 'Ritu Sharma', duration: 45, outcome: 'positive', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) },
  { id: 'act-6', employeeId: 'emp-2', type: 'email', description: 'Sent proposal to Ritu Sharma', leadId: 'lead-10', leadName: 'Ritu Sharma', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4) },
  { id: 'act-7', employeeId: 'emp-3', type: 'call', description: 'Cold call to new lead from Google Ads', duration: 5, outcome: 'neutral', timestamp: new Date(Date.now() - 1000 * 60 * 20) },
  { id: 'act-8', employeeId: 'emp-3', type: 'note', description: 'Updated lead status to contacted', leadId: 'lead-3', leadName: 'Rahul Kapoor', timestamp: new Date(Date.now() - 1000 * 60 * 60) },
  { id: 'act-9', employeeId: 'emp-4', type: 'site_visit', description: 'Scheduled visit for Powai Duplex', leadId: 'lead-4', leadName: 'Neha Joshi', timestamp: new Date(Date.now() - 1000 * 60 * 90) },
  { id: 'act-10', employeeId: 'emp-4', type: 'whatsapp', description: 'Sent location details for site visit', leadId: 'lead-4', leadName: 'Neha Joshi', timestamp: new Date(Date.now() - 1000 * 60 * 100) }
]

// Employee Goals
export interface EmployeeGoal {
  id: string
  employeeId: string
  title: string
  target: number
  current: number
  unit: string
  period: 'daily' | 'weekly' | 'monthly'
}

export const employeeGoals: EmployeeGoal[] = [
  { id: 'goal-1', employeeId: 'emp-1', title: 'Calls Made', target: 20, current: 14, unit: 'calls', period: 'daily' },
  { id: 'goal-2', employeeId: 'emp-1', title: 'Site Visits', target: 3, current: 2, unit: 'visits', period: 'daily' },
  { id: 'goal-3', employeeId: 'emp-1', title: 'Leads Converted', target: 5, current: 3, unit: 'leads', period: 'weekly' },
  { id: 'goal-4', employeeId: 'emp-2', title: 'Calls Made', target: 25, current: 22, unit: 'calls', period: 'daily' },
  { id: 'goal-5', employeeId: 'emp-2', title: 'Site Visits', target: 4, current: 4, unit: 'visits', period: 'daily' },
  { id: 'goal-6', employeeId: 'emp-2', title: 'Revenue', target: 50000000, current: 42000000, unit: '₹', period: 'monthly' },
  { id: 'goal-7', employeeId: 'emp-3', title: 'Calls Made', target: 30, current: 18, unit: 'calls', period: 'daily' },
  { id: 'goal-8', employeeId: 'emp-3', title: 'New Leads', target: 10, current: 6, unit: 'leads', period: 'weekly' },
  { id: 'goal-9', employeeId: 'emp-4', title: 'Calls Made', target: 25, current: 20, unit: 'calls', period: 'daily' },
  { id: 'goal-10', employeeId: 'emp-4', title: 'Site Visits', target: 3, current: 1, unit: 'visits', period: 'daily' }
]

// Reminders/Todos
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

export const reminders: Reminder[] = [
  { id: 'rem-1', userId: 'emp-1', title: 'Follow up with Kavita Desai', description: 'Discuss final pricing and close deal', dueDate: new Date(Date.now() + 1000 * 60 * 60 * 2), priority: 'high', status: 'pending', category: 'follow_up', relatedLeadId: 'lead-2' },
  { id: 'rem-2', userId: 'emp-1', title: 'Prepare presentation for team meeting', dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24), priority: 'medium', status: 'pending', category: 'task' },
  { id: 'rem-3', userId: 'emp-2', title: 'Call Arjun Mehta', description: 'Confirm site visit timing', dueDate: new Date(Date.now() + 1000 * 60 * 30), priority: 'high', status: 'pending', category: 'call', relatedLeadId: 'lead-1' },
  { id: 'rem-4', userId: 'emp-2', title: 'Send proposal to Ritu Sharma', dueDate: new Date(Date.now() - 1000 * 60 * 60), priority: 'high', status: 'completed', category: 'follow_up', relatedLeadId: 'lead-10' },
  { id: 'rem-5', userId: 'emp-3', title: 'Update CRM entries', description: 'Complete all pending lead updates', dueDate: new Date(Date.now() + 1000 * 60 * 60 * 5), priority: 'low', status: 'pending', category: 'task' }
]

// Property Call Scripts (custom per property)
export interface PropertyCallScript {
  propertyId: string
  introduction: string
  keyHighlights: string[]
  priceJustification: string
  objectionHandling: { objection: string; response: string }[]
  closingStatement: string
}

export const propertyCallScripts: PropertyCallScript[] = [
  {
    propertyId: 'prop-1',
    introduction: 'Good [morning/afternoon], I am calling regarding the Azure Heights Penthouse in Bandra West - one of the most exclusive sea-facing penthouses in Mumbai with 4500 sqft of pure luxury.',
    keyHighlights: [
      'Unobstructed Arabian Sea views from every room',
      'Private infinity pool and terrace garden spanning 1200 sqft',
      'Smart home automation by Crestron',
      'Private elevator access directly to your floor',
      'Developed by Lodha Group with impeccable finishing'
    ],
    priceJustification: 'At ₹75 Cr, this translates to ₹45,000/sqft which is actually below market rate for sea-facing Bandra properties. Similar properties in the vicinity have transacted at ₹55,000-60,000/sqft.',
    objectionHandling: [
      { objection: 'Price is too high', response: 'I understand. However, consider that Bandra sea-face properties have appreciated 15% annually. This is not just a home, it is a legacy asset.' },
      { objection: 'Location concerns', response: 'Bandra West offers the perfect balance - 10 mins to BKC, proximity to international schools, and the cultural hub of Mumbai.' }
    ],
    closingStatement: 'This is truly a once-in-a-lifetime opportunity. Properties like this rarely come to market. Shall I arrange a private viewing this week?'
  },
  {
    propertyId: 'prop-2',
    introduction: 'I am reaching out about Worli Sea Face Residency - a stunning 3BHK apartment with panoramic sea views, developed by Oberoi Realty.',
    keyHighlights: [
      'Direct sea-facing apartment with floor-to-ceiling windows',
      '2800 sqft of premium living space',
      'World-class amenities including infinity pool and spa',
      '24x7 concierge and valet parking',
      'Ready to move with Oberoi quality finishing'
    ],
    priceJustification: 'Priced at ₹4.2 Cr, this offers exceptional value at ₹52,000/sqft. Worli sea-face has consistently outperformed other Mumbai micro-markets with 12% annual appreciation.',
    objectionHandling: [
      { objection: 'Comparing with other properties', response: 'While other properties may seem similar on paper, Oberoi quality and Worli location command a premium that translates to better resale value.' }
    ],
    closingStatement: 'The Worli sea-face lifestyle is truly unmatched. Would you like to experience it firsthand with a site visit?'
  },
  {
    propertyId: 'prop-3',
    introduction: 'I have an exceptional opportunity - the Juhu Beach Villa, an 8000 sqft masterpiece with private beach access.',
    keyHighlights: [
      'One of only 5 villas with direct beach access in Juhu',
      '6 bedrooms with en-suite bathrooms',
      'Private home theater and wine cellar',
      'Separate guest house for visitors',
      'Helipad facility for ultimate convenience'
    ],
    priceJustification: 'At ₹15 Cr, you are acquiring one of the most exclusive addresses in Mumbai. Beach-front properties in Juhu are virtually impossible to find and only appreciate.',
    objectionHandling: [
      { objection: 'Very high price point', response: 'This is not just real estate - it is a trophy asset. Your neighbors include some of India most prominent families. The exclusivity alone justifies the investment.' }
    ],
    closingStatement: 'Shall I arrange a private viewing? I can also organize a helicopter tour of the Juhu coastline if that would interest you.'
  },
  {
    propertyId: 'prop-4',
    introduction: 'I am calling about BKC Corporate Tower - a Grade A commercial space in the heart of Mumbai financial district, developed by Godrej Properties.',
    keyHighlights: [
      '12,000 sqft of premium Grade A office space',
      'LEED Platinum certified green building',
      'Direct metro connectivity from basement',
      'Dedicated food court and business lounge',
      'Ample parking with EV charging infrastructure'
    ],
    priceJustification: 'At ₹12.5 Cr for 12,000 sqft, this works out to ₹35,000/sqft - highly competitive for BKC where comparable spaces command ₹40,000-50,000/sqft. The rental yield here is 9.5%, one of the highest in Mumbai.',
    objectionHandling: [
      { objection: 'Looking at other locations', response: 'BKC is Indias only planned financial district with zero traffic congestion issues. Your clients and employees will thank you for the accessibility.' },
      { objection: 'Budget constraints', response: 'Consider the ROI - at 9.5% rental yield, this property pays for itself. We can also discuss flexible payment plans.' }
    ],
    closingStatement: 'BKC addresses are a statement of prestige. Would you like to visit the site and experience the infrastructure firsthand?'
  },
  {
    propertyId: 'prop-5',
    introduction: 'I am reaching out regarding the Alibaug Luxury Farmhouse - a 15,000 sqft estate perfect for weekend retreats, just 90 minutes from Mumbai via the new Ro-Ro ferry.',
    keyHighlights: [
      '15,000 sqft of land with 5,000 sqft built-up villa',
      'Organic farming setup with full-time caretaker',
      'Private infinity pool overlooking the hills',
      'Separate guest cottage for visitors',
      'Tennis court and horse stables'
    ],
    priceJustification: 'Priced at ₹9.5 Cr, this includes the entire estate with organic farm. Similar properties with this level of amenities are priced at ₹12-15 Cr. The Coastal Road project will further boost Alibaug connectivity.',
    objectionHandling: [
      { objection: 'Distance from Mumbai', response: 'With the Ro-Ro ferry, Alibaug is now just 20 minutes from Gateway of India. The upcoming Alibaug bridge will make it even more accessible.' },
      { objection: 'Maintenance concerns', response: 'We provide a complete maintenance package including caretaker, gardener, and security - your weekend getaway will always be ready for you.' }
    ],
    closingStatement: 'Imagine unwinding in your private farmhouse every weekend. Shall I arrange a day trip to experience the property?'
  },
  {
    propertyId: 'prop-6',
    introduction: 'Good day! I am calling about the Powai Lake View Duplex - a stunning 3,200 sqft property by Hiranandani with panoramic lake views.',
    keyHighlights: [
      'Direct Powai Lake view from both floors',
      '3,200 sqft spread across two levels with private garden',
      'Premium Hiranandani finishing and maintenance',
      'Walking distance to Powai business hub',
      'Top-rated international schools in the vicinity'
    ],
    priceJustification: 'At ₹3.2 Cr, you are getting Hiranandani quality at ₹28,000/sqft. Lake-facing units typically command a 15-20% premium. This is an exceptional value for a duplex with this view.',
    objectionHandling: [
      { objection: 'Traffic in Powai', response: 'The internal Hiranandani township roads are impeccably maintained. Plus, most IT parks, schools, and entertainment are within the township itself.' },
      { objection: 'Comparing with other properties', response: 'Hiranandani maintains strict quality standards - from construction to township maintenance. This long-term value is unmatched by other developers.' }
    ],
    closingStatement: 'The lake view alone makes this property special. Would you like to schedule a sunset viewing to see it at its best?'
  },
  {
    propertyId: 'prop-7',
    introduction: 'I have an exceptional opportunity - the Lower Parel Sky Penthouse by Piramal Realty, offering 5,200 sqft of ultra-luxury living with 360-degree Mumbai views.',
    keyHighlights: [
      '360-degree views of Mumbai skyline, sea, and racecourse',
      '5,200 sqft with private terrace spanning 800 sqft',
      'Full home automation by Savant',
      'Private high-speed elevator to your floor only',
      'Panic room and biometric security'
    ],
    priceJustification: 'At ₹8.5 Cr, translating to ₹55,000/sqft, this is premium but justified. Lower Parel penthouses have appreciated 18% annually. The view from this unit is literally unobstructed in all directions.',
    objectionHandling: [
      { objection: 'Price seems high', response: 'Consider that this is not just a home - it is a lifestyle statement. The 360-degree view cannot be replicated. In 5 years, this will likely be worth ₹14-15 Cr.' },
      { objection: 'Security concerns', response: 'This building has 7-tier security including facial recognition, panic room, and private elevator. It is one of the most secure residences in Mumbai.' }
    ],
    closingStatement: 'Experience the Mumbai skyline like never before. I can arrange an exclusive viewing - perhaps with champagne at sunset?'
  },
  {
    propertyId: 'prop-8',
    introduction: 'Hello! I am calling about the Andheri Premium Studio - a smart 650 sqft space perfect for young professionals or rental investment, by Runwal Group.',
    keyHighlights: [
      'Metro station literally at building basement - zero commute',
      'Fully furnished with modern smart home features',
      'Co-working space and gym in the building',
      'Rooftop lounge with city views',
      '10.5% rental yield - highest in micro-market'
    ],
    priceJustification: 'At ₹1.2 Cr, this gives you 10.5% rental yield - exceptional for Mumbai real estate. The metro connectivity makes it highly desirable for rentals. Young professionals are willing to pay premium rent for this convenience.',
    objectionHandling: [
      { objection: 'Studio seems small', response: 'The 650 sqft is efficiently designed with smart storage solutions. For a young professional or rental unit, this is the sweet spot - easy to maintain and high demand.' },
      { objection: 'Investment returns', response: 'At 10.5% rental yield, you make ₹12.6 lakh annually. That is higher than most FDs and the property appreciates too. In 8-10 years, it essentially pays for itself.' }
    ],
    closingStatement: 'This is perfect for rental income or a young professional lifestyle. Shall we visit and see the metro connectivity firsthand?'
  },
  {
    propertyId: 'prop-9',
    introduction: 'I am reaching out about the Thane Riverside Bungalow - a 6,500 sqft upcoming project by Raymond Realty with stunning creek views.',
    keyHighlights: [
      '6,500 sqft bungalow with private garden and creek view',
      'Gated community with 24x7 security',
      'Dedicated home office space - perfect for hybrid work',
      'Raymond Realty quality and finishing',
      'Pre-launch pricing with 7.5% projected ROI'
    ],
    priceJustification: 'Pre-launch price of ₹5.5 Cr works out to just ₹22,000/sqft for a bungalow. On completion in 2025, similar properties will be ₹7-8 Cr. Early investors typically see 25-30% appreciation by possession.',
    objectionHandling: [
      { objection: 'Thane location', response: 'Thane is no longer a suburb - it is a destination. With Thane-Borivali tunnel upcoming and excellent social infrastructure, many families are relocating from Mumbai to Thane for better quality of life.' },
      { objection: 'Under construction risk', response: 'Raymond Realty has impeccable track record of on-time delivery. Plus, RERA registration provides complete protection. The pre-launch discount makes the risk-reward very favorable.' }
    ],
    closingStatement: 'This is a rare pre-launch opportunity. Shall I take you to the site to see the creek view and project plans?'
  },
  {
    propertyId: 'prop-10',
    introduction: 'I have a rare heritage listing - the South Mumbai Heritage Apartment in Colaba, a 2,200 sqft piece of Mumbai history with sea views.',
    keyHighlights: [
      'Century-old heritage building with original character',
      '14-foot high ceilings with antique wooden flooring',
      'Direct Arabian Sea view from living room',
      'Walking distance to Colaba Causeway and Gateway',
      'One of the last remaining heritage apartments in South Mumbai'
    ],
    priceJustification: 'At ₹6.5 Cr, you are not just buying property - you are acquiring heritage. There will never be new construction in Colaba with such character. Heritage properties in South Mumbai have appreciated 200% in the last decade.',
    objectionHandling: [
      { objection: 'Old building concerns', response: 'Heritage buildings in South Mumbai are maintained to exacting standards. The structural integrity is regularly certified. The charm of 14-foot ceilings and original flooring cannot be replicated.' },
      { objection: 'High price per sqft', response: 'At ₹65,000/sqft, yes it is premium - but Colaba sea-facing heritage is priceless. This is not just real estate, it is owning a piece of Mumbai history.' }
    ],
    closingStatement: 'Properties like this come once in a lifetime. Experience the old-world charm with a private viewing?'
  }
]

// Property Appreciation Data
export interface PropertyAppreciation {
  propertyId: string
  historicalRates: { year: number; rate: number }[]
  projectedRates: { years: number; estimatedValue: number; appreciationPercent: number }[]
  locationFactors: string[]
  investmentScore: number
}

export const propertyAppreciations: PropertyAppreciation[] = [
  {
    propertyId: 'prop-1',
    historicalRates: [
      { year: 2020, rate: 8.2 },
      { year: 2021, rate: 10.5 },
      { year: 2022, rate: 12.1 },
      { year: 2023, rate: 14.3 }
    ],
    projectedRates: [
      { years: 3, estimatedValue: 97500000, appreciationPercent: 30 },
      { years: 5, estimatedValue: 120000000, appreciationPercent: 60 },
      { years: 10, estimatedValue: 180000000, appreciationPercent: 140 },
      { years: 15, estimatedValue: 262500000, appreciationPercent: 250 }
    ],
    locationFactors: ['Sea-facing premium', 'Bandra development boom', 'Metro connectivity coming', 'Limited inventory'],
    investmentScore: 92
  },
  {
    propertyId: 'prop-2',
    historicalRates: [
      { year: 2020, rate: 7.5 },
      { year: 2021, rate: 9.2 },
      { year: 2022, rate: 11.0 },
      { year: 2023, rate: 12.5 }
    ],
    projectedRates: [
      { years: 3, estimatedValue: 52500000, appreciationPercent: 25 },
      { years: 5, estimatedValue: 63000000, appreciationPercent: 50 },
      { years: 10, estimatedValue: 92400000, appreciationPercent: 120 },
      { years: 15, estimatedValue: 126000000, appreciationPercent: 200 }
    ],
    locationFactors: ['Worli sea-link advantage', 'Corporate hub proximity', 'Oberoi brand value', 'Infrastructure development'],
    investmentScore: 88
  },
  {
    propertyId: 'prop-3',
    historicalRates: [
      { year: 2020, rate: 5.5 },
      { year: 2021, rate: 6.8 },
      { year: 2022, rate: 7.5 },
      { year: 2023, rate: 8.2 }
    ],
    projectedRates: [
      { years: 3, estimatedValue: 180000000, appreciationPercent: 20 },
      { years: 5, estimatedValue: 210000000, appreciationPercent: 40 },
      { years: 10, estimatedValue: 300000000, appreciationPercent: 100 },
      { years: 15, estimatedValue: 420000000, appreciationPercent: 180 }
    ],
    locationFactors: ['Beachfront scarcity', 'Celebrity neighborhood', 'Legacy asset', 'No new supply possible'],
    investmentScore: 95
  },
  {
    propertyId: 'prop-4',
    historicalRates: [
      { year: 2020, rate: 9.0 },
      { year: 2021, rate: 11.5 },
      { year: 2022, rate: 13.2 },
      { year: 2023, rate: 15.0 }
    ],
    projectedRates: [
      { years: 3, estimatedValue: 168750000, appreciationPercent: 35 },
      { years: 5, estimatedValue: 212500000, appreciationPercent: 70 },
      { years: 10, estimatedValue: 325000000, appreciationPercent: 160 },
      { years: 15, estimatedValue: 500000000, appreciationPercent: 300 }
    ],
    locationFactors: ['BKC financial hub', 'Metro connectivity', 'Commercial demand surge', 'Limited Grade A supply'],
    investmentScore: 94
  },
  {
    propertyId: 'prop-5',
    historicalRates: [
      { year: 2020, rate: 4.5 },
      { year: 2021, rate: 5.2 },
      { year: 2022, rate: 6.0 },
      { year: 2023, rate: 7.5 }
    ],
    projectedRates: [
      { years: 3, estimatedValue: 114000000, appreciationPercent: 20 },
      { years: 5, estimatedValue: 133000000, appreciationPercent: 40 },
      { years: 10, estimatedValue: 180500000, appreciationPercent: 90 },
      { years: 15, estimatedValue: 237500000, appreciationPercent: 150 }
    ],
    locationFactors: ['Alibaug connectivity improving', 'Weekend getaway demand', 'Limited farmland', 'Coastal road project'],
    investmentScore: 78
  }
]

export interface Lead {
  id: string
  name: string
  email: string
  phone: string
  status: LeadStatus
  source: LeadSource
  tags: LeadTag[]
  aiScore: number
  assignedEmployee: string
  lastSpokenEmployee: string
  propertyInterest: PropertyType[]
  budgetMin: number
  budgetMax: number
  location: string
  lastNote: string
  lastInteraction: Date
  createdAt: Date
  whatsappStatus: 'active' | 'inactive' | 'blocked'
  avatar?: string
  projectCategory: ProjectCategory
  // New fields for history tracking
  linkedPropertyId?: string
  preferredSqft?: { min: number; max: number }
  preferredBedrooms?: number
  interactions: LeadInteraction[]
  assignmentHistory: LeadAssignmentHistory[]
  firstContactDate?: Date
  requirements?: string
}

export interface Employee {
  id: string
  name: string
  email: string
  role: 'sales_executive' | 'senior_consultant' | 'team_lead' | 'manager' | 'admin'
  avatar: string
  phone: string
  leadsAssigned: number
  leadsConverted: number
  revenue: number
  target: number
  rating: number
  status: 'online' | 'busy' | 'offline'
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

// Mock Employees
export const employees: Employee[] = [
  {
    id: 'emp-1',
    name: 'Rajesh Sharma',
    email: 'rajesh@pikorua.com',
    role: 'senior_consultant',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    phone: '+91 98765 43210',
    leadsAssigned: 45,
    leadsConverted: 12,
    revenue: 15600000,
    target: 20000000,
    rating: 4.8,
    status: 'online'
  },
  {
    id: 'emp-2',
    name: 'Priya Patel',
    email: 'priya@pikorua.com',
    role: 'team_lead',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
    phone: '+91 98765 43211',
    leadsAssigned: 38,
    leadsConverted: 15,
    revenue: 22400000,
    target: 25000000,
    rating: 4.9,
    status: 'online'
  },
  {
    id: 'emp-3',
    name: 'Amit Kumar',
    email: 'amit@pikorua.com',
    role: 'sales_executive',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    phone: '+91 98765 43212',
    leadsAssigned: 52,
    leadsConverted: 8,
    revenue: 8900000,
    target: 15000000,
    rating: 4.5,
    status: 'busy'
  },
  {
    id: 'emp-4',
    name: 'Sneha Reddy',
    email: 'sneha@pikorua.com',
    role: 'sales_executive',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    phone: '+91 98765 43213',
    leadsAssigned: 41,
    leadsConverted: 11,
    revenue: 13200000,
    target: 18000000,
    rating: 4.7,
    status: 'online'
  },
  {
    id: 'emp-5',
    name: 'Jitendra p.',
    email: 'jitendra@pikorua.com',
    role: 'manager',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    phone: '+91 98765 43214',
    leadsAssigned: 25,
    leadsConverted: 18,
    revenue: 45600000,
    target: 50000000,
    rating: 4.9,
    status: 'online'
  },
  {
    id: 'emp-6',
    name: 'Ananya Gupta',
    email: 'ananya@pikorua.com',
    role: 'sales_executive',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face',
    phone: '+91 98765 43215',
    leadsAssigned: 35,
    leadsConverted: 9,
    revenue: 11500000,
    target: 16000000,
    rating: 4.6,
    status: 'offline'
  }
]

// Mock Leads
export const leads: Lead[] = [
  {
    id: 'lead-1',
    name: 'Arjun Mehta',
    email: 'arjun.mehta@gmail.com',
    phone: '+91 99887 76655',
    status: 'qualified',
    source: 'meta_ads',
    tags: ['vip', 'hot'],
    aiScore: 92,
    assignedEmployee: 'emp-2',
    lastSpokenEmployee: 'emp-2',
    propertyInterest: ['penthouse', 'villa'],
    budgetMin: 50000000,
    budgetMax: 80000000,
    location: 'Bandra West',
    lastNote: 'Very interested in sea-facing properties. Budget flexible for right property.',
    lastInteraction: new Date('2024-01-15T10:30:00'),
    createdAt: new Date('2024-01-10T09:00:00'),
    whatsappStatus: 'active',
    projectCategory: 'penthouse',
    linkedPropertyId: 'prop-1',
    preferredSqft: { min: 3000, max: 5000 },
    preferredBedrooms: 4,
    firstContactDate: new Date('2024-01-10T10:00:00'),
    requirements: 'Sea-facing penthouse with 4+ bedrooms, modern amenities, private pool preferred',
    interactions: [
      { id: 'int-l1-1', timestamp: new Date('2024-01-10T10:00:00'), employeeId: 'emp-4', type: 'assignment', notes: 'New lead from Meta Ads - assigned to Sneha for qualification' },
      { id: 'int-l1-2', timestamp: new Date('2024-01-10T11:30:00'), employeeId: 'emp-4', type: 'call', outcome: 'connected', duration: 420, notes: 'Initial call - HNI client, very specific requirements. Interested in Bandra sea-facing.' },
      { id: 'int-l1-3', timestamp: new Date('2024-01-11T14:00:00'), employeeId: 'emp-4', type: 'whatsapp', outcome: 'interested', notes: 'Sent property brochures for 3 penthouses' },
      { id: 'int-l1-4', timestamp: new Date('2024-01-12T10:00:00'), employeeId: 'emp-2', type: 'assignment', notes: 'Escalated to Priya (Team Lead) for premium handling' },
      { id: 'int-l1-5', timestamp: new Date('2024-01-12T16:00:00'), employeeId: 'emp-2', type: 'call', outcome: 'interested', duration: 900, notes: 'Detailed discussion on Bandra Heights Penthouse. Client very interested, wants site visit.' },
      { id: 'int-l1-6', timestamp: new Date('2024-01-15T10:30:00'), employeeId: 'emp-2', type: 'site_visit', notes: 'Site visit completed. Client impressed with sea view. Discussing pricing.' }
    ],
    assignmentHistory: [
      { id: 'ah-l1-1', employeeId: 'emp-4', employeeName: 'Sneha Reddy', assignedAt: new Date('2024-01-10T09:00:00'), unassignedAt: new Date('2024-01-12T10:00:00'), reason: 'Escalated to senior consultant for HNI handling' },
      { id: 'ah-l1-2', employeeId: 'emp-2', employeeName: 'Priya Patel', assignedAt: new Date('2024-01-12T10:00:00') }
    ]
  },
  {
    id: 'lead-2',
    name: 'Kavita Desai',
    email: 'kavita.desai@outlook.com',
    phone: '+91 99887 76656',
    status: 'negotiation',
    source: 'referral',
    tags: ['vip'],
    aiScore: 88,
    assignedEmployee: 'emp-1',
    lastSpokenEmployee: 'emp-1',
    propertyInterest: ['apartment', 'penthouse'],
    budgetMin: 30000000,
    budgetMax: 45000000,
    location: 'Worli',
    lastNote: 'Comparing with another property in Lower Parel. Need quick follow-up.',
    lastInteraction: new Date('2024-01-14T16:45:00'),
    createdAt: new Date('2024-01-05T11:00:00'),
    whatsappStatus: 'active',
    projectCategory: 'apartment',
    linkedPropertyId: 'prop-2',
    preferredSqft: { min: 1800, max: 2500 },
    preferredBedrooms: 3,
    firstContactDate: new Date('2024-01-05T12:00:00'),
    requirements: 'Premium apartment in Worli with sea view, modern kitchen, covered parking',
    interactions: [
      { id: 'int-l2-1', timestamp: new Date('2024-01-05T12:00:00'), employeeId: 'emp-1', type: 'assignment', notes: 'Referral from existing client - directly assigned to Rajesh' },
      { id: 'int-l2-2', timestamp: new Date('2024-01-05T15:00:00'), employeeId: 'emp-1', type: 'call', outcome: 'connected', duration: 600, notes: 'Warm lead, knows our previous client. Looking for 3BHK in Worli.' },
      { id: 'int-l2-3', timestamp: new Date('2024-01-08T11:00:00'), employeeId: 'emp-1', type: 'site_visit', notes: 'Visited Worli Sea Pearl. Client liked the view but comparing prices.' },
      { id: 'int-l2-4', timestamp: new Date('2024-01-14T16:45:00'), employeeId: 'emp-1', type: 'call', outcome: 'follow_up', duration: 480, notes: 'Client comparing with Lower Parel property. Need to provide competitive analysis.' }
    ],
    assignmentHistory: [
      { id: 'ah-l2-1', employeeId: 'emp-1', employeeName: 'Rajesh Sharma', assignedAt: new Date('2024-01-05T11:00:00') }
    ]
  },
  {
    id: 'lead-3',
    name: 'Rahul Kapoor',
    email: 'rahul.k@company.com',
    phone: '+91 99887 76657',
    status: 'contacted',
    source: 'google_ads',
    tags: ['duplicate'],
    aiScore: 65,
    assignedEmployee: 'emp-3',
    lastSpokenEmployee: 'emp-4',
    propertyInterest: ['commercial'],
    budgetMin: 100000000,
    budgetMax: 150000000,
    location: 'BKC',
    lastNote: 'Looking for commercial space for new office. Previously contacted via walk-in.',
    lastInteraction: new Date('2024-01-13T14:20:00'),
    createdAt: new Date('2024-01-08T10:30:00'),
    whatsappStatus: 'inactive',
    projectCategory: 'commercial',
    linkedPropertyId: 'prop-4',
    preferredSqft: { min: 10000, max: 15000 },
    firstContactDate: new Date('2024-01-02T10:00:00'),
    requirements: 'Grade A office space in BKC, 10000+ sqft, metro connectivity essential',
    interactions: [
      { id: 'int-l3-1', timestamp: new Date('2024-01-02T10:00:00'), employeeId: 'emp-6', type: 'assignment', notes: 'Walk-in inquiry at office' },
      { id: 'int-l3-2', timestamp: new Date('2024-01-02T11:00:00'), employeeId: 'emp-6', type: 'meeting', notes: 'Initial meeting - corporate client, expanding IT firm' },
      { id: 'int-l3-3', timestamp: new Date('2024-01-08T10:30:00'), employeeId: 'emp-3', type: 'assignment', notes: 'Came again via Google Ads - marked as duplicate, reassigned to Amit for commercial expertise' },
      { id: 'int-l3-4', timestamp: new Date('2024-01-10T14:00:00'), employeeId: 'emp-3', type: 'call', outcome: 'callback_requested', duration: 180, notes: 'Client busy, asked for callback next week' },
      { id: 'int-l3-5', timestamp: new Date('2024-01-13T14:20:00'), employeeId: 'emp-4', type: 'call', outcome: 'connected', duration: 300, notes: 'Sneha followed up - client still interested, shared BKC Corporate Tower details' }
    ],
    assignmentHistory: [
      { id: 'ah-l3-1', employeeId: 'emp-6', employeeName: 'Ananya Gupta', assignedAt: new Date('2024-01-02T10:00:00'), unassignedAt: new Date('2024-01-08T10:30:00'), reason: 'Duplicate lead - reassigned to commercial specialist' },
      { id: 'ah-l3-2', employeeId: 'emp-3', employeeName: 'Amit Kumar', assignedAt: new Date('2024-01-08T10:30:00') }
    ]
  },
  {
    id: 'lead-4',
    name: 'Neha Joshi',
    email: 'neha.j@gmail.com',
    phone: '+91 99887 76658',
    status: 'new',
    source: 'meta_ads',
    tags: [],
    aiScore: 78,
    assignedEmployee: 'emp-4',
    lastSpokenEmployee: 'emp-4',
    propertyInterest: ['apartment', 'duplex'],
    budgetMin: 20000000,
    budgetMax: 35000000,
    location: 'Powai',
    lastNote: 'First inquiry via Facebook ad. Interested in lake-view properties.',
    lastInteraction: new Date('2024-01-15T09:15:00'),
    createdAt: new Date('2024-01-15T09:00:00'),
    whatsappStatus: 'active',
    projectCategory: 'apartment',
    linkedPropertyId: 'prop-6',
    preferredSqft: { min: 1500, max: 2500 },
    preferredBedrooms: 3,
    firstContactDate: new Date('2024-01-15T09:15:00'),
    requirements: 'Lake view apartment in Powai, close to Hiranandani, good schools nearby',
    interactions: [
      { id: 'int-l4-1', timestamp: new Date('2024-01-15T09:00:00'), employeeId: 'emp-4', type: 'assignment', notes: 'New Meta Ads lead - auto assigned' },
      { id: 'int-l4-2', timestamp: new Date('2024-01-15T09:15:00'), employeeId: 'emp-4', type: 'call', outcome: 'connected', duration: 240, notes: 'Quick intro call - young family, relocating from Bangalore. Interested in lake view.' }
    ],
    assignmentHistory: [
      { id: 'ah-l4-1', employeeId: 'emp-4', employeeName: 'Sneha Reddy', assignedAt: new Date('2024-01-15T09:00:00') }
    ]
  },
  {
    id: 'lead-5',
    name: 'Vijay Malhotra',
    email: 'vijay.m@business.com',
    phone: '+91 99887 76659',
    status: 'won',
    source: 'referral',
    tags: ['vip'],
    aiScore: 95,
    assignedEmployee: 'emp-5',
    lastSpokenEmployee: 'emp-5',
    propertyInterest: ['villa'],
    budgetMin: 120000000,
    budgetMax: 180000000,
    location: 'Juhu',
    lastNote: 'Deal closed! Purchased beachfront villa. Great for referrals.',
    lastInteraction: new Date('2024-01-12T11:00:00'),
    createdAt: new Date('2023-12-01T10:00:00'),
    whatsappStatus: 'active',
    projectCategory: 'villa',
    linkedPropertyId: 'prop-3',
    preferredSqft: { min: 5000, max: 8000 },
    preferredBedrooms: 5,
    firstContactDate: new Date('2023-12-01T11:00:00'),
    requirements: 'Beachfront villa in Juhu, minimum 5000 sqft, private garden and pool mandatory',
    interactions: [
      { id: 'int-l5-1', timestamp: new Date('2023-12-01T10:00:00'), employeeId: 'emp-5', type: 'assignment', notes: 'Ultra HNI referral - assigned to Jitendra p. (Manager)' },
      { id: 'int-l5-2', timestamp: new Date('2023-12-01T11:00:00'), employeeId: 'emp-5', type: 'call', outcome: 'interested', duration: 1200, notes: 'Industrialist, very specific about beachfront. Budget no issue.' },
      { id: 'int-l5-3', timestamp: new Date('2023-12-05T10:00:00'), employeeId: 'emp-5', type: 'site_visit', notes: 'Visited 3 properties. Loved Juhu Sands Villa.' },
      { id: 'int-l5-4', timestamp: new Date('2023-12-10T14:00:00'), employeeId: 'emp-5', type: 'meeting', notes: 'Meeting with legal team for documentation' },
      { id: 'int-l5-5', timestamp: new Date('2024-01-05T10:00:00'), employeeId: 'emp-5', type: 'note', notes: 'Registration completed. Keys handed over.' },
      { id: 'int-l5-6', timestamp: new Date('2024-01-12T11:00:00'), employeeId: 'emp-5', type: 'call', outcome: 'connected', duration: 300, notes: 'Follow up call - client very happy, promised 2 referrals' }
    ],
    assignmentHistory: [
      { id: 'ah-l5-1', employeeId: 'emp-5', employeeName: 'Jitendra p.', assignedAt: new Date('2023-12-01T10:00:00') }
    ]
  },
  {
    id: 'lead-6',
    name: 'Sunita Agarwal',
    email: 'sunita.a@gmail.com',
    phone: '+91 99887 76660',
    status: 'lost',
    source: 'website',
    tags: ['broker'],
    aiScore: 25,
    assignedEmployee: 'emp-3',
    lastSpokenEmployee: 'emp-3',
    propertyInterest: ['apartment'],
    budgetMin: 15000000,
    budgetMax: 25000000,
    location: 'Andheri',
    lastNote: 'Identified as broker trying to get pricing info. Marked and closed.',
    lastInteraction: new Date('2024-01-10T15:30:00'),
    createdAt: new Date('2024-01-09T14:00:00'),
    whatsappStatus: 'blocked',
    projectCategory: 'apartment',
    preferredSqft: { min: 1000, max: 1500 },
    preferredBedrooms: 2,
    firstContactDate: new Date('2024-01-09T15:00:00'),
    requirements: 'Multiple 2BHK units in Andheri West',
    interactions: [
      { id: 'int-l6-1', timestamp: new Date('2024-01-09T14:00:00'), employeeId: 'emp-3', type: 'assignment', notes: 'Website inquiry' },
      { id: 'int-l6-2', timestamp: new Date('2024-01-09T15:00:00'), employeeId: 'emp-3', type: 'call', outcome: 'connected', duration: 180, notes: 'Asking too many pricing questions, suspicious behavior' },
      { id: 'int-l6-3', timestamp: new Date('2024-01-10T15:30:00'), employeeId: 'emp-3', type: 'note', notes: 'Verified - known broker in Andheri area. Blocked WhatsApp.' }
    ],
    assignmentHistory: [
      { id: 'ah-l6-1', employeeId: 'emp-3', employeeName: 'Amit Kumar', assignedAt: new Date('2024-01-09T14:00:00') }
    ]
  },
  {
    id: 'lead-7',
    name: 'Deepak Sharma',
    email: 'deepak.s@fake.com',
    phone: '+91 99887 76661',
    status: 'lost',
    source: 'meta_ads',
    tags: ['fake'],
    aiScore: 15,
    assignedEmployee: 'emp-6',
    lastSpokenEmployee: 'emp-6',
    propertyInterest: ['penthouse'],
    budgetMin: 500000000,
    budgetMax: 1000000000,
    location: 'South Mumbai',
    lastNote: 'Fake inquiry. Phone number invalid. Email bounced.',
    lastInteraction: new Date('2024-01-11T10:00:00'),
    createdAt: new Date('2024-01-11T09:30:00'),
    whatsappStatus: 'inactive',
    projectCategory: 'general_live',
    firstContactDate: new Date('2024-01-11T10:00:00'),
    interactions: [
      { id: 'int-l7-1', timestamp: new Date('2024-01-11T09:30:00'), employeeId: 'emp-6', type: 'assignment', notes: 'Meta Ads lead' },
      { id: 'int-l7-2', timestamp: new Date('2024-01-11T10:00:00'), employeeId: 'emp-6', type: 'call', outcome: 'no_answer', notes: 'Phone number invalid/not reachable' },
      { id: 'int-l7-3', timestamp: new Date('2024-01-11T10:30:00'), employeeId: 'emp-6', type: 'email', notes: 'Email bounced - invalid address. Marked as fake.' }
    ],
    assignmentHistory: [
      { id: 'ah-l7-1', employeeId: 'emp-6', employeeName: 'Ananya Gupta', assignedAt: new Date('2024-01-11T09:30:00') }
    ]
  },
  {
    id: 'lead-8',
    name: 'Meera Nair',
    email: 'meera.nair@corp.com',
    phone: '+91 99887 76662',
    status: 'qualified',
    source: 'whatsapp',
    tags: ['hot'],
    aiScore: 85,
    assignedEmployee: 'emp-1',
    lastSpokenEmployee: 'emp-2',
    propertyInterest: ['farmhouse', 'villa'],
    budgetMin: 80000000,
    budgetMax: 120000000,
    location: 'Alibaug',
    lastNote: 'Looking for weekend getaway property. Site visit scheduled for this weekend.',
    lastInteraction: new Date('2024-01-14T18:00:00'),
    createdAt: new Date('2024-01-07T16:00:00'),
    whatsappStatus: 'active',
    projectCategory: 'farmhouse',
    linkedPropertyId: 'prop-5',
    preferredSqft: { min: 8000, max: 15000 },
    preferredBedrooms: 4,
    firstContactDate: new Date('2024-01-07T17:00:00'),
    requirements: 'Weekend getaway near Mumbai, farmhouse with organic farming setup, horse stables preferred',
    interactions: [
      { id: 'int-l8-1', timestamp: new Date('2024-01-07T16:00:00'), employeeId: 'emp-6', type: 'assignment', notes: 'WhatsApp inquiry' },
      { id: 'int-l8-2', timestamp: new Date('2024-01-07T17:00:00'), employeeId: 'emp-6', type: 'whatsapp', outcome: 'interested', notes: 'Initial WhatsApp chat - looking for Alibaug farmhouse' },
      { id: 'int-l8-3', timestamp: new Date('2024-01-08T10:00:00'), employeeId: 'emp-1', type: 'assignment', notes: 'Transferred to Rajesh for farmhouse expertise' },
      { id: 'int-l8-4', timestamp: new Date('2024-01-08T11:00:00'), employeeId: 'emp-1', type: 'call', outcome: 'interested', duration: 600, notes: 'Senior corporate executive, wants weekend retreat. Budget flexible.' },
      { id: 'int-l8-5', timestamp: new Date('2024-01-12T10:00:00'), employeeId: 'emp-1', type: 'email', notes: 'Sent Alibaug farmhouse portfolio' },
      { id: 'int-l8-6', timestamp: new Date('2024-01-14T18:00:00'), employeeId: 'emp-2', type: 'call', outcome: 'interested', duration: 420, notes: 'Priya coordinated site visit for this weekend. Client confirmed.' }
    ],
    assignmentHistory: [
      { id: 'ah-l8-1', employeeId: 'emp-6', employeeName: 'Ananya Gupta', assignedAt: new Date('2024-01-07T16:00:00'), unassignedAt: new Date('2024-01-08T10:00:00'), reason: 'Transferred to specialist' },
      { id: 'ah-l8-2', employeeId: 'emp-1', employeeName: 'Rajesh Sharma', assignedAt: new Date('2024-01-08T10:00:00') }
    ]
  },
  {
    id: 'lead-9',
    name: 'Prakash Iyer',
    email: 'prakash.i@gmail.com',
    phone: '+91 99887 76663',
    status: 'contacted',
    source: 'walk_in',
    tags: ['cp'],
    aiScore: 40,
    assignedEmployee: 'emp-4',
    lastSpokenEmployee: 'emp-4',
    propertyInterest: ['apartment', 'studio'],
    budgetMin: 10000000,
    budgetMax: 18000000,
    location: 'Thane',
    lastNote: 'Channel partner inquiry. Wants bulk deal for multiple units.',
    lastInteraction: new Date('2024-01-13T11:30:00'),
    createdAt: new Date('2024-01-12T10:00:00'),
    whatsappStatus: 'active',
    projectCategory: 'general_live',
    preferredSqft: { min: 500, max: 1000 },
    preferredBedrooms: 1,
    firstContactDate: new Date('2024-01-12T11:00:00'),
    requirements: 'Bulk booking - 5-10 studio apartments in Thane for investment clients',
    interactions: [
      { id: 'int-l9-1', timestamp: new Date('2024-01-12T10:00:00'), employeeId: 'emp-4', type: 'assignment', notes: 'Walk-in at office' },
      { id: 'int-l9-2', timestamp: new Date('2024-01-12T11:00:00'), employeeId: 'emp-4', type: 'meeting', notes: 'Channel partner - has multiple investor clients. Looking for bulk deal in Thane.' },
      { id: 'int-l9-3', timestamp: new Date('2024-01-13T11:30:00'), employeeId: 'emp-4', type: 'call', outcome: 'follow_up', duration: 300, notes: 'Discussed bulk pricing options. Need manager approval for special rates.' }
    ],
    assignmentHistory: [
      { id: 'ah-l9-1', employeeId: 'emp-4', employeeName: 'Sneha Reddy', assignedAt: new Date('2024-01-12T10:00:00') }
    ]
  },
  {
    id: 'lead-10',
    name: 'Ritu Sharma',
    email: 'ritu.sharma@email.com',
    phone: '+91 99887 76664',
    status: 'negotiation',
    source: 'google_ads',
    tags: ['vip', 'hot'],
    aiScore: 90,
    assignedEmployee: 'emp-2',
    lastSpokenEmployee: 'emp-2',
    propertyInterest: ['penthouse'],
    budgetMin: 60000000,
    budgetMax: 90000000,
    location: 'Lower Parel',
    lastNote: 'Final negotiation stage. Wants 5% discount. Manager approval pending.',
    lastInteraction: new Date('2024-01-15T12:00:00'),
    createdAt: new Date('2024-01-03T09:00:00'),
    whatsappStatus: 'active',
    projectCategory: 'penthouse',
    linkedPropertyId: 'prop-7',
    preferredSqft: { min: 3500, max: 5500 },
    preferredBedrooms: 4,
    firstContactDate: new Date('2024-01-03T10:00:00'),
    requirements: '360-degree view penthouse in Lower Parel, home automation, private terrace',
    interactions: [
      { id: 'int-l10-1', timestamp: new Date('2024-01-03T09:00:00'), employeeId: 'emp-3', type: 'assignment', notes: 'Google Ads lead' },
      { id: 'int-l10-2', timestamp: new Date('2024-01-03T10:00:00'), employeeId: 'emp-3', type: 'call', outcome: 'connected', duration: 360, notes: 'Initial call - looking for luxury penthouse in Lower Parel. High intent.' },
      { id: 'int-l10-3', timestamp: new Date('2024-01-05T14:00:00'), employeeId: 'emp-3', type: 'whatsapp', outcome: 'interested', notes: 'Shared Lower Parel Sky Penthouse details' },
      { id: 'int-l10-4', timestamp: new Date('2024-01-07T10:00:00'), employeeId: 'emp-2', type: 'assignment', notes: 'Hot lead - escalated to Priya for faster closure' },
      { id: 'int-l10-5', timestamp: new Date('2024-01-07T15:00:00'), employeeId: 'emp-2', type: 'site_visit', notes: 'Site visit completed. Client loved the 360-degree view. Very serious buyer.' },
      { id: 'int-l10-6', timestamp: new Date('2024-01-10T11:00:00'), employeeId: 'emp-2', type: 'meeting', notes: 'Price discussion meeting. Client asking for 5% discount.' },
      { id: 'int-l10-7', timestamp: new Date('2024-01-15T12:00:00'), employeeId: 'emp-2', type: 'call', outcome: 'follow_up', duration: 600, notes: 'Final negotiation. Waiting for manager approval on discount.' }
    ],
    assignmentHistory: [
      { id: 'ah-l10-1', employeeId: 'emp-3', employeeName: 'Amit Kumar', assignedAt: new Date('2024-01-03T09:00:00'), unassignedAt: new Date('2024-01-07T10:00:00'), reason: 'Hot lead - escalated to senior team' },
      { id: 'ah-l10-2', employeeId: 'emp-2', employeeName: 'Priya Patel', assignedAt: new Date('2024-01-07T10:00:00') }
    ]
  }
]

// Mock Lead Groups
export const leadGroups: LeadGroup[] = [
  {
    id: 'group-1',
    name: 'Premium Apartment Leads - Q1',
    projectCategory: 'apartment',
    description: 'High-value apartment leads from Worli and Powai',
    createdAt: new Date('2024-01-01T00:00:00'),
    leadIds: ['lead-2', 'lead-4', 'lead-6'],
    assignedEmployees: ['emp-1', 'emp-4']
  },
  {
    id: 'group-2',
    name: 'Luxury Penthouse Collection',
    projectCategory: 'penthouse',
    description: 'Ultra-HNI leads for penthouse properties',
    createdAt: new Date('2024-01-02T00:00:00'),
    leadIds: ['lead-1', 'lead-10'],
    assignedEmployees: ['emp-2', 'emp-5']
  },
  {
    id: 'group-3',
    name: 'Commercial BKC Prospects',
    projectCategory: 'commercial',
    description: 'Corporate clients looking for BKC office space',
    createdAt: new Date('2024-01-03T00:00:00'),
    leadIds: ['lead-3'],
    assignedEmployees: ['emp-3']
  },
  {
    id: 'group-4',
    name: 'Villa & Farmhouse Seekers',
    projectCategory: 'villa',
    description: 'Weekend getaway and luxury villa leads',
    createdAt: new Date('2024-01-04T00:00:00'),
    leadIds: ['lead-5', 'lead-8'],
    assignedEmployees: ['emp-1', 'emp-5']
  },
  {
    id: 'group-5',
    name: 'General Live Leads',
    projectCategory: 'general_live',
    description: 'Unqualified leads needing initial contact and qualification',
    createdAt: new Date('2024-01-05T00:00:00'),
    leadIds: ['lead-7', 'lead-9'],
    assignedEmployees: ['emp-4', 'emp-6']
  }
]

// Mock WhatsApp Conversations with AI Sentiment Analysis
export const whatsappConversations: WhatsAppConversation[] = [
  {
    id: 'conv-1',
    leadId: 'lead-1',
    messages: [
      { id: 'msg-1-1', content: 'Hello, I saw your ad about the penthouse in Bandra West. Is it still available?', sender: 'lead', timestamp: new Date('2024-01-15T09:30:00'), status: 'read', type: 'text', sentiment: 'positive', aiAnalysis: { intent: 'inquiry', urgency: 'high', suggestedAction: 'Share property details immediately' } },
      { id: 'msg-1-2', content: 'Good morning! Yes, the Azure Heights Penthouse is still available. It\'s a stunning 4BHK with sea views. Would you like me to share the brochure?', sender: 'employee', employeeId: 'emp-4', timestamp: new Date('2024-01-15T09:32:00'), status: 'read', type: 'text' },
      { id: 'msg-1-3', content: 'Yes please, that would be great!', sender: 'lead', timestamp: new Date('2024-01-15T09:33:00'), status: 'read', type: 'text', sentiment: 'positive', aiAnalysis: { intent: 'engagement', urgency: 'high', suggestedAction: 'Send brochure and schedule call' } },
      { id: 'msg-1-4', content: 'Azure_Heights_Brochure.pdf', sender: 'employee', employeeId: 'emp-4', timestamp: new Date('2024-01-15T09:35:00'), status: 'read', type: 'document' },
      { id: 'msg-1-5', content: 'This looks amazing! What\'s the asking price?', sender: 'lead', timestamp: new Date('2024-01-15T10:00:00'), status: 'read', type: 'text', sentiment: 'positive', aiAnalysis: { intent: 'price_inquiry', urgency: 'high', suggestedAction: 'Provide pricing with value justification' } },
      { id: 'msg-1-6', content: 'The property is priced at Rs 7.5 Crores. Given its prime location and amenities, it offers excellent value. Would you like to schedule a site visit?', sender: 'employee', employeeId: 'emp-2', timestamp: new Date('2024-01-15T10:02:00'), status: 'read', type: 'text' },
      { id: 'msg-1-7', content: 'That sounds good. Can we do it this weekend?', sender: 'lead', timestamp: new Date('2024-01-15T10:15:00'), status: 'read', type: 'text', sentiment: 'positive', aiAnalysis: { intent: 'site_visit_request', urgency: 'high', suggestedAction: 'Confirm visit and send calendar invite' } }
    ],
    lastMessageAt: new Date('2024-01-15T10:15:00'),
    employeeHistory: [
      { employeeId: 'emp-4', employeeName: 'Sneha Reddy', messageCount: 2, firstMessageAt: new Date('2024-01-15T09:32:00'), lastMessageAt: new Date('2024-01-15T09:35:00') },
      { employeeId: 'emp-2', employeeName: 'Priya Patel', messageCount: 1, firstMessageAt: new Date('2024-01-15T10:02:00'), lastMessageAt: new Date('2024-01-15T10:02:00') }
    ],
    aiSentiment: {
      current: 'hot',
      trend: 'heating_up',
      confidence: 92,
      reasoning: 'Lead showing strong buying signals - requested brochure, asked about pricing, and proactively requested site visit. Response time is quick indicating high interest.',
      predictedStatus: 'negotiation',
      riskFactors: [],
      opportunities: ['Ready for site visit', 'High budget alignment', 'Quick decision maker']
    },
    stats: { totalMessages: 7, responseRate: 100, avgResponseTime: 3, engagementScore: 95 }
  },
  {
    id: 'conv-2',
    leadId: 'lead-2',
    messages: [
      { id: 'msg-2-1', content: 'Hi, I was referred by my friend Vijay Malhotra. Looking for a 3BHK in Worli.', sender: 'lead', timestamp: new Date('2024-01-14T11:00:00'), status: 'read', type: 'text', sentiment: 'positive', aiAnalysis: { intent: 'referral_inquiry', urgency: 'high', suggestedAction: 'Acknowledge referral and prioritize' } },
      { id: 'msg-2-2', content: 'Welcome! Vijay is one of our valued clients. I have some excellent options in Worli. What\'s your budget range?', sender: 'employee', employeeId: 'emp-1', timestamp: new Date('2024-01-14T11:05:00'), status: 'read', type: 'text' },
      { id: 'msg-2-3', content: 'Around 3-4.5 Cr. Sea view would be nice but not mandatory.', sender: 'lead', timestamp: new Date('2024-01-14T11:10:00'), status: 'read', type: 'text', sentiment: 'neutral', aiAnalysis: { intent: 'budget_disclosure', urgency: 'medium', suggestedAction: 'Present 2-3 matching options' } },
      { id: 'msg-2-4', content: 'Perfect! I have 3 properties that match. Let me send you the details.', sender: 'employee', employeeId: 'emp-1', timestamp: new Date('2024-01-14T11:15:00'), status: 'read', type: 'text' },
      { id: 'msg-2-5', content: 'I visited the Worli Sea Pearl yesterday. Nice property but a bit over budget. Are there any ongoing offers?', sender: 'lead', timestamp: new Date('2024-01-14T16:45:00'), status: 'read', type: 'text', sentiment: 'neutral', aiAnalysis: { intent: 'negotiation', urgency: 'medium', suggestedAction: 'Check for offers or payment flexibility' } }
    ],
    lastMessageAt: new Date('2024-01-14T16:45:00'),
    employeeHistory: [
      { employeeId: 'emp-1', employeeName: 'Rajesh Sharma', messageCount: 2, firstMessageAt: new Date('2024-01-14T11:05:00'), lastMessageAt: new Date('2024-01-14T11:15:00') }
    ],
    aiSentiment: {
      current: 'warm',
      trend: 'stable',
      confidence: 78,
      reasoning: 'Referral lead with clear requirements. Visited property but concerned about budget. Need to address pricing or find alternatives.',
      predictedStatus: 'negotiation',
      riskFactors: ['Budget sensitivity', 'Comparing options'],
      opportunities: ['Strong referral connection', 'Already visited site', 'Clear requirements']
    },
    stats: { totalMessages: 5, responseRate: 100, avgResponseTime: 5, engagementScore: 82 }
  },
  {
    id: 'conv-3',
    leadId: 'lead-3',
    messages: [
      { id: 'msg-3-1', content: 'Need commercial space in BKC. 10000+ sqft.', sender: 'lead', timestamp: new Date('2024-01-08T10:30:00'), status: 'read', type: 'text', sentiment: 'neutral', aiAnalysis: { intent: 'commercial_inquiry', urgency: 'medium', suggestedAction: 'Understand business requirements' } },
      { id: 'msg-3-2', content: 'Good morning! We have excellent Grade A options in BKC. Could you share more about your business needs?', sender: 'employee', employeeId: 'emp-6', timestamp: new Date('2024-01-08T10:45:00'), status: 'read', type: 'text' },
      { id: 'msg-3-3', content: 'IT company expanding. Need modern office with good connectivity.', sender: 'lead', timestamp: new Date('2024-01-08T11:00:00'), status: 'read', type: 'text', sentiment: 'neutral', aiAnalysis: { intent: 'requirement_sharing', urgency: 'medium', suggestedAction: 'Recommend BKC Corporate Tower' } },
      { id: 'msg-3-4', content: 'Will check the options and revert', sender: 'lead', timestamp: new Date('2024-01-10T14:00:00'), status: 'read', type: 'text', sentiment: 'neutral', aiAnalysis: { intent: 'delay', urgency: 'low', suggestedAction: 'Follow up in 2 days' } },
      { id: 'msg-3-5', content: 'Hi, any update on the commercial space decision?', sender: 'employee', employeeId: 'emp-3', timestamp: new Date('2024-01-13T14:00:00'), status: 'delivered', type: 'text' },
      { id: 'msg-3-6', content: 'Still evaluating. Board meeting next week.', sender: 'lead', timestamp: new Date('2024-01-13T14:20:00'), status: 'read', type: 'text', sentiment: 'neutral', aiAnalysis: { intent: 'decision_pending', urgency: 'low', suggestedAction: 'Schedule follow-up post board meeting' } }
    ],
    lastMessageAt: new Date('2024-01-13T14:20:00'),
    employeeHistory: [
      { employeeId: 'emp-6', employeeName: 'Ananya Gupta', messageCount: 1, firstMessageAt: new Date('2024-01-08T10:45:00'), lastMessageAt: new Date('2024-01-08T10:45:00') },
      { employeeId: 'emp-3', employeeName: 'Amit Kumar', messageCount: 1, firstMessageAt: new Date('2024-01-13T14:00:00'), lastMessageAt: new Date('2024-01-13T14:00:00') }
    ],
    aiSentiment: {
      current: 'neutral',
      trend: 'cooling_down',
      confidence: 65,
      reasoning: 'Corporate decision-making process is slow. Lead is evaluating but not highly engaged. Board meeting decision pending.',
      predictedStatus: 'contacted',
      riskFactors: ['Slow response time', 'Corporate bureaucracy', 'May choose competitor'],
      opportunities: ['Large deal potential', 'Clear requirements', 'Board meeting scheduled']
    },
    stats: { totalMessages: 6, responseRate: 75, avgResponseTime: 180, engagementScore: 55 }
  },
  {
    id: 'conv-4',
    leadId: 'lead-10',
    messages: [
      { id: 'msg-4-1', content: 'Interested in penthouse Lower Parel. Budget 6-9 Cr.', sender: 'lead', timestamp: new Date('2024-01-03T10:00:00'), status: 'read', type: 'text', sentiment: 'positive', aiAnalysis: { intent: 'high_value_inquiry', urgency: 'high', suggestedAction: 'Prioritize and share premium options' } },
      { id: 'msg-4-2', content: 'Excellent choice! Lower Parel has some of Mumbai\'s finest penthouses. I have a stunning 360-degree view unit. When can we connect?', sender: 'employee', employeeId: 'emp-3', timestamp: new Date('2024-01-03T10:15:00'), status: 'read', type: 'text' },
      { id: 'msg-4-3', content: 'Tomorrow afternoon works', sender: 'lead', timestamp: new Date('2024-01-03T10:20:00'), status: 'read', type: 'text', sentiment: 'positive', aiAnalysis: { intent: 'meeting_acceptance', urgency: 'high', suggestedAction: 'Confirm meeting and prepare presentation' } },
      { id: 'msg-4-4', content: 'The site visit was great! The view is unmatched. Let\'s discuss pricing.', sender: 'lead', timestamp: new Date('2024-01-07T16:00:00'), status: 'read', type: 'text', sentiment: 'positive', aiAnalysis: { intent: 'negotiation_start', urgency: 'high', suggestedAction: 'Prepare pricing proposal' } },
      { id: 'msg-4-5', content: 'I\'m glad you loved it! The property is priced at Rs 8.5 Cr. Given the premium amenities and unobstructed views, it\'s excellent value.', sender: 'employee', employeeId: 'emp-2', timestamp: new Date('2024-01-07T16:30:00'), status: 'read', type: 'text' },
      { id: 'msg-4-6', content: 'Can we do 8 Cr? I\'m ready to close if price works.', sender: 'lead', timestamp: new Date('2024-01-10T11:00:00'), status: 'read', type: 'text', sentiment: 'positive', aiAnalysis: { intent: 'price_negotiation', urgency: 'high', suggestedAction: 'Escalate to manager for approval' } },
      { id: 'msg-4-7', content: 'Let me check with management on the best we can do. Will get back by EOD.', sender: 'employee', employeeId: 'emp-2', timestamp: new Date('2024-01-10T11:15:00'), status: 'read', type: 'text' },
      { id: 'msg-4-8', content: 'Any update on the pricing?', sender: 'lead', timestamp: new Date('2024-01-15T12:00:00'), status: 'read', type: 'text', sentiment: 'neutral', aiAnalysis: { intent: 'follow_up', urgency: 'high', suggestedAction: 'Respond immediately with decision' } }
    ],
    lastMessageAt: new Date('2024-01-15T12:00:00'),
    employeeHistory: [
      { employeeId: 'emp-3', employeeName: 'Amit Kumar', messageCount: 1, firstMessageAt: new Date('2024-01-03T10:15:00'), lastMessageAt: new Date('2024-01-03T10:15:00') },
      { employeeId: 'emp-2', employeeName: 'Priya Patel', messageCount: 2, firstMessageAt: new Date('2024-01-07T16:30:00'), lastMessageAt: new Date('2024-01-10T11:15:00') }
    ],
    aiSentiment: {
      current: 'hot',
      trend: 'critical',
      confidence: 88,
      reasoning: 'Ready buyer waiting for price confirmation. Delay in response could lose the deal. Immediate action required.',
      predictedStatus: 'won',
      riskFactors: ['Waiting for price approval', 'May lose patience', 'Could explore other options'],
      opportunities: ['Ready to close', 'Clear budget', 'Loved the property']
    },
    stats: { totalMessages: 8, responseRate: 100, avgResponseTime: 15, engagementScore: 90 }
  },
  {
    id: 'conv-5',
    leadId: 'lead-8',
    messages: [
      { id: 'msg-5-1', content: 'Looking for farmhouse in Alibaug. Weekend getaway for family.', sender: 'lead', timestamp: new Date('2024-01-07T16:00:00'), status: 'read', type: 'text', sentiment: 'positive', aiAnalysis: { intent: 'lifestyle_inquiry', urgency: 'medium', suggestedAction: 'Understand lifestyle needs' } },
      { id: 'msg-5-2', content: 'Alibaug is perfect for weekend retreats! What\'s your preferred budget and must-haves?', sender: 'employee', employeeId: 'emp-6', timestamp: new Date('2024-01-07T16:15:00'), status: 'read', type: 'text' },
      { id: 'msg-5-3', content: '8-12 Cr. Need good space for kids, maybe a pool. Organic farm would be amazing.', sender: 'lead', timestamp: new Date('2024-01-07T16:30:00'), status: 'read', type: 'text', sentiment: 'positive', aiAnalysis: { intent: 'requirement_detail', urgency: 'medium', suggestedAction: 'Match with Alibaug Luxury Farmhouse' } },
      { id: 'msg-5-4', content: 'I have the perfect property - 15,000 sqft estate with organic farm, pool, and kids play area. Let me transfer you to Rajesh who specializes in farmhouse properties.', sender: 'employee', employeeId: 'emp-6', timestamp: new Date('2024-01-07T17:00:00'), status: 'read', type: 'text' },
      { id: 'msg-5-5', content: 'Hi Meera, Rajesh here. I\'ve curated some beautiful farmhouse options for you. When would be a good time for a call?', sender: 'employee', employeeId: 'emp-1', timestamp: new Date('2024-01-08T10:00:00'), status: 'read', type: 'text' },
      { id: 'msg-5-6', content: 'Tomorrow morning works. Around 11?', sender: 'lead', timestamp: new Date('2024-01-08T10:30:00'), status: 'read', type: 'text', sentiment: 'positive', aiAnalysis: { intent: 'call_scheduling', urgency: 'medium', suggestedAction: 'Confirm call and prepare portfolio' } },
      { id: 'msg-5-7', content: 'The call was very helpful. The Alibaug estate sounds perfect. Can we visit this weekend?', sender: 'lead', timestamp: new Date('2024-01-14T18:00:00'), status: 'read', type: 'text', sentiment: 'positive', aiAnalysis: { intent: 'site_visit_request', urgency: 'high', suggestedAction: 'Arrange weekend visit with transport' } }
    ],
    lastMessageAt: new Date('2024-01-14T18:00:00'),
    employeeHistory: [
      { employeeId: 'emp-6', employeeName: 'Ananya Gupta', messageCount: 2, firstMessageAt: new Date('2024-01-07T16:15:00'), lastMessageAt: new Date('2024-01-07T17:00:00') },
      { employeeId: 'emp-1', employeeName: 'Rajesh Sharma', messageCount: 1, firstMessageAt: new Date('2024-01-08T10:00:00'), lastMessageAt: new Date('2024-01-08T10:00:00') }
    ],
    aiSentiment: {
      current: 'hot',
      trend: 'heating_up',
      confidence: 85,
      reasoning: 'Family-focused buyer with clear vision. Smooth handoff between employees. Ready for site visit - high conversion potential.',
      predictedStatus: 'qualified',
      riskFactors: ['Distance from Mumbai might be concern'],
      opportunities: ['Clear lifestyle need', 'Good budget', 'Family decision - longer commitment', 'Site visit scheduled']
    },
    stats: { totalMessages: 7, responseRate: 100, avgResponseTime: 20, engagementScore: 88 }
  }
]

// Mock Properties
export const properties: Property[] = [
  {
    id: 'prop-1',
    name: 'Azure Heights Penthouse',
    type: 'penthouse',
    location: 'Bandra West',
    area: 'Mumbai',
    price: 75000000,
    pricePerSqft: 45000,
    bedrooms: 4,
    bathrooms: 5,
    sqft: 4500,
    status: 'available',
    roi: 8.5,
    images: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop'
    ],
    amenities: ['Private Pool', 'Terrace Garden', 'Smart Home', 'Sea View', 'Private Elevator'],
    developer: 'Lodha Group',
    completionDate: 'Ready to Move',
    featured: true
  },
  {
    id: 'prop-2',
    name: 'Worli Sea Face Residency',
    type: 'apartment',
    location: 'Worli',
    area: 'Mumbai',
    price: 42000000,
    pricePerSqft: 52000,
    bedrooms: 3,
    bathrooms: 3,
    sqft: 2800,
    status: 'available',
    roi: 7.2,
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop'
    ],
    amenities: ['Sea View', 'Gym', 'Swimming Pool', 'Concierge', 'Valet Parking'],
    developer: 'Oberoi Realty',
    completionDate: 'Ready to Move',
    featured: true
  },
  {
    id: 'prop-3',
    name: 'Juhu Beach Villa',
    type: 'villa',
    location: 'Juhu',
    area: 'Mumbai',
    price: 150000000,
    pricePerSqft: 75000,
    bedrooms: 6,
    bathrooms: 7,
    sqft: 8000,
    status: 'reserved',
    roi: 6.8,
    images: [
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop'
    ],
    amenities: ['Private Beach Access', 'Home Theater', 'Wine Cellar', 'Guest House', 'Helipad'],
    developer: 'Private Sale',
    completionDate: 'Ready to Move',
    featured: true
  },
  {
    id: 'prop-4',
    name: 'BKC Corporate Tower',
    type: 'commercial',
    location: 'BKC',
    area: 'Mumbai',
    price: 125000000,
    pricePerSqft: 35000,
    bedrooms: 0,
    bathrooms: 4,
    sqft: 12000,
    status: 'available',
    roi: 9.5,
    images: [
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=600&fit=crop'
    ],
    amenities: ['Grade A Office', 'LEED Certified', 'Food Court', 'Metro Connected', 'Ample Parking'],
    developer: 'Godrej Properties',
    completionDate: 'Dec 2024',
    featured: false
  },
  {
    id: 'prop-5',
    name: 'Alibaug Luxury Farmhouse',
    type: 'farmhouse',
    location: 'Alibaug',
    area: 'Raigad',
    price: 95000000,
    pricePerSqft: 15000,
    bedrooms: 5,
    bathrooms: 6,
    sqft: 15000,
    status: 'available',
    roi: 5.5,
    images: [
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop'
    ],
    amenities: ['Private Pool', 'Organic Farm', 'Guest Cottage', 'Stables', 'Tennis Court'],
    developer: 'Custom Build',
    completionDate: 'Ready to Move',
    featured: true
  },
  {
    id: 'prop-6',
    name: 'Powai Lake View Duplex',
    type: 'duplex',
    location: 'Powai',
    area: 'Mumbai',
    price: 32000000,
    pricePerSqft: 28000,
    bedrooms: 4,
    bathrooms: 4,
    sqft: 3200,
    status: 'available',
    roi: 7.8,
    images: [
      'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&h=600&fit=crop'
    ],
    amenities: ['Lake View', 'Private Garden', 'Club House', 'Jogging Track', 'Kids Play Area'],
    developer: 'Hiranandani',
    completionDate: 'Ready to Move',
    featured: false
  },
  {
    id: 'prop-7',
    name: 'Lower Parel Sky Penthouse',
    type: 'penthouse',
    location: 'Lower Parel',
    area: 'Mumbai',
    price: 85000000,
    pricePerSqft: 55000,
    bedrooms: 5,
    bathrooms: 6,
    sqft: 5200,
    status: 'available',
    roi: 8.2,
    images: [
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&h=600&fit=crop'
    ],
    amenities: ['360° View', 'Private Terrace', 'Smart Home', 'Private Lift', 'Panic Room'],
    developer: 'Piramal Realty',
    completionDate: 'Ready to Move',
    featured: true
  },
  {
    id: 'prop-8',
    name: 'Andheri Premium Studio',
    type: 'studio',
    location: 'Andheri East',
    area: 'Mumbai',
    price: 12000000,
    pricePerSqft: 20000,
    bedrooms: 1,
    bathrooms: 1,
    sqft: 650,
    status: 'available',
    roi: 10.5,
    images: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop'
    ],
    amenities: ['Metro Adjacent', 'Co-Working Space', 'Gym', 'Rooftop Lounge', 'EV Charging'],
    developer: 'Runwal Group',
    completionDate: 'Mar 2024',
    featured: false
  },
  {
    id: 'prop-9',
    name: 'Thane Riverside Bungalow',
    type: 'bungalow',
    location: 'Thane West',
    area: 'Thane',
    price: 55000000,
    pricePerSqft: 22000,
    bedrooms: 5,
    bathrooms: 5,
    sqft: 6500,
    status: 'upcoming',
    roi: 7.5,
    images: [
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&h=600&fit=crop'
    ],
    amenities: ['Creek View', 'Private Garden', 'Home Office', 'Servant Quarters', 'Security'],
    developer: 'Raymond Realty',
    completionDate: 'Jun 2025',
    featured: false
  },
  {
    id: 'prop-10',
    name: 'South Mumbai Heritage Apartment',
    type: 'apartment',
    location: 'Colaba',
    area: 'Mumbai',
    price: 65000000,
    pricePerSqft: 65000,
    bedrooms: 3,
    bathrooms: 3,
    sqft: 2200,
    status: 'sold',
    roi: 6.5,
    images: [
      'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=800&h=600&fit=crop'
    ],
    amenities: ['Heritage Building', 'High Ceilings', 'Sea Facing', 'Antique Flooring', 'Balcony'],
    developer: 'Private Sale',
    completionDate: 'Ready to Move',
    featured: true
  }
]

// Mock Site Visits
export const siteVisits: SiteVisit[] = [
  {
    id: 'sv-1',
    leadId: 'lead-1',
    leadName: 'Arjun Mehta',
    propertyId: 'prop-1',
    propertyName: 'Azure Heights Penthouse',
    employeeId: 'emp-2',
    employeeName: 'Priya Patel',
    scheduledDate: new Date('2024-01-17T11:00:00'),
    status: 'scheduled'
  },
  {
    id: 'sv-2',
    leadId: 'lead-8',
    leadName: 'Meera Nair',
    propertyId: 'prop-5',
    propertyName: 'Alibaug Luxury Farmhouse',
    employeeId: 'emp-1',
    employeeName: 'Rajesh Sharma',
    scheduledDate: new Date('2024-01-20T10:00:00'),
    status: 'scheduled'
  },
  {
    id: 'sv-3',
    leadId: 'lead-10',
    leadName: 'Ritu Sharma',
    propertyId: 'prop-7',
    propertyName: 'Lower Parel Sky Penthouse',
    employeeId: 'emp-2',
    employeeName: 'Priya Patel',
    scheduledDate: new Date('2024-01-12T14:00:00'),
    status: 'completed',
    feedback: 'Loved the property. Wants to proceed with negotiation.',
    rating: 5
  },
  {
    id: 'sv-4',
    leadId: 'lead-2',
    leadName: 'Kavita Desai',
    propertyId: 'prop-2',
    propertyName: 'Worli Sea Face Residency',
    employeeId: 'emp-1',
    employeeName: 'Rajesh Sharma',
    scheduledDate: new Date('2024-01-10T16:00:00'),
    status: 'completed',
    feedback: 'Good property but comparing with others.',
    rating: 4
  },
  {
    id: 'sv-5',
    leadId: 'lead-4',
    leadName: 'Neha Joshi',
    propertyId: 'prop-6',
    propertyName: 'Powai Lake View Duplex',
    employeeId: 'emp-4',
    employeeName: 'Sneha Reddy',
    scheduledDate: new Date('2024-01-18T15:00:00'),
    status: 'scheduled'
  }
]

// Mock Scripts
export const scripts: Script[] = [
  {
    id: 'script-1',
    title: 'Premium First Call Introduction',
    category: 'first_call',
    content: `Good [morning/afternoon], this is [Name] from Pikorua Realty, Mumbai's premier luxury property consultants.

I noticed you expressed interest in our exclusive collection of [property type] properties. I'd love to understand your vision for your dream home.

May I know what's inspiring this search? Is it for personal residence, investment, or perhaps a weekend retreat?

[Listen actively and note preferences]

Based on what you've shared, I believe we have some exceptional properties that would align perfectly with your lifestyle. Would you be open to a brief conversation about your specific requirements?`,
    tags: ['introduction', 'qualification', 'luxury'],
    usageCount: 245
  },
  {
    id: 'script-2',
    title: 'Follow-up After Site Visit',
    category: 'follow_up',
    content: `Good [morning/afternoon] [Client Name], this is [Your Name] from Pikorua Realty.

I wanted to personally follow up on your visit to [Property Name] yesterday. It was a pleasure showing you the property.

I'd love to hear your thoughts. Did the property meet your expectations? What aspects resonated most with you?

[Listen and address concerns]

I understand [acknowledge their point]. Many of our discerning clients initially felt the same way, and they've found that [provide solution/perspective].

Would you like me to arrange another viewing, perhaps at a different time of day to experience the property's ambiance? Or shall we explore some similar options that might address your concerns?`,
    tags: ['follow-up', 'site-visit', 'engagement'],
    usageCount: 189
  },
  {
    id: 'script-3',
    title: 'Handling Price Objection',
    category: 'objection',
    content: `I completely understand your perspective on the pricing, [Client Name]. Luxury real estate in [Location] is indeed a significant investment.

Let me share some context that our most satisfied clients have found valuable:

1. **Location Premium**: This property is in one of Mumbai's most coveted addresses. Properties here have appreciated at [X]% annually over the past decade.

2. **Developer Reputation**: [Developer Name] has a track record of delivering projects that maintain and grow in value.

3. **Exclusivity Factor**: There are only [X] units in this entire project, ensuring your investment remains exclusive.

4. **Total Cost of Ownership**: When you factor in the amenities, maintenance, and lifestyle benefits, the value proposition becomes clearer.

Would you like me to walk you through a detailed investment analysis? I can show you comparable transactions and projected appreciation.`,
    tags: ['objection', 'pricing', 'negotiation'],
    usageCount: 312
  },
  {
    id: 'script-4',
    title: 'VIP Ultra-HNI Client Approach',
    category: 'vip',
    content: `Good [morning/afternoon], [Honorific] [Last Name]. This is [Your Name], Senior Consultant at Pikorua Realty.

I'm reaching out because we've just acquired exclusive rights to present [Property Name] - a truly exceptional property that I believe aligns with your distinguished taste.

This isn't something we're marketing publicly. Given your profile and previous discussions about [specific preference they mentioned], I immediately thought of you.

The property offers [unique selling point 1], [unique selling point 2], and [unique selling point 3] - elements that are virtually impossible to find elsewhere in Mumbai.

I would be honored to arrange a private viewing at your convenience. We can also organize a helicopter tour of the area if that would be of interest.

Would [specific date/time] work for your schedule, or shall I coordinate with your assistant?`,
    tags: ['vip', 'ultra-hni', 'exclusive'],
    usageCount: 87
  },
  {
    id: 'script-5',
    title: 'Negotiation Closing Script',
    category: 'negotiation',
    content: `[Client Name], I've had a detailed discussion with our management regarding your proposal.

Given your genuine interest and the potential for a long-term relationship, we've been able to secure the following for you:

1. [Concession 1 - e.g., "A special price of ₹X Cr, which is X% below the listed price"]
2. [Concession 2 - e.g., "Complimentary premium interior package worth ₹X Lakhs"]
3. [Concession 3 - e.g., "Flexible payment plan with X% now and rest on possession"]

I must be transparent - this offer is valid for the next [timeframe] as we have two other serious buyers considering this property.

To move forward, we would need:
- A token amount of ₹[X] Lakhs
- Signed expression of interest

Shall I prepare the paperwork? I can have everything ready for your review by [timeframe].`,
    tags: ['negotiation', 'closing', 'deal'],
    usageCount: 156
  },
  {
    id: 'script-6',
    title: 'Luxury Psychology - Aspirational Appeal',
    category: 'luxury_psychology',
    content: `[Client Name], I want to share something with you that goes beyond the property itself.

When our clients walk into their new home at [Property Name], they're not just buying square footage. They're investing in a lifestyle, a legacy, and a statement about who they are.

Consider this: In [Location], owning a property like this immediately places you among the most discerning 0.1% of Mumbai's residents. Your neighbors will be [notable neighbors/community].

Many of our clients tell us that the moment they moved in, their entire life elevated:
- Their children now have access to [exclusive amenity/school district]
- Their business meetings now happen in their private [feature]
- Their weekends are transformed with [lifestyle benefit]

This isn't just a purchase - it's a transformation. And transformations of this magnitude are rare opportunities.

Shall we discuss how we can make this transformation happen for you?`,
    tags: ['psychology', 'luxury', 'emotional'],
    usageCount: 203
  }
]

// Dashboard Stats
export const dashboardStats = {
  totalRevenue: 156800000,
  revenueGrowth: 23.5,
  totalLeads: 342,
  leadGrowth: 18.2,
  conversionRate: 12.8,
  conversionGrowth: 4.5,
  activeDeals: 28,
  dealGrowth: 15.0,
  avgDealSize: 45600000,
  targetAchievement: 78,
  whatsappMessages: 1256,
  siteVisits: 45,
  metaAdsSpend: 2500000,
  metaAdsLeads: 156,
  costPerLead: 16025
}

// Revenue Data for Charts
export const revenueData = [
  { month: 'Jul', revenue: 8500000, leads: 45, conversions: 5 },
  { month: 'Aug', revenue: 12200000, leads: 52, conversions: 7 },
  { month: 'Sep', revenue: 15800000, leads: 61, conversions: 9 },
  { month: 'Oct', revenue: 11500000, leads: 48, conversions: 6 },
  { month: 'Nov', revenue: 18900000, leads: 72, conversions: 11 },
  { month: 'Dec', revenue: 22400000, leads: 85, conversions: 14 },
  { month: 'Jan', revenue: 28500000, leads: 92, conversions: 18 }
]

// Meta Ads Data
export const metaAdsData = {
  campaigns: [
    { name: 'Luxury Penthouses - Mumbai', spend: 450000, leads: 32, cpl: 14062, quality: 'high' },
    { name: 'Sea-Facing Properties', spend: 380000, leads: 28, cpl: 13571, quality: 'high' },
    { name: 'Alibaug Farmhouses', spend: 220000, leads: 18, cpl: 12222, quality: 'medium' },
    { name: 'BKC Commercial', spend: 520000, leads: 24, cpl: 21666, quality: 'high' },
    { name: 'Worli Premium Apartments', spend: 340000, leads: 22, cpl: 15454, quality: 'medium' },
    { name: 'HNI Retargeting', spend: 180000, leads: 15, cpl: 12000, quality: 'high' }
  ],
  totalSpend: 2500000,
  totalLeads: 156,
  avgCPL: 16025,
  impressions: 2450000,
  clicks: 45600,
  ctr: 1.86
}

// Locations for dropdown
export const locations = [
  'Bandra West', 'Worli', 'Juhu', 'BKC', 'Lower Parel', 
  'Powai', 'Andheri East', 'Andheri West', 'Colaba', 
  'South Mumbai', 'Thane West', 'Alibaug', 'Goregaon'
]

// Budget ranges
export const budgetRanges = [
  { label: 'Under ₹2 Cr', min: 0, max: 20000000 },
  { label: '₹2 Cr - ₹5 Cr', min: 20000000, max: 50000000 },
  { label: '₹5 Cr - ₹10 Cr', min: 50000000, max: 100000000 },
  { label: '₹10 Cr - ₹25 Cr', min: 100000000, max: 250000000 },
  { label: '₹25 Cr - ₹50 Cr', min: 250000000, max: 500000000 },
  { label: 'Above ₹50 Cr', min: 500000000, max: Infinity }
]

// Property types for dropdown
export const propertyTypes: { label: string; value: PropertyType }[] = [
  { label: 'Apartment', value: 'apartment' },
  { label: 'Penthouse', value: 'penthouse' },
  { label: 'Bungalow', value: 'bungalow' },
  { label: 'Villa', value: 'villa' },
  { label: 'Commercial', value: 'commercial' },
  { label: 'Farmhouse', value: 'farmhouse' },
  { label: 'Duplex', value: 'duplex' },
  { label: 'Studio', value: 'studio' }
]

// Helper functions
export function formatCurrency(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`
  } else if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`
  }
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
    lost: 'bg-destructive/10 text-destructive border-destructive/20'
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
    hot: 'bg-chart-5/10 text-chart-5 border-chart-5/30'
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
    apartment: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    bungalow: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    commercial: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    villa: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    penthouse: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    farmhouse: 'bg-green-500/10 text-green-600 border-green-500/20',
    general_live: 'bg-orange-500/10 text-orange-600 border-orange-500/20'
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
    general_live: 'General Live'
  }
  return labels[category]
}

export function getWhatsAppConversationByLeadId(leadId: string): WhatsAppConversation | undefined {
  return whatsappConversations.find(c => c.leadId === leadId)
}

export function getSentimentColor(sentiment: 'hot' | 'warm' | 'neutral' | 'cold'): string {
  const colors = {
    hot: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    warm: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    neutral: 'text-slate-500 bg-slate-500/10 border-slate-500/20',
    cold: 'text-blue-500 bg-blue-500/10 border-blue-500/20'
  }
  return colors[sentiment]
}

export function getTrendIcon(trend: SentimentTrend): { icon: string; color: string; label: string } {
  const trends = {
    heating_up: { icon: 'TrendingUp', color: 'text-emerald-500', label: 'Heating Up' },
    cooling_down: { icon: 'TrendingDown', color: 'text-rose-500', label: 'Cooling Down' },
    stable: { icon: 'Minus', color: 'text-slate-500', label: 'Stable' },
    critical: { icon: 'AlertTriangle', color: 'text-amber-500', label: 'Critical - Action Needed' }
  }
  return trends[trend]
}

// Transformed exports for UI components

// Calling Scripts (transformed from scripts)
export const callingScripts = scripts.map(s => ({
  id: s.id,
  title: s.title,
  category: s.category === 'first_call' ? 'Cold Call' : 
            s.category === 'follow_up' ? 'Follow Up' : 
            s.category === 'objection' ? 'Objection Handling' :
            s.category === 'vip' ? 'Site Visit' :
            s.category === 'negotiation' ? 'Negotiation' : 'Closing',
  content: s.content,
  language: 'English',
  tips: s.tags.map(tag => `Best used for ${tag} scenarios`)
}))

// HNI Clients
export const hniClients = [
  {
    id: 'hni-1',
    name: 'Mukesh Ambani Jr.',
    email: 'mukesh.jr@reliance.com',
    phone: '+91 98765 00001',
    occupation: 'Business Tycoon',
    location: 'South Mumbai',
    tier: 'platinum' as const,
    portfolioValue: 450000000,
    propertiesOwned: 8,
    since: '2019',
    preferences: ['Sea View', 'Penthouse', 'Private Pool', 'Helipad Access']
  },
  {
    id: 'hni-2',
    name: 'Priya Birla',
    email: 'priya.b@birlagroup.com',
    phone: '+91 98765 00002',
    occupation: 'Industrialist',
    location: 'Juhu',
    tier: 'platinum' as const,
    portfolioValue: 380000000,
    propertiesOwned: 6,
    since: '2020',
    preferences: ['Beachfront', 'Heritage Properties', 'Art Gallery Space']
  },
  {
    id: 'hni-3',
    name: 'Rajiv Mehta',
    email: 'rajiv.m@techcorp.in',
    phone: '+91 98765 00003',
    occupation: 'Tech Entrepreneur',
    location: 'Bandra',
    tier: 'gold' as const,
    portfolioValue: 180000000,
    propertiesOwned: 4,
    since: '2021',
    preferences: ['Smart Home', 'Modern Architecture', 'Home Office']
  },
  {
    id: 'hni-4',
    name: 'Sunita Kapoor',
    email: 'sunita.k@bollywood.com',
    phone: '+91 98765 00004',
    occupation: 'Film Producer',
    location: 'Worli',
    tier: 'gold' as const,
    portfolioValue: 220000000,
    propertiesOwned: 5,
    since: '2020',
    preferences: ['Privacy', 'Home Theater', 'Terrace Garden']
  },
  {
    id: 'hni-5',
    name: 'Jitendra p.',
    email: 'jitendra.s@investments.com',
    phone: '+91 98765 00005',
    occupation: 'Investment Banker',
    location: 'Lower Parel',
    tier: 'silver' as const,
    portfolioValue: 95000000,
    propertiesOwned: 3,
    since: '2022',
    preferences: ['High ROI', 'Prime Location', 'Rental Income']
  },
  {
    id: 'hni-6',
    name: 'Ananya Reddy',
    email: 'ananya.r@pharma.com',
    phone: '+91 98765 00006',
    occupation: 'Pharma Heiress',
    location: 'Alibaug',
    tier: 'platinum' as const,
    portfolioValue: 520000000,
    propertiesOwned: 12,
    since: '2018',
    preferences: ['Farmhouse', 'Organic Farm', 'Weekend Retreat']
  }
]

// Site Visits (transformed format)
export const siteVisitsFormatted = siteVisits.map(sv => ({
  id: sv.id,
  leadId: sv.leadId,
  propertyId: sv.propertyId,
  employeeId: sv.employeeId,
  date: sv.scheduledDate.toISOString().split('T')[0],
  time: sv.scheduledDate.toTimeString().slice(0, 5),
  status: sv.status
}))

// Bookings
export const bookings = [
  {
    id: 'book-1',
    leadId: 'lead-5',
    propertyId: 'prop-3',
    date: '2024-01-12',
    amount: 150000000,
    commission: 3750000,
    status: 'confirmed' as const
  },
  {
    id: 'book-2',
    leadId: 'lead-10',
    propertyId: 'prop-7',
    date: '2024-01-15',
    amount: 85000000,
    commission: 2125000,
    status: 'pending' as const
  },
  {
    id: 'book-3',
    leadId: 'lead-2',
    propertyId: 'prop-2',
    date: '2024-01-08',
    amount: 42000000,
    commission: 1050000,
    status: 'confirmed' as const
  },
  {
    id: 'book-4',
    leadId: 'lead-1',
    propertyId: 'prop-1',
    date: '2024-01-18',
    amount: 75000000,
    commission: 1875000,
    status: 'pending' as const
  },
  {
    id: 'book-5',
    leadId: 'lead-8',
    propertyId: 'prop-5',
    date: '2024-01-06',
    amount: 95000000,
    commission: 2375000,
    status: 'cancelled' as const
  }
]

// Employees with additional fields for UI
export const employeesUI = employees.map((emp, index) => ({
  ...emp,
  phone: emp.phone,
  email: emp.email,
  role: emp.role === 'sales_executive' ? 'Sales Executive' :
        emp.role === 'senior_consultant' ? 'Senior Consultant' :
        emp.role === 'team_lead' ? 'Team Lead' :
        emp.role === 'manager' ? 'Manager' : 'Admin',
  performance: Math.round((emp.leadsConverted / emp.leadsAssigned) * 100),
  conversions: emp.leadsConverted,
  status: emp.status === 'online' ? 'active' as const : 'inactive' as const
}))


