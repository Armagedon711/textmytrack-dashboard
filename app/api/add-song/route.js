export const runtime = "nodejs";
// Ensure env vars are read at request time (not inlined at build)
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const N8N_MANUAL_ADD_URL = "https://n8n.theprotoforge.com/webhook/manual-add";

// Extract YouTube playlist ID from various URL formats
function getYoutubePlaylistId(input) {
  const trimmed = (input || "").trim();
  // https://www.youtube.com/playlist?list=PLxxx
  let m = trimmed.match(/[?&]list=([^&]+)/);
  if (m) return m[1];
  // youtube.com/playlist?list=PLxxx
  m = trimmed.match(/youtube\.com\/playlist\?list=([^&\s]+)/);
  if (m) return m[1];
  return null;
}

// Fetch all playlist item snippets (paginated, max 100 items)
async function fetchYoutubePlaylistItems(playlistId, apiKey) {
  const items = [];
  let pageToken = null;
  const maxPages = 2; // 50 * 2 = 100 items max
  let pages = 0;

  while (pages < maxPages) {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("playlistId", playlistId);
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("key", apiKey);
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString());
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`YouTube API: ${res.status} ${err}`);
    }
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || "YouTube API error");

    const list = data.items || [];
    for (const item of list) {
      const vid = item.snippet?.resourceId?.videoId;
      if (vid && item.snippet?.resourceId?.kind === "youtube#video") {
        items.push({
          title: item.snippet.title || "Unknown",
          artist: item.snippet.videoOwnerChannelTitle || item.snippet.channelTitle || "YouTube",
          youtube_video_id: vid,
          thumbnail:
            item.snippet.thumbnails?.maxres?.url ||
            item.snippet.thumbnails?.high?.url ||
            item.snippet.thumbnails?.medium?.url ||
            item.snippet.thumbnails?.default?.url ||
            null,
        });
      }
    }
    pageToken = data.nextPageToken || null;
    pages++;
    if (!pageToken) break;
  }
  return items;
}

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

export async function POST(req) {
  try {
    const body = await req.json();
    const { query, dj_id } = body || {};
    if (!query || !dj_id) {
      return NextResponse.json(
        { error: "Missing query or dj_id" },
        { status: 400 }
      );
    }

    const playlistId = getYoutubePlaylistId(query);

    // --- Playlist: fetch from YouTube and insert each track ---
    if (playlistId) {
      const raw =
        process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY || "";
      const apiKey = typeof raw === "string" ? raw.trim() : "";
      if (!apiKey || apiKey === "your_youtube_api_key_here") {
        return NextResponse.json(
          {
            error:
              "Playlist import needs YOUTUBE_API_KEY in Vercel. Add it under Project → Settings → Environment Variables (exact name: YOUTUBE_API_KEY), then redeploy.",
          },
          { status: 503 }
        );
      }
      if (!supabaseAdmin) {
        return NextResponse.json(
          { error: "Database not initialized" },
          { status: 500 }
        );
      }

      const tracks = await fetchYoutubePlaylistItems(playlistId, apiKey);
      if (tracks.length === 0) {
        return NextResponse.json(
          { error: "No videos found in this playlist or playlist is private." },
          { status: 400 }
        );
      }

      // Get current max position for this DJ
      const { data: existing } = await supabaseAdmin
        .from("requests")
        .select("position")
        .eq("dj_id", dj_id)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();
      const basePosition = (existing?.position ?? 0) + 1000;
      const now = new Date().toISOString();
      const requestedBy = "DJ Manual Add";

      const rows = tracks.map((t, i) => ({
        title: t.title,
        artist: t.artist,
        dj_id,
        status: "pending",
        requestedBy,
        requestedAt: now,
        youtube_video_id: t.youtube_video_id,
        youtube_url: `https://www.youtube.com/watch?v=${t.youtube_video_id}`,
        url: `https://www.youtube.com/watch?v=${t.youtube_video_id}`,
        thumbnail: t.thumbnail,
        platform: "YouTube",
        position: basePosition + i * 1000,
      }));

      const { error } = await supabaseAdmin.from("requests").insert(rows);
      if (error) {
        console.error("Playlist insert error:", error);
        return NextResponse.json(
          { error: error.message || "Failed to add playlist songs" },
          { status: 500 }
        );
      }
      return NextResponse.json({
        success: true,
        added: rows.length,
        mode: "playlist",
      });
    }

    // --- Single song: forward to n8n ---
    const n8nRes = await fetch(N8N_MANUAL_ADD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: query.trim(),
        dj_id,
        source: "dashboard",
      }),
    });
    if (!n8nRes.ok) {
      const text = await n8nRes.text();
      console.error("n8n manual-add failed:", text);
      return NextResponse.json(
        { error: "Failed to add song. Try again." },
        { status: 502 }
      );
    }
    return NextResponse.json({ success: true, mode: "single" });
  } catch (err) {
    console.error("add-song error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
