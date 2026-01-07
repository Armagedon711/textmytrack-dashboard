import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Init Supabase Admin
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// n8n Webhook to handle the actual SMS sending loop
const N8N_BROADCAST_URL = "https://n8n.theprotoforge.com/webhook/broadcast-links"; 

export async function POST(req) {
  try {
    const { dj_id } = await req.json();

    // 1. Get DJ's Links
    const { data: dj } = await supabase
      .from('dj_profiles')
      .select('tip_link, review_link, tag')
      .eq('id', dj_id)
      .single();

    if (!dj || (!dj.tip_link && !dj.review_link)) {
        return NextResponse.json({ success: false, message: "No links found" });
    }

    // 2. Find Unique Requesters from last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    // We get all messages sent to this DJ in the last 24h to find unique phone numbers
    const { data: messages } = await supabase
      .from('messages')
      .select('sender_number')
      .eq('dj_id', dj_id)
      .gte('created_at', yesterday);

    if (!messages || messages.length === 0) {
        return NextResponse.json({ success: true, count: 0 });
    }

    // Dedup phone numbers
    const uniqueNumbers = [...new Set(messages.map(m => m.sender_number))];

    // 3. Send to n8n for processing
    await fetch(N8N_BROADCAST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            numbers: uniqueNumbers,
            message: `Thanks for partying with ${dj.tag || "us"}! 🎵\n\n` + 
                     (dj.tip_link ? `Support the DJ: ${dj.tip_link}\n` : "") + 
                     (dj.review_link ? `Leave a review: ${dj.review_link}` : "")
        })
    });

    return NextResponse.json({ success: true, count: uniqueNumbers.length });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}