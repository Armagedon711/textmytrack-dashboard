import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Your n8n URL
const N8N_BROADCAST_URL = "https://n8n.theprotoforge.com/webhook/broadcast-links"; 

// UPDATED DOMAIN
const BASE_URL = "https://dashboard.textmytrack.com"; 

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper to generate random 6-char slug
const generateSlug = () => Math.random().toString(36).substring(2, 8);

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
      .gte('requestedAt', yesterday); // Using requestedAt as per your DB schema

    if (!recentRequests?.length) {
        return NextResponse.json({ success: true, count: 0, message: "No listeners found" });
    }

    const uniqueNumbers = [...new Set(recentRequests.map(r => r.requestedBy).filter(n => n && n.length > 5))];

    // 3. GENERATE SHORT LINKS
    const shortLinksToInsert = [];
    const broadcastPayload = [];

    uniqueNumbers.forEach(phone => {
        let tipShortUrl = null;
        let reviewShortUrl = null;

        // Generate Tip Link (if DJ has one)
        if (dj.tip_link) {
            const slug = generateSlug(); 
            tipShortUrl = `${BASE_URL}/s/${slug}`;
            
            shortLinksToInsert.push({
                slug: slug,
                dj_id: dj_id,
                phone_number: phone,
                link_type: 'tip',
                final_url: dj.tip_link
            });
        }

        // Generate Review Link (if DJ has one)
        if (dj.review_link) {
            const slug = generateSlug(); 
            reviewShortUrl = `${BASE_URL}/s/${slug}`;

            shortLinksToInsert.push({
                slug: slug,
                dj_id: dj_id,
                phone_number: phone,
                link_type: 'review',
                final_url: dj.review_link
            });
        }

        // Build the SMS Message
        const message = `Thanks for partying with ${dj.tag || "us"}! 🎵\n\n` + 
                        (tipShortUrl ? `Tip the DJ: ${tipShortUrl}\n` : "") + 
                        (reviewShortUrl ? `Rate the night: ${reviewShortUrl}` : "");

        broadcastPayload.push({
            to: phone,
            from: dj.twilio_number,
            message: message
        });
    });

    // 4. Batch Insert Short Links to DB
    if (shortLinksToInsert.length > 0) {
        const { error } = await supabase.from('short_links').insert(shortLinksToInsert);
        if (error) {
            console.error("Failed to save short links:", error);
            // If DB save fails, we return error so we don't send broken links
            return NextResponse.json({ success: false, error: "Database save failed" });
        }
    }

    // 5. Send to n8n
    if (broadcastPayload.length > 0) {
        await fetch(N8N_BROADCAST_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ broadcasts: broadcastPayload })
        });
    }

    return NextResponse.json({ success: true, count: uniqueNumbers.length });

  } catch (error) {
    console.error("Broadcast Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}