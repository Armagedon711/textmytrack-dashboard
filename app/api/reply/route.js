import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();
    
    // 1. FIXED: Removed '-test' from the URL to use the Production Webhook
    const response = await fetch("https://n8n.theprotoforge.com/webhook/dj-reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
        const text = await response.text();
        console.error("n8n Error Body:", text);
        return NextResponse.json({ success: false, error: `DJ Bot Offline (${response.status})` }, { status: 500 });
    }

    let data = await response.json();

    // 2. FIXED: Handle n8n's Array response format (Safety Net)
    // If n8n returns [{ "success": true }], we extract the first item.
    if (Array.isArray(data)) {
        data = data[0];
    }

    // 3. Debugging: Log what we are actually sending back to the frontend
    console.log("3. Final Response Data:", data);

    return NextResponse.json(data);

  } catch (error) {
    console.error("Proxy Error:", error);
    return NextResponse.json({ success: false, error: "Failed to connect to DJ Bot" }, { status: 500 });
  }
}