import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Meta sends a GET to verify the webhook endpoint
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

// Meta sends a POST for each new lead form submission
export async function POST(request: NextRequest) {
  const body = await request.json()

  // Only handle leadgen events
  if (body.object !== "page") {
    return NextResponse.json({ ok: true })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const inserts: PromiseLike<unknown>[] = []

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "leadgen") continue

      const value = change.value
      // Flatten field_data array into a key→value object
      const fields: Record<string, string> = {}
      for (const f of value.field_data ?? []) {
        fields[f.name] = f.values?.[0] ?? ""
      }

      inserts.push(
        supabase.from("meta_leads").insert({
          form_id: value.form_id,
          ad_id: value.ad_id,
          campaign_name: value.campaign_name ?? null,
          full_name: fields["full_name"] ?? fields["name"] ?? null,
          phone: fields["phone_number"] ?? fields["phone"] ?? null,
          email: fields["email"] ?? null,
          city: fields["city"] ?? null,
          form_data: value,
          status: "unassigned",
        })
      )
    }
  }

  await Promise.all(inserts)

  return NextResponse.json({ ok: true })
}
