export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Idempotent "mark as played": only transitions approved -> played for the given dj.
 * Safe to call multiple times (e.g. on double fire from player ended + error).
 */
export async function POST(req) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Supabase admin not initialized" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { id, dj_id } = body;

    if (!id || !dj_id) {
      return NextResponse.json(
        { error: "Missing id or dj_id" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("requests")
      .update({ status: "played" })
      .eq("id", id)
      .eq("dj_id", dj_id)
      .eq("status", "approved")
      .select("id, status")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated: !!data });
  } catch (err) {
    console.error("mark-played error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
