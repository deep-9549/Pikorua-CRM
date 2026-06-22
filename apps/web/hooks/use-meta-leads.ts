"use client"

import { useQuery } from "@tanstack/react-query"

type RawMetaLead = Record<string, unknown> & { crm?: unknown }

// The API returns crm as either an array or an object depending on the path.
// Normalize it to a single object (or null) so every consumer sees one shape.
function normalize(leads: RawMetaLead[]) {
  return leads.map((lead) => ({
    ...lead,
    crm: Array.isArray(lead.crm) ? (lead.crm[0] ?? null) : (lead.crm ?? null),
  }))
}

export function metaLeadsQueryKey(status?: string) {
  return status ? (["meta-leads", status] as const) : (["meta-leads"] as const)
}

/**
 * Shared, cached source of truth for the meta-leads list. Both the leads page
 * and the top-nav follow-up notifications read from this single query, so they
 * no longer each hit the API on every navigation.
 */
export function useMetaLeads<T = unknown>(status?: string) {
  return useQuery({
    queryKey: metaLeadsQueryKey(status),
    queryFn: async () => {
      const url = status
        ? `/api/leads/meta?status=${encodeURIComponent(status)}`
        : "/api/leads/meta"
      // A manual React Query refetch must reach the API instead of reusing a
      // browser/proxy response, otherwise the Refresh button can return stale data.
      const res = await fetch(url, { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to load leads")
      const json = await res.json()
      return normalize(json.leads ?? []) as unknown as T[]
    },
  })
}
