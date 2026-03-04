export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const validStatuses = ["pending", "approved", "played", "rejected"];

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
    const { id, status, dj_id } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: "Missing id or status" },
        { status: 400 }
      );
    }
    if (!dj_id) {
      return NextResponse.json(
        { error: "Missing dj_id (unauthorized)" },
        { status: 401 }
      );
    }
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    const { data: row, error: fetchError } = await supabaseAdmin
      .from("requests")
      .select("id, dj_id")
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !row) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    if (row.dj_id !== dj_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from("requests")
      .update({ status })
      .eq("id", id)
      .eq("dj_id", dj_id);

    if (error) {
      console.error("Error updating request:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}
