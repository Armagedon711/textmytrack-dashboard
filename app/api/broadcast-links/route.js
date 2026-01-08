import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// FIX: Hardcode the correct base URL structure or use a dedicated ENV variable
// Ideally, set N8N_BROADCAST_URL in your .env.local to the exact URL from the n8n node.
// For now, this fallback covers the standard path:
const N8N_BROADCAST_URL = process.env.N8N_BROADCAST_URL || "https://n8n.theprotoforge.com/webhook/broadcast-links"; 

export async function POST(req) {
  try {
    const { dj_id } = await req.json();

    // 1. Get DJ's Links AND Phone Number
    const { data: dj } = await supabase
      .from('dj_profiles')
      .select('tip_link, review_link, tag, twilio_number') 
      .eq('id', dj_id)
      .single();

    // Debug Log
    console.log("Checking Links for DJ:", dj_id, dj);

    if (!dj || (!dj.tip_link && !dj.review_link)) {
        console.log("No links found, aborting broadcast.");
        return NextResponse.json({ success: false, message: "No links found" });
    }

    // 2. Find Unique Requesters from last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: messages } = await supabase
      .from('messages')
      .select('sender_number')
      .eq('dj_id', dj_id)
      .gte('created_at', yesterday);

    if (!messages || messages.length === 0) {
        return NextResponse.json({ success: true, count: 0 });
    }

    const uniqueNumbers = [...new Set(messages.map(m => m.sender_number))];
    console.log(`Broadcasting to ${uniqueNumbers.length} numbers via: ${N8N_BROADCAST_URL}`);

    // 3. Send to n8n
    const response = await fetch(N8N_BROADCAST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            numbers: uniqueNumbers,
            from: dj.twilio_number, 
            message: `Thanks for partying with ${dj.tag || "us"}! 🎵\n\n` + 
                     (dj.tip_link ? `Support the DJ: ${dj.tip_link}\n` : "") + 
                     (dj.review_link ? `Leave a review: ${dj.review_link}` : "")
        })
    });

    if (!response.ok) {
        console.error("n8n Error:", await response.text());
    }

    return NextResponse.json({ success: true, count: uniqueNumbers.length });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}