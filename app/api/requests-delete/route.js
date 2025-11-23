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

// ---------- POST - Delete Request ----------
export async function POST(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Supabase admin not initialized" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing request ID" },
        { status: 400 }
      );
    }

    // Delete the request from the database
    const { error } = await supabaseAdmin
      .from("requests")
      .delete()
      .eq("id", id);

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