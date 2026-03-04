export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Supabase admin not initialized" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { id, dj_id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing request ID" },
        { status: 400 }
      );
    }
    if (!dj_id) {
      return NextResponse.json(
        { error: "Missing dj_id (unauthorized)" },
        { status: 401 }
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
      .delete()
      .eq("id", id)
      .eq("dj_id", dj_id);

    if (error) {
      console.error("Error deleting request:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Request deleted successfully" });
  } catch (err) {
    console.error("Error in delete endpoint:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
