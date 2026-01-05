import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();
    console.log("1. Sending to n8n:", body);

    // FIX: Changed 'webhook-test' to 'webhook' (Production URL)
    const response = await fetch("https://n8n.theprotoforge.com/webhook/dj-reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    console.log("2. n8n Status:", response.status);

    if (!response.ok) {
        // This catches 404s (workflow inactive) or 500s (server crash)
        const text = await response.text();
        console.error("n8n Error Body:", text);
        return NextResponse.json({ success: false, error: `DJ Bot Offline (${response.status})` }, { status: 500 });
    }

    // If we get here, n8n ran successfully.
    // If 'data.error' is empty, your frontend shows "Safety Filter Triggered"
    const data = await response.json();
    console.log("3. n8n Response Data:", data);

    return NextResponse.json(data);

  } catch (error) {
    console.error("Proxy Error:", error);
    return NextResponse.json({ success: false, error: "Failed to connect to DJ Bot" }, { status: 500 });
  }
}