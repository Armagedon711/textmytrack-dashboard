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

export async function POST(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Supabase admin not initialized" },
        { status: 500 }
      );
    }

    const body = await request.json();

    const {
      title,
      artist,
      genre,
      mood,
      energy,
      explicit,
      requestedBy,
      requestedAt,
      url,
      thumbnail,
      dj_id,
      platform,
      youtube_url,
      youtube_video_id,
      spotify_url,
      apple_url,
      soundcloud_url,
      // NEW FIELDS FROM N8N
      message_body,
      sender_number,
      reply_body
    } = body;

    if (!title || !artist || !requestedBy || !requestedAt || !dj_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 1. INSERT THE SONG REQUEST
    const explicitValue =
      explicit === "Explicit" || explicit === "Clean" ? explicit : "Undetermined";

    let videoId = youtube_video_id || null;
    // ... (Keep existing video ID extraction logic here) ...

    const { error } = await supabaseAdmin.from("requests").insert({
      title,
      artist,
      genre: genre || null,
      mood: mood || null,
      energy: energy || null,
      explicit: explicitValue,
      url: url || youtube_url || null,
      thumbnail: thumbnail || null,
      requestedBy,
      requestedAt,
      status: "pending",
      dj_id,
      platform: platform || "YouTube",
      youtube_url: youtube_url || url || null,
      youtube_video_id: videoId,
      spotify_url: spotify_url || null,
      apple_url: apple_url || null,
      soundcloud_url: soundcloud_url || null,
    });

    if (error) {
      console.error("Error inserting request:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 2. INSERT THE CHAT MESSAGE (NEW)
    if (message_body && sender_number) {
        const { error: msgError } = await supabaseAdmin.from("messages").insert({
            dj_id,
            sender_number,
            message_body,
            reply_body: reply_body || null,
            status: 'replied'
        });
        
        if (msgError) {
            console.error("Error logging chat message:", msgError.message);
            // We don't return an error here so the main song request still succeeds
        } else {
            console.log("Chat log saved successfully");
        }
    }
    
    console.log(`Successfully inserted new request for DJ: ${dj_id}`);
    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Error in request POST endpoint:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}