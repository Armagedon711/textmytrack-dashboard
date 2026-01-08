import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = 'edge'; // Optional: Makes it faster

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const dj_id = searchParams.get("dj");
  const type = searchParams.get("t"); // 'tip' or 'review'
  const phone = searchParams.get("u"); // The user's phone number

  if (!dj_id || !type) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  try {
    // 1. Get the real destination URL from the DJ Profile
    const { data: dj } = await supabase
      .from("dj_profiles")
      .select("tip_link, review_link")
      .eq("id", dj_id)
      .single();

    if (!dj) throw new Error("DJ not found");

    const destination = type === "tip" ? dj.tip_link : dj.review_link;

    if (!destination) {
      // If they haven't set a link, just go to home page
      return NextResponse.redirect(new URL("/", request.url));
    }

    // 2. Log the Click (Fire and Forget - don't await if you want speed, but await ensures safety)
    await supabase.from("link_clicks").insert({
      dj_id: dj_id,
      phone_number: phone || "unknown",
      link_type: type,
      destination_url: destination
    });

    // 3. Redirect the user
    return NextResponse.redirect(destination);

  } catch (error) {
    console.error("Click Tracking Error:", error);
    return NextResponse.redirect(new URL("/", request.url));
  }
}