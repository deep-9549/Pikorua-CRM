import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data, error } = await supabase
    .from("lead_crm_details")
    .select("*")
    .eq("meta_lead_id", id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ crm: data })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()

  // Upsert — insert on first save, update on subsequent saves
  const { data, error } = await supabase
    .from("lead_crm_details")
    .upsert(
      {
        meta_lead_id: id,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
        first_call_date: body.first_call_date ?? null,
        last_call_date: body.last_call_date ?? null,
        call_status: body.call_status ?? null,
        site_visit_status: body.site_visit_status ?? null,
        visit_date: body.visit_date ?? null,
        visit_confirmation_date: body.visit_confirmation_date ?? null,
        buying_status: body.buying_status ?? null,
        budget_range: body.budget_range ?? null,
        configuration: body.configuration ?? null,
        follow_up_date: body.follow_up_date ?? null,
        hwc: body.hwc ?? null,
        remarks: body.remarks ?? null,
      },
      { onConflict: "meta_lead_id" }
    )
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ crm: data })
}
