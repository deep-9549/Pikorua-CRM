import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// PUT /api/clients/[id]/status — update client status + note
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { status, status_note } = await req.json()

  const valid = ["hot","warm","cold","lost","low_budget","not_interested","broker","construction_biz_owner"]
  if (status && !valid.includes(status))
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })

  const { data, error } = await supabase
    .from("clients")
    .update({
      status:            status ?? null,
      status_note:       status_note ?? null,
      status_updated_by: user.id,
      status_updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ client: data })
}
