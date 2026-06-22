export interface MetaFieldData {
  name: string
  values?: string[]
}

export interface MetaLeadData {
  id: string
  created_time?: string
  ad_id?: string
  ad_name?: string
  adset_id?: string
  adset_name?: string
  campaign_id?: string
  campaign_name?: string
  form_id?: string
  field_data?: MetaFieldData[]
}

export interface MetaLeadForm {
  id: string
  name?: string
  status?: string
}

export interface MetaEdgePage<T> {
  data: T[]
  paging?: {
    cursors?: {
      before?: string
      after?: string
    }
    next?: string
  }
}

export const META_LEAD_FIELDS = [
  'id',
  'created_time',
  'ad_id',
  'ad_name',
  'adset_id',
  'adset_name',
  'campaign_id',
  'campaign_name',
  'form_id',
  'field_data',
].join(',')
