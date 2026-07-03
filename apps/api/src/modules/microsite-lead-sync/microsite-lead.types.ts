export type MicrositeLead = {
  id: number | string
  job_id: string | null
  name: string | null
  first_name: string | null
  last_name: string | null
  company: string | null
  phone: string
  email: string
  requirement: string | null
  budget: string | null
  message: string | null
  source: string | null
  verified_at: string | null
  created_at: string | null
  crm_synced?: boolean
}

export type MicrositeJob = {
  id: number | string
  job_id: string
  phone: string | null
  property_name: string | null
  location: string | null
  price: string | null
  firm_name: string | null
  zip_path: string | null
  generated_at: string | null
  compliance_errors: number | null
  compliance_warnings: number | null
  created_at: string | null
}

export type MicrositeLeadImportResult = 'imported' | 'duplicate'
