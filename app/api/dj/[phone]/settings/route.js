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

// ---------- GET DJ Settings by Phone Number ----------
// Called by n8n workflow to get DJ's preferred platform
// URL: /api/dj/[phone]/settings
export async function GET(req, { params }) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Supabase admin not initialized" },
        { status: 500 }
      );
    }

    const { phone } = params;

    if (!phone) {
      return NextResponse.json(
        { error: "Missing phone number" },
        { status: 400 }
      );
    }

    // Clean the phone number - remove any URL encoding and non-digits except +
    let cleanPhone = decodeURIComponent(phone);
    
    // Try multiple formats to find the DJ
    const phoneVariants = [
      cleanPhone,                                    // As provided
      cleanPhone.replace(/\D/g, ''),                // Digits only
      '+' + cleanPhone.replace(/\D/g, ''),          // +digits
      '+1' + cleanPhone.replace(/\D/g, '').slice(-10), // +1 + last 10 digits
    ];

    let djProfile = null;

    for (const phoneVariant of phoneVariants) {
      const { data, error } = await supabaseAdmin
        .from("dj_profiles")
        .select("id, preferred_platform, twilio_number")
        .eq("twilio_number", phoneVariant)
        .maybeSingle();

      if (data) {
        djProfile = data;
        break;
      }
    }

    if (!djProfile) {
      // Return defaults if DJ not found - workflow will still work
      return NextResponse.json({
        dj_id: null,
        preferred_platform: "youtube",
        error: "DJ profile not found for this number"
      });
    }

    return NextResponse.json({
      dj_id: djProfile.id,
      preferred_platform: djProfile.preferred_platform || "youtube",
      twilio_number: djProfile.twilio_number
    });

  } catch (err) {
    console.error("Error fetching DJ settings:", err);
    return NextResponse.json(
      { 
        error: err.message,
        dj_id: null,
        preferred_platform: "youtube" 
      },
      { status: 500 }
    );
  }
}