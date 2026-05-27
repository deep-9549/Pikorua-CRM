import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

function requiredText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function optionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

// GET — list all users (super_admin only)
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: me } = await supabase
    .from("user_profiles").select("role").eq("id", user.id).single()
  if (me?.role !== "super_admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, full_name, email, phone, role, created_at")
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ users: data })
}

// POST — create a new user (super_admin only)
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: me } = await supabase
    .from("user_profiles").select("role").eq("id", user.id).single()
  if (me?.role !== "super_admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  let body: Record<string, unknown>
  try {
    body = await req.json() as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const email = requiredText(body.email)
  const password = requiredText(body.password)
  const full_name = requiredText(body.full_name)
  const role = requiredText(body.role)
  const phone = optionalText(body.phone)

  if (!email || !password || !full_name || !role)
    return NextResponse.json({ error: "email, password, full_name and role are required" }, { status: 400 })

  if (!["super_admin", "sales_executive"].includes(role))
    return NextResponse.json({ error: "Invalid role" }, { status: 400 })

  if (password.length < 8)
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })

  // Use service-role client so we can call auth.admin.createUser
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  })

  if (createError) return NextResponse.json({ error: createError.message }, { status: 500 })

  // The trigger creates a profile; this fills optional data and the requested role.
  const { error: updateError } = await admin
    .from("user_profiles")
    .update({ role, full_name, email, phone })
    .eq("id", newUser.user.id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({
    user: { id: newUser.user.id, email, full_name, phone, role }
  }, { status: 201 })
}

// DELETE — remove a user (super_admin only, cannot delete yourself)
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: me } = await supabase
    .from("user_profiles").select("role").eq("id", user.id).single()
  if (me?.role !== "super_admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  let body: Record<string, unknown>
  try {
    body = await req.json() as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const userId = requiredText(body.userId)
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })
  if (userId === user.id) return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
