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
export async function GET(request, context) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Supabase admin not initialized" },
        { status: 500 }
      );
    }

    // Handle params - works with both older and newer Next.js versions
    const params = context?.params;
    
    // In Next.js 15+, params might be a Promise
    const resolvedParams = params?.then ? await params : params;
    
    let phone = resolvedParams?.phone;

    // Debug logging - check your Vercel logs
    console.log("DJ Settings Request - Raw params:", params);
    console.log("DJ Settings Request - Resolved phone:", phone);

    // If params didn't work, extract from URL path
    if (!phone) {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      // URL structure: /api/dj/[phone]/settings
      // Find 'dj' and get the next segment
      const djIndex = pathParts.findIndex(part => part === 'dj');
      if (djIndex !== -1 && pathParts[djIndex + 1] && pathParts[djIndex + 1] !== 'settings') {
        phone = decodeURIComponent(pathParts[djIndex + 1]);
      }
      
      console.log("DJ Settings Request - Phone from path:", phone);
    }

    if (!phone) {
      return NextResponse.json(
        { error: "Missing phone number", debug: "Could not extract phone from params or URL" },
        { status: 400 }
      );
    }

    // Decode the phone number (handles %2B -> +)
    const decodedPhone = decodeURIComponent(phone);
    
    return await getDjSettings(decodedPhone);

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

async function getDjSettings(cleanPhone) {
  // Try multiple phone formats to find the DJ
  const phoneVariants = [
    cleanPhone,                                      // As provided (+18557105533)
    cleanPhone.replace(/\D/g, ''),                  // Digits only (18557105533)
    '+' + cleanPhone.replace(/\D/g, ''),            // +digits (+18557105533)
    '+1' + cleanPhone.replace(/\D/g, '').slice(-10), // +1 + last 10 digits
    cleanPhone.replace(/\D/g, '').slice(-10),       // Last 10 digits only
  ];

  console.log("DJ Settings - Trying phone variants:", phoneVariants);

  let djProfile = null;

  for (const phoneVariant of phoneVariants) {
    if (!phoneVariant) continue;
    
    const { data, error } = await supabaseAdmin
      .from("dj_profiles")
      .select("id, preferred_platform, twilio_number")
      .eq("twilio_number", phoneVariant)
      .maybeSingle();

    if (data) {
      djProfile = data;
      console.log("DJ Settings - Found DJ with variant:", phoneVariant);
      break;
    }
  }

  if (!djProfile) {
    // Return defaults if DJ not found - workflow will still work
    console.log("DJ Settings - No DJ found, returning defaults");
    return NextResponse.json({
      dj_id: null,
      preferred_platform: "youtube",
      note: "DJ profile not found for this number, using defaults"
    });
  }

  return NextResponse.json({
    dj_id: djProfile.id,
    preferred_platform: djProfile.preferred_platform || "youtube",
    twilio_number: djProfile.twilio_number
  });
}