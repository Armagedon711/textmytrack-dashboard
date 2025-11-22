import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

// TEMP: allow n8n inserts using service role
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET — return only logged-in DJ’s requests
export async function GET(request) {
  const supabase = createRouteHandlerClient({ cookies });

  // Get logged-in user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ requests: [] });
  }

  // Load only this DJ's requests
  const { data, error } = await supabaseAdmin
    .from("requests")
    .select("*")
    .eq("dj_id", user.id)
    .order("requestedAt", { ascending: false });

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ requests: data || [] });
}

// POST — TEMPORARY INSERT FROM n8n (bypassing Twilio)
export async function POST(request) {
  const body = await request.json();

  const {
    title,
    artist,
    genre,
    mood,
    energy,
    explicit,
    requestedBy,
    requestedAt,
    dj_id   // <— manually provided from n8n for now
  } = body;

  // Validation checks
  if (!title || !artist || !requestedBy || !requestedAt || !dj_id) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Insert into Supabase tied to specific DJ
  const { error } = await supabaseAdmin.from("requests").insert({
    title,
    artist,
    genre: genre || null,
    mood: mood || null,
    energy: energy || null,
    explicit: explicit ?? false,
    requestedBy,
    requestedAt,
    status: "pending",
    dj_id
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
