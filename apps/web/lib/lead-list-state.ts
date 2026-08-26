import { EMPTY_LEAD_FILTERS, type LeadListFilters } from './lead-list-filter'

export type LeadTab = 'leads' | 'legacy' | 'freshly-assigned' | 'follow-ups' | 'overdue'

export type LeadListViewState = {
  version: 1
  search: string
  filters: LeadListFilters
  showFilters: boolean
  activeTab: LeadTab
}

export type LeadQueueSnapshot = {
  version: 1
  source: 'lead-list'
  ids: string[]
  createdAt: number
}

export const LEAD_LIST_VIEW_STATE_KEY = 'pikorua.leads.viewState.v1'
export const LEAD_QUEUE_SNAPSHOT_KEY = 'pikorua.leads.queue.v1'
export const LEGACY_LEAD_QUEUE_KEY = 'pikorua.leads.visibleOrder'

export const DEFAULT_LEAD_LIST_VIEW_STATE: LeadListViewState = {
  version: 1,
  search: '',
  filters: { ...EMPTY_LEAD_FILTERS },
  showFilters: false,
  activeTab: 'leads',
}

const FILTER_KEYS = Object.keys(EMPTY_LEAD_FILTERS) as Array<keyof LeadListFilters>
const LEAD_TABS = new Set<LeadTab>(['leads', 'legacy', 'freshly-assigned', 'follow-ups', 'overdue'])

export function parseLeadListViewState(raw: string | null): LeadListViewState {
  if (!raw) return { ...DEFAULT_LEAD_LIST_VIEW_STATE, filters: { ...EMPTY_LEAD_FILTERS } }

  try {
    const value = JSON.parse(raw) as Record<string, unknown>
    if (value.version !== 1 || typeof value.search !== 'string' || typeof value.showFilters !== 'boolean') {
      throw new Error('Invalid lead view state')
    }
    if (typeof value.activeTab !== 'string' || !LEAD_TABS.has(value.activeTab as LeadTab)) {
      throw new Error('Invalid lead tab')
    }
    if (!value.filters || typeof value.filters !== 'object' || Array.isArray(value.filters)) {
      throw new Error('Invalid lead filters')
    }

    const rawFilters = value.filters as Record<string, unknown>
    const filters = { ...EMPTY_LEAD_FILTERS }
    for (const key of FILTER_KEYS) {
      if (typeof rawFilters[key] !== 'string') throw new Error(`Invalid filter: ${key}`)
      filters[key] = rawFilters[key]
    }

    return {
      version: 1,
      search: value.search,
      filters,
      showFilters: value.showFilters,
      activeTab: value.activeTab as LeadTab,
    }
  } catch {
    return { ...DEFAULT_LEAD_LIST_VIEW_STATE, filters: { ...EMPTY_LEAD_FILTERS } }
  }
}

export function parseLeadQueueSnapshot(raw: string | null): LeadQueueSnapshot | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Record<string, unknown>
    if (value.version !== 1 || value.source !== 'lead-list' || !Array.isArray(value.ids)) return null
    if (!value.ids.every(id => typeof id === 'string') || typeof value.createdAt !== 'number') return null
    return { version: 1, source: 'lead-list', ids: value.ids as string[], createdAt: value.createdAt }
  } catch {
    return null
  }
}

export function readLeadListViewState(storage: Pick<Storage, 'getItem'> = window.sessionStorage) {
  return parseLeadListViewState(storage.getItem(LEAD_LIST_VIEW_STATE_KEY))
}

export function writeLeadListViewState(
  state: Omit<LeadListViewState, 'version'>,
  storage: Pick<Storage, 'setItem'> = window.sessionStorage,
) {
  storage.setItem(LEAD_LIST_VIEW_STATE_KEY, JSON.stringify({ ...state, version: 1 }))
}

export function writeLeadQueueSnapshot(ids: string[], storage: Pick<Storage, 'setItem'> = window.sessionStorage) {
  const snapshot: LeadQueueSnapshot = { version: 1, source: 'lead-list', ids, createdAt: Date.now() }
  storage.setItem(LEAD_QUEUE_SNAPSHOT_KEY, JSON.stringify(snapshot))
}

export function readLeadQueueSnapshot(storage: Pick<Storage, 'getItem'> = window.sessionStorage) {
  return parseLeadQueueSnapshot(storage.getItem(LEAD_QUEUE_SNAPSHOT_KEY))
}

export function clearLeadSectionState(storage: Pick<Storage, 'removeItem'> = window.sessionStorage) {
  storage.removeItem(LEAD_LIST_VIEW_STATE_KEY)
  storage.removeItem(LEAD_QUEUE_SNAPSHOT_KEY)
  storage.removeItem(LEGACY_LEAD_QUEUE_KEY)
}
