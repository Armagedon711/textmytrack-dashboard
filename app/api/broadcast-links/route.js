import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 1. PASTE YOUR COPIED N8N URL HERE (Keep the quotes!)
const N8N_BROADCAST_URL = "https://n8n.theprotoforge.com/webhook/broadcast-links"; 

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    console.log("🚀 Broadcast initiated...");
    const body = await req.json();
    const { dj_id } = body;

    // 2. Get DJ's Links & Phone Number
    const { data: dj, error: djError } = await supabase
      .from('dj_profiles')
      .select('tip_link, review_link, tag, twilio_number') 
      .eq('id', dj_id)
      .single();

    if (djError || !dj) {
        console.error("❌ DJ Not Found:", djError);
        return NextResponse.json({ success: false, error: "DJ not found" });
    }

    // 3. Find Unique Requesters from last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    // Query 'requests' table for 'requestedBy' column
    const { data: recentRequests, error: reqError } = await supabase
      .from('requests')
      .select('requestedBy')
      .eq('dj_id', dj_id)
      .gte('created_at', yesterday);

    if (reqError) {
        console.error("❌ Database Error:", reqError);
        return NextResponse.json({ error: reqError.message }, { status: 500 });
    }

    if (!recentRequests || recentRequests.length === 0) {
        console.log("⚠️ No recent requests found.");
        return NextResponse.json({ success: true, count: 0, message: "No recent listeners" });
    }

    // 4. Filter Unique Numbers
    const uniqueNumbers = [...new Set(
        recentRequests
          .map(r => r.requestedBy)
          .filter(num => num && num.length > 5) // Basic filter for valid-ish numbers
    )];

    console.log(`✅ found ${uniqueNumbers.length} unique numbers. Sending to n8n...`);

    // 5. Send to n8n
    const n8nResponse = await fetch(N8N_BROADCAST_URL, {
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

    if (!n8nResponse.ok) {
        const errorText = await n8nResponse.text();
        console.error("❌ n8n Error:", errorText);
        return NextResponse.json({ error: "n8n failed: " + errorText }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: uniqueNumbers.length });

  } catch (error) {
    console.error("❌ Critical Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}