import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// POST — super admin assigns many leads to one executive at once
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

  const lead_ids = Array.isArray(body.lead_ids)
    ? body.lead_ids.filter((x): x is string => typeof x === "string")
    : []
  const assigned_to = typeof body.assigned_to === "string" ? body.assigned_to.trim() : ""

  if (lead_ids.length === 0)
    return NextResponse.json({ error: "lead_ids is required" }, { status: 400 })
  if (!assigned_to)
    return NextResponse.json({ error: "assigned_to is required" }, { status: 400 })

  // Validate target is a sales executive
  const { data: executive } = await supabase
    .from("user_profiles").select("id").eq("id", assigned_to).eq("role", "sales_executive").maybeSingle()
  if (!executive)
    return NextResponse.json({ error: "Leads can only be assigned to a sales executive" }, { status: 400 })

  // Capture prior owners for history
  const { data: priors } = await supabase
    .from("meta_leads").select("id, assigned_to").in("id", lead_ids)

  const { data, error } = await supabase
    .from("meta_leads")
    .update({
      assigned_to,
      assigned_by: user.id,
      assigned_at: new Date().toISOString(),
      status: "assigned",
    })
    .in("id", lead_ids)
    .select("id")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const historyRows = (priors ?? []).map(p => ({
    lead_id:   p.id,
    from_user: p.assigned_to ?? null,
    to_user:   assigned_to,
    reason:    "bulk" as const,
  }))
  if (historyRows.length > 0) {
    await supabase.from("lead_assignment_history").insert(historyRows)
  }

  return NextResponse.json({ assigned: data?.length ?? 0 })
}
