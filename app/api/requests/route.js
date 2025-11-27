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

// ---------- GET ----------
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
      .order("requestedAt", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ requests: data || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ---------- POST ----------
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
      // New multi-platform fields
      platform,
      youtube_url,
      youtube_video_id,
      spotify_url,
      apple_url,
      soundcloud_url,
    } = body;

    if (!title || !artist || !requestedBy || !requestedAt || !dj_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const explicitValue =
      explicit === "Explicit" ||
      explicit === "Clean" ||
      explicit === "Undetermined"
        ? explicit
        : "Undetermined";

    // Extract YouTube video ID from URL if not provided
    let videoId = youtube_video_id || null;
    const ytUrl = youtube_url || url;
    if (!videoId && ytUrl) {
      // Extract from various YouTube URL formats
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

    const { error } = await supabaseAdmin.from("requests").insert({
      title,
      artist,
      genre: genre || null,
      mood: mood || null,
      energy: energy || null,
      explicit: explicitValue,
      url: url || youtube_url || null, // Keep legacy url field populated
      thumbnail: thumbnail || null,
      requestedBy,
      requestedAt,
      status: "pending",
      dj_id,
      // New multi-platform fields
      platform: platform || "YouTube",
      youtube_url: youtube_url || url || null,
      youtube_video_id: videoId,
      spotify_url: spotify_url || null,
      apple_url: apple_url || null,
      soundcloud_url: soundcloud_url || null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}