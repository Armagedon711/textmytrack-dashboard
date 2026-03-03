export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

export async function POST(req) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not initialized" },
        { status: 500 }
      );
    }
    const body = await req.json();
    const { dj_id, scope } = body;
    if (!dj_id) {
      return NextResponse.json(
        { error: "Missing dj_id" },
        { status: 400 }
      );
    }

    const statuses =
      scope === "requests"
        ? ["pending"]
        : scope === "approved"
        ? ["approved"]
        : ["pending", "approved"];

    const { data: rows, error: fetchError } = await supabaseAdmin
      .from("requests")
      .select("id, youtube_video_id, title, artist, position")
      .eq("dj_id", dj_id)
      .in("status", statuses)
      .order("position", { ascending: true });

    if (fetchError) {
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 }
      );
    }

    const key = (r) =>
      (r.youtube_video_id || "").trim() ||
      `${(r.title || "").trim()}|${(r.artist || "").trim()}`;
    const seen = new Set();
    const toDelete = [];
    for (const r of rows || []) {
      const k = key(r);
      if (!k) continue;
      if (seen.has(k)) toDelete.push(r.id);
      else seen.add(k);
    }

    if (toDelete.length === 0) {
      return NextResponse.json({ success: true, removed: 0 });
    }

    const { error: deleteError } = await supabaseAdmin
      .from("requests")
      .delete()
      .in("id", toDelete);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true, removed: toDelete.length });
  } catch (err) {
    console.error("dedup-requests error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
