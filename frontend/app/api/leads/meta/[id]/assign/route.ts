import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Only super_admin can assign leads
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json() as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const assigned_to = typeof body.assigned_to === "string" ? body.assigned_to.trim() : ""

  if (!assigned_to) {
    return NextResponse.json({ error: "assigned_to is required" }, { status: 400 })
  }

  const { data: executive, error: executiveError } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("id", assigned_to)
    .eq("role", "sales_executive")
    .maybeSingle()

  if (executiveError) {
    return NextResponse.json({ error: executiveError.message }, { status: 500 })
  }

  if (!executive) {
    return NextResponse.json({ error: "Lead can only be assigned to a sales executive" }, { status: 400 })
  }

  // Capture prior owner for the history log
  const { data: prior } = await supabase
    .from("meta_leads").select("assigned_to").eq("id", id).single()

  const { data, error } = await supabase
    .from("meta_leads")
    .update({
      assigned_to,
      assigned_by: user.id,
      assigned_at: new Date().toISOString(),
      status: "assigned",
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabase.from("lead_assignment_history").insert({
    lead_id:   id,
    from_user: prior?.assigned_to ?? null,
    to_user:   assigned_to,
    reason:    "manual",
  })

  return NextResponse.json({ lead: data })
}
