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

// ---------- GET (Fetch Requests) ----------
export async function GET(req) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Supabase admin not initialized" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const dj_id = searchParams.get("dj_id");

    if (!dj_id) {
      return NextResponse.json(
        { error: "Missing dj_id" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("requests")
      .select("*")
      .eq("dj_id", dj_id)
      .order("position", { ascending: true }); // Updated to sort by position

    if (error) {
      console.error("Supabase error fetching requests:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ requests: data || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ---------- POST (Insert New Request) ----------
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

    // 1. CALCULATE EXPLICIT VALUE
    const explicitValue =
      explicit === "Explicit" || explicit === "Clean" ? explicit : "Undetermined";

    // 2. EXTRACT YOUTUBE ID (Restored Logic)
    let videoId = youtube_video_id || null;
    const ytUrl = youtube_url || url;
    
    if (!videoId && ytUrl) {
      const patterns = [
        /youtu\.be\/([^?]+)/,
        /[?&]v=([^&]+)/,
        /shorts\/([^?]+)/,
        /embed\/([^?]+)/
      ];
      for (const pattern of patterns) {
        const match = ytUrl.match(pattern);
        if (match) {
          videoId = match[1];
          break;
        }
      }
    }

    // 3. INSERT THE SONG REQUEST
    // Get current max position to append to end of queue
    // (Optional optimization: default to large number, let DB handle it, or fetch max)
    // For now we use the default logic or just insert.
    
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
      // Default position logic handled by DB default (epoch) or we can leave it null for now
    });

    if (error) {
      console.error("Error inserting request:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 4. INSERT THE CHAT MESSAGE (NEW LOGIC)
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