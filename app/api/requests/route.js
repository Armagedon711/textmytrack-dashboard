import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

// --- SAFE ADMIN CLIENT SETUP ---
let supabaseAdmin = null;

if (
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY
) {
  supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// GET — return only logged-in DJ’s requests
export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Supabase admin not initialized" },
        { status: 500 }
      );
    }

    const supabase = createRouteHandlerClient({ cookies: () => cookies() });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ requests: [] });
    }

    const { data, error } = await supabaseAdmin
      .from("requests")
      .select("*")
      .eq("dj_id", user.id)
      .order("requestedAt", { ascending: false });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ requests: data || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — TEMPORARY INSERT FROM n8n
export async function POST(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Supabase admin not initialized" },
        { status: 500 }
      );
    }

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
      dj_id,
    } = body;

    if (!title || !artist || !requestedBy || !requestedAt || !dj_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

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
      dj_id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
