import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// REPLACE THIS WITH YOUR COPIED N8N URL (Keep the quotes!)
const N8N_BROADCAST_URL = "https://n8n.theprotoforge.com/webhook/broadcast-links"; 

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const body = await req.json();
    const { dj_id } = body;

    console.log(`📡 Starting Broadcast for DJ: ${dj_id}`);

    // 1. Get DJ's Links & Phone Number
    const { data: dj, error: djError } = await supabase
      .from('dj_profiles')
      .select('tip_link, review_link, tag, twilio_number') 
      .eq('id', dj_id)
      .single();

    if (djError || !dj) {
        console.error("❌ DJ Not Found:", djError);
        return NextResponse.json({ success: false, error: "DJ not found" });
    }

    // 2. Calculate "Yesterday"
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    console.log(`🔍 Searching for requests after: ${yesterday}`);

    // 3. Find Unique Requesters
    // FIX: Changed 'created_at' to 'requestedAt' based on your CSV
    const { data: recentRequests, error: reqError } = await supabase
      .from('requests')
      .select('requestedBy')
      .eq('dj_id', dj_id)
      .gte('requestedAt', yesterday); 

    if (reqError) {
        console.error("❌ Database Error querying requests:", reqError);
        return NextResponse.json({ error: reqError.message }, { status: 500 });
    }

    console.log(`📄 Raw DB Result: Found ${recentRequests?.length || 0} rows.`);

    if (!recentRequests || recentRequests.length === 0) {
        return NextResponse.json({ success: true, count: 0, message: "No recent listeners found in time window." });
    }

    // 4. Filter Unique Numbers
    // We filter for valid length (>5) to skip empty strings or junk data
    const uniqueNumbers = [...new Set(
        recentRequests
          .map(r => r.requestedBy)
          .filter(num => num && num.length > 5) 
    )];

    console.log(`✅ Filtered to ${uniqueNumbers.length} unique numbers:`, uniqueNumbers);

    if (uniqueNumbers.length === 0) {
        return NextResponse.json({ success: true, count: 0, message: "No valid phone numbers found." });
    }

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
    console.error("❌ Critical API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}