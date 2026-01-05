import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();
    console.log("1. Sending to n8n:", body); // DEBUG LOG

    // Send the data to your n8n workflow
    const response = await fetch("https://n8n.theprotoforge.com/webhook/dj-reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    console.log("2. n8n Status:", response.status); // DEBUG LOG

    if (!response.ok) {
        const text = await response.text();
        console.error("n8n Error Body:", text);
        return NextResponse.json({ success: false, error: `DJ Bot Offline (${response.status})` }, { status: 500 });
    }

    const data = await response.json();
    console.log("3. n8n Response Data:", data); // DEBUG LOG

    return NextResponse.json(data);

  } catch (error) {
    console.error("Proxy Error:", error);
    return NextResponse.json({ success: false, error: "Failed to connect to DJ Bot" }, { status: 500 });
  }
}