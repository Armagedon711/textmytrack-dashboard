import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Your n8n URL
const N8N_BROADCAST_URL = "https://n8n.theprotoforge.com/webhook/broadcast-links"; 
const BASE_URL = "https://textmytrack-dashboard.vercel.app"; // Change to your real domain

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { dj_id } = await req.json();

    // 1. Get DJ Data
    const { data: dj } = await supabase
      .from('dj_profiles')
      .select('tip_link, review_link, tag, twilio_number') 
      .eq('id', dj_id)
      .single();

    if (!dj) return NextResponse.json({ success: false, error: "DJ not found" });

    // 2. Find Recent Listeners
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentRequests } = await supabase
      .from('requests')
      .select('requestedBy')
      .eq('dj_id', dj_id)
      .gte('requestedAt', yesterday);

    if (!recentRequests?.length) {
        return NextResponse.json({ success: true, count: 0, message: "No listeners found" });
    }

    // Filter unique numbers
    const uniqueNumbers = [...new Set(recentRequests.map(r => r.requestedBy).filter(n => n && n.length > 5))];

    // 3. BUILD UNIQUE MESSAGES
    // We create a custom payload for EACH user containing their specific tracking link
    const broadcastPayload = uniqueNumbers.map(number => {
        // Encode phone number to be URL-safe
        const encodedPhone = encodeURIComponent(number);
        
        // Create the tracking links
        // e.g. textmytrack.com/click?dj=123&t=tip&u=+1555...
        const tipLink = dj.tip_link ? `${BASE_URL}/click?dj=${dj_id}&t=tip&u=${encodedPhone}` : null;
        const reviewLink = dj.review_link ? `${BASE_URL}/click?dj=${dj_id}&t=review&u=${encodedPhone}` : null;

        const message = `Thanks for partying with ${dj.tag || "us"}! 🎵\n\n` + 
                        (tipLink ? `Support the DJ: ${tipLink}\n` : "") + 
                        (reviewLink ? `Leave a review: ${reviewLink}` : "");

        return {
            to: number,
            from: dj.twilio_number,
            message: message
        };
    });

    console.log(`Generated ${broadcastPayload.length} unique messages.`);

    // 4. Send the Array to n8n
    if (broadcastPayload.length > 0) {
        await fetch(N8N_BROADCAST_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            // We send the 'broadcasts' array directly
            body: JSON.stringify({ broadcasts: broadcastPayload })
        });
    }

    return NextResponse.json({ success: true, count: uniqueNumbers.length });

  } catch (error) {
    console.error("Broadcast Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}