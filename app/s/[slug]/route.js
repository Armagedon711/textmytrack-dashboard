import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = 'edge'; 

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request, { params }) {
  // Await params for Next.js 15+ compatibility
  const resolvedParams = await params;
  const { slug } = resolvedParams;

  if (!slug) return NextResponse.redirect(new URL("/", request.url));

  try {
    // 1. Look up the Short Code
    const { data: link } = await supabase
      .from("short_links")
      .select("*")
      .eq("slug", slug)
      .single();

    if (!link) {
      console.error("Link not found for slug:", slug);
      return NextResponse.redirect(new URL("/", request.url));
    }

    // 2. Log the Click (Tracking)
    // FIX: We MUST await this, or the Edge function kills it before it saves.
    const { error: logError } = await supabase.from("link_clicks").insert({
      dj_id: link.dj_id,
      phone_number: link.phone_number,
      link_type: link.link_type,
      destination_url: link.final_url
    });

    if (logError) {
        console.error("Click logging failed:", logError);
    }

    // 3. Redirect to the Real URL
    return NextResponse.redirect(link.final_url);

  } catch (error) {
    console.error("Short Link Error:", error);
    return NextResponse.redirect(new URL("/", request.url));
  }
}