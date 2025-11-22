import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// GET — return only the logged-in DJ's requests
export async function GET(request) {
  const supabase = createRouteHandlerClient({ cookies });

  // Get the logged-in user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ requests: [] });
  }

  // Load only this DJ’s requests
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .eq("dj_id", user.id)
    .order("requestedAt", { ascending: false });

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ requests: data || [] });
}

// POST — insert a song request for the logged-in DJ
export async function POST(request) {
  const supabase = createRouteHandlerClient({ cookies });

  // Logged-in DJ
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Not logged in" },
      { status: 401 }
    );
  }

  // Parse request JSON
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
  } = body;

  // Basic validation
  if (!title || !artist || !requestedBy || !requestedAt) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Insert row tied to DJ ID
  const { error } = await supabase.from("requests").insert({
    title,
    artist,
    genre: genre || null,
    mood: mood || null,
    energy: energy || null,
    explicit: explicit ?? false,
    requestedBy,
    requestedAt,
    status: "pending",
    dj_id: user.id,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
