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
    const {
      dj_id,
      auto_delete_duplicates,
      duplicate_scope,
      auto_reject_explicit,
    } = body;
    if (!dj_id) {
      return NextResponse.json(
        { error: "Missing dj_id" },
        { status: 400 }
      );
    }

    const update = {};
    if (typeof auto_delete_duplicates === "boolean")
      update.auto_delete_duplicates = auto_delete_duplicates;
    if (["requests", "approved", "both"].includes(duplicate_scope))
      update.duplicate_scope = duplicate_scope;
    if (typeof auto_reject_explicit === "boolean")
      update.auto_reject_explicit = auto_reject_explicit;

    const { error } = await supabaseAdmin
      .from("dj_profiles")
      .update(update)
      .eq("id", dj_id);

    if (error) {
      console.error("dj-queue-settings update error:", error);
      return NextResponse.json(
        {
          error:
            error.message ||
            "Failed to save. Ensure dj_profiles has columns: auto_delete_duplicates, duplicate_scope, auto_reject_explicit.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("dj-queue-settings error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
