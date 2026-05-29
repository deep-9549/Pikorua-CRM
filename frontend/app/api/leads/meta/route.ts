import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

function optionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

// POST - super admin manually adds a lead
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase
    .from("user_profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "super_admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  let body: Record<string, unknown>
  try {
    body = await request.json() as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const full_name = optionalText(body.full_name)
  const phone = optionalText(body.phone)
  const email = optionalText(body.email)
  const city = optionalText(body.city)
  const campaign_name = optionalText(body.campaign_name)
  const notes = optionalText(body.notes)

  if (!full_name || !phone)
    return NextResponse.json({ error: "full_name and phone are required" }, { status: 400 })

  const { data, error } = await supabase
    .from("meta_leads")
    .insert({
      full_name,
      phone,
      email,
      city,
      campaign_name,
      form_data:     notes ? { notes } : null,
      source:        "manual",
      status:        "unassigned",
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ lead: data }, { status: 201 })
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get the user's role
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") // "unassigned" | "assigned" | null (all)

  let query = supabase
    .from("meta_leads")
    .select(`
      id, form_id, ad_id, campaign_name, full_name, phone, email, city,
      source, status, received_at, assigned_at, client_id,
      assigned_to_profile:user_profiles!assigned_to(id, full_name, role),
      assigned_by_profile:user_profiles!assigned_by(id, full_name),
      crm:lead_crm_details(call_status, hwc, follow_up_date, buying_status, site_visit_status, budget_range)
    `)
    .order("received_at", { ascending: false })

  if (status) {
    query = query.eq("status", status)
  }

  // Sales executives only see their own assigned leads
  if (profile?.role === "sales_executive") {
    query = query.eq("assigned_to", user.id)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ leads: data })
}
