export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET: Fetch all banned numbers for a DJ
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const dj_id = searchParams.get("dj_id");

  if (!dj_id) return NextResponse.json({ error: "Missing DJ ID" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("blacklisted_users")
    .select("*")
    .eq("dj_id", dj_id)
    .order("added_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ blacklist: data });
}

// POST: Ban a number
export async function POST(req) {
  const { dj_id, phone_number } = await req.json();

  if (!dj_id || !phone_number) return NextResponse.json({ error: "Missing data" }, { status: 400 });

  // 1. Add to blacklist
  const { error } = await supabaseAdmin
    .from("blacklisted_users")
    .insert({ dj_id, phone_number });

  if (error) {
    // Ignore duplicate errors (already banned)
    if (error.code === '23505') return NextResponse.json({ success: true });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 2. OPTIONAL: Auto-reject all pending requests from this number
  await supabaseAdmin
    .from("requests")
    .update({ status: 'rejected' })
    .eq("dj_id", dj_id)
    .eq("requestedBy", phone_number)
    .eq("status", "pending");

  return NextResponse.json({ success: true });
}

// DELETE: Unban a number
export async function DELETE(req) {
  const { dj_id, phone_number } = await req.json();

  const { error } = await supabaseAdmin
    .from("blacklisted_users")
    .delete()
    .eq("dj_id", dj_id)
    .eq("phone_number", phone_number);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}