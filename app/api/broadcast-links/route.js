import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Auto-switch n8n URL based on environment (Dev vs Prod)
const N8N_BROADCAST_URL = process.env.N8N_BROADCAST_URL || 
  (process.env.N8N_WEBHOOK_URL ? process.env.N8N_WEBHOOK_URL.replace('dj-reply', 'broadcast-links') : "https://n8n.theprotoforge.com/webhook-test/broadcast-links");

export async function POST(req) {
  try {
    const { dj_id } = await req.json();

    // 1. Get DJ's Links & Phone Number
    const { data: dj } = await supabase
      .from('dj_profiles')
      .select('tip_link, review_link, tag, twilio_number') 
      .eq('id', dj_id)
      .single();

    if (!dj || (!dj.tip_link && !dj.review_link)) {
        return NextResponse.json({ success: false, message: "No links found" });
    }

    // 2. Find Unique Requesters from last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    // --- FIX: Query 'requests' table instead of 'messages' ---
    const { data: recentRequests, error } = await supabase
      .from('requests')
      .select('requestedBy') // This column stores the phone number in your requests table
      .eq('dj_id', dj_id)
      .gte('created_at', yesterday);

    if (error) {
        console.error("Database Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!recentRequests || recentRequests.length === 0) {
        console.log("No recent requests found.");
        return NextResponse.json({ success: true, count: 0 });
    }

    // 3. Extract unique phone numbers
    // Filter out nulls and duplicates
    const uniqueNumbers = [...new Set(
        recentRequests
          .map(r => r.requestedBy)
          .filter(num => num) 
    )];

    console.log(`Broadcasting to ${uniqueNumbers.length} numbers via: ${N8N_BROADCAST_URL}`);

    // 4. Send to n8n
    if (uniqueNumbers.length > 0) {
        await fetch(N8N_BROADCAST_URL, {
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
    }

    return NextResponse.json({ success: true, count: uniqueNumbers.length });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}