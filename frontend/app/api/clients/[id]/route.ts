import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

// GET /api/clients/[id] — client profile + full inquiry history (universal across all execs)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Use service role to bypass RLS — auth is already verified above.
  // We need this so sales executives can see the FULL client history,
  // including leads previously assigned to other executives.
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify the requesting user actually has a connection to this client
  // (super_admin can see all; sales_executive must have at least one lead for this client)
  const { data: profile } = await supabase
    .from("user_profiles").select("role").eq("id", user.id).single()

  if (profile?.role === "sales_executive") {
    const { count } = await admin
      .from("meta_leads")
      .select("id", { count: "exact", head: true })
      .eq("client_id", id)
      .eq("assigned_to", user.id)

    if (!count || count === 0)
      return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Client profile
  const { data: client, error: clientError } = await admin
    .from("clients")
    .select(`
      id, phone, full_name, email, city,
      status, status_note, status_updated_at,
      first_seen_at, last_seen_at, total_inquiries,
      status_updated_by_profile:user_profiles!status_updated_by(full_name)
    `)
    .eq("id", id)
    .single()

  if (clientError || !client) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // ALL leads for this client across ALL executives — no RLS filter
  const { data: leads } = await admin
    .from("meta_leads")
    .select(`
      id, campaign_name, source, status, received_at, assigned_at,
      assigned_to_profile:user_profiles!assigned_to(id, full_name),
      assigned_by_profile:user_profiles!assigned_by(id, full_name),
      crm:lead_crm_details(
        call_status, site_visit_status, buying_status,
        budget_range, configuration, hwc, follow_up_date,
        first_call_date, last_call_date, remarks, updated_at
      )
    `)
    .eq("client_id", id)
    .order("received_at", { ascending: false })

  return NextResponse.json({ client, leads: leads ?? [] })
}
