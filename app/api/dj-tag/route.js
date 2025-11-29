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

// ---------- POST - Update DJ Tag ----------
export async function POST(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Supabase admin not initialized" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { dj_id, tag } = body;

    if (!dj_id) {
      return NextResponse.json(
        { error: "Missing DJ ID" },
        { status: 400 }
      );
    }

    if (!tag || typeof tag !== 'string') {
      return NextResponse.json(
        { error: "Tag is required" },
        { status: 400 }
      );
    }

    // Clean and validate tag
    const cleanedTag = tag.trim();
    
    // Validation: 2-30 characters, alphanumeric and spaces only
    const tagRegex = /^[a-zA-Z0-9\s]{2,30}$/;
    if (!tagRegex.test(cleanedTag)) {
      return NextResponse.json(
        { error: "Tag must be 2-30 characters, letters, numbers, and spaces only" },
        { status: 400 }
      );
    }

    // Check if tag is already in use by another DJ (case-insensitive)
    const { data: existingTag, error: checkError } = await supabaseAdmin
      .from("dj_profiles")
      .select("id, tag")
      .ilike("tag", cleanedTag)
      .neq("id", dj_id)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking tag uniqueness:", checkError);
      return NextResponse.json(
        { error: "Error checking tag availability" },
        { status: 500 }
      );
    }

    if (existingTag) {
      return NextResponse.json(
        { error: "This tag is already in use by another DJ. Please choose a different tag." },
        { status: 409 }
      );
    }

    // Update the DJ's tag
    const { data, error: updateError } = await supabaseAdmin
      .from("dj_profiles")
      .update({ tag: cleanedTag })
      .eq("id", dj_id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating tag:", updateError);
      return NextResponse.json(
        { error: "Failed to update tag", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Tag updated successfully",
      tag: data.tag
    });

  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}

// ---------- GET - Check Tag Availability ----------
export async function GET(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Supabase admin not initialized" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tag = searchParams.get("tag");
    const excludeDjId = searchParams.get("exclude_dj_id");

    if (!tag) {
      return NextResponse.json(
        { error: "Missing tag parameter" },
        { status: 400 }
      );
    }

    // Check if tag exists (case-insensitive)
    let query = supabaseAdmin
      .from("dj_profiles")
      .select("id")
      .ilike("tag", tag.trim());

    if (excludeDjId) {
      query = query.neq("id", excludeDjId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error("Error checking tag:", error);
      return NextResponse.json(
        { error: "Error checking tag" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      available: !data,
      tag: tag.trim()
    });

  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}