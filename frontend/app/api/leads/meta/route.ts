import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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
      status, received_at, assigned_at,
      assigned_to_profile:user_profiles!assigned_to(id, full_name, role),
      assigned_by_profile:user_profiles!assigned_by(id, full_name)
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
