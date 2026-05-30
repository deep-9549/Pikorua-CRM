import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const UPCOMING_STATUSES = ["yet_to_visit", "visit_week_confirmed", "visit_date_confirmed"]
const PAST_STATUSES = ["visited"]
const VALID_STATUSES = [...UPCOMING_STATUSES, ...PAST_STATUSES]

// GET /api/site-visits?status=upcoming|past
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase
    .from("user_profiles").select("role").eq("id", user.id).single()

  const { searchParams } = new URL(request.url)
  const which = (searchParams.get("status") ?? "upcoming").toLowerCase()
  const filter = which === "past" ? PAST_STATUSES : UPCOMING_STATUSES

  // We query lead_crm_details for visit rows, then join the parent lead + scheduler.
  // For sales executives, RLS on meta_leads ensures they only see their own.
  let query = supabase
    .from("lead_crm_details")
    .select(`
      meta_lead_id,
      site_visit_status,
      visit_date,
      visit_confirmation_date,
      updated_at,
      scheduled_by_profile:user_profiles!updated_by(id, full_name),
      lead:meta_leads!inner(
        id, full_name, phone, email, city, campaign_name,
        assigned_to_profile:user_profiles!assigned_to(id, full_name)
      )
    `)
    .in("site_visit_status", filter)

  if (profile?.role === "sales_executive") {
    // Restrict to leads assigned to this user.
    query = query.eq("lead.assigned_to", user.id)
  }

  query = which === "past"
    ? query.order("updated_at", { ascending: false })
    : query.order("visit_date", { ascending: true, nullsFirst: false })

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ visits: data ?? [] })
}

// POST /api/site-visits — schedule/update a visit on a lead WITHOUT wiping other CRM fields
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase
    .from("user_profiles").select("role").eq("id", user.id).single()

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const lead_id = typeof body.lead_id === "string" ? body.lead_id : ""
  const site_visit_status = typeof body.site_visit_status === "string" ? body.site_visit_status : ""
  const visit_date = typeof body.visit_date === "string" && body.visit_date ? body.visit_date : null
  const visit_confirmation_date = typeof body.visit_confirmation_date === "string" && body.visit_confirmation_date ? body.visit_confirmation_date : null

  if (!lead_id) return NextResponse.json({ error: "lead_id is required" }, { status: 400 })
  if (!VALID_STATUSES.includes(site_visit_status))
    return NextResponse.json({ error: "Invalid site_visit_status" }, { status: 400 })

  // Authorize: sales executive can only schedule on leads they own
  if (profile?.role === "sales_executive") {
    const { data: lead } = await supabase
      .from("meta_leads").select("assigned_to").eq("id", lead_id).single()
    if (!lead || lead.assigned_to !== user.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Read existing CRM row so we preserve other fields
  const { data: existing } = await supabase
    .from("lead_crm_details").select("*").eq("meta_lead_id", lead_id).maybeSingle()

  const merged = {
    ...(existing ?? {}),
    meta_lead_id: lead_id,
    site_visit_status,
    visit_date,
    visit_confirmation_date,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  }
  // Don't try to overwrite the auto-generated id when upserting
  if (!existing) delete (merged as Record<string, unknown>).id

  const { data, error } = await supabase
    .from("lead_crm_details")
    .upsert(merged, { onConflict: "meta_lead_id" })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ crm: data })
}
