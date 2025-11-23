export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ---------- ADMIN CLIENT ----------
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

// ---------- GET ----------
export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Supabase admin not initialized" },
        { status: 500 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("requests")
      .select("*")
      .order("requestedAt", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ requests: data || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ---------- POST ----------
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
      explicit,        // <-- NOW A STRING ("Explicit" | "Clean" | "Undetermined")
      requestedBy,
      requestedAt,
      dj_id,
    } = body;

    // Validate required fields
    if (!title || !artist || !requestedBy || !requestedAt || !dj_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Normalize explicit field to always be a string
    const explicitValue =
      explicit === "Explicit" ||
      explicit === "Clean" ||
      explicit === "Undetermined"
        ? explicit
        : "Undetermined";

    // Insert record
    const { error } = await supabaseAdmin.from("requests").insert({
      title,
      artist,
      genre: genre || null,
      mood: mood || null,
      energy: energy || null,
      explicit: explicitValue,      // <-- stored as STRING
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
