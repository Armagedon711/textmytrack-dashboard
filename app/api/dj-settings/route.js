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

export async function GET(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Supabase admin not initialized" },
        { status: 500 }
      );
    }

    // Get phone from query string
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");

    console.log("DJ Settings - Phone received:", phone);

    if (!phone) {
      return NextResponse.json(
        { error: "Missing phone parameter. Use: ?phone=+1234567890" },
        { status: 400 }
      );
    }

    // Try multiple phone formats
    const phoneVariants = [
      phone,
      phone.replace(/\D/g, ''),
      '+' + phone.replace(/\D/g, ''),
      '+1' + phone.replace(/\D/g, '').slice(-10),
      phone.replace(/\D/g, '').slice(-10),
    ];

    let djProfile = null;

    for (const variant of phoneVariants) {
      if (!variant) continue;
      
      const { data } = await supabaseAdmin
        .from("dj_profiles")
        .select("id, preferred_platform, twilio_number")
        .eq("twilio_number", variant)
        .maybeSingle();

      if (data) {
        djProfile = data;
        break;
      }
    }

    if (!djProfile) {
      return NextResponse.json({
        dj_id: null,
        preferred_platform: "youtube",
        note: "DJ not found, using defaults"
      });
    }

    return NextResponse.json({
      dj_id: djProfile.id,
      preferred_platform: djProfile.preferred_platform || "youtube",
      twilio_number: djProfile.twilio_number
    });

  } catch (err) {
    console.error("DJ Settings error:", err);
    return NextResponse.json(
      { error: err.message, dj_id: null, preferred_platform: "youtube" },
      { status: 500 }
    );
  }
}