import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();
    
    // Send the data to your n8n workflow
    const response = await fetch("https://n8n.theprotoforge.com/webhook/dj-reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    // Check if n8n returned an error (like 404 if not active)
    if (!response.ok) {
        console.error("n8n Workflow Error:", response.status, response.statusText);
        return NextResponse.json({ success: false, error: "DJ Bot is offline (Check n8n)" }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error("Proxy Error:", error);
    return NextResponse.json({ success: false, error: "Failed to connect to DJ Bot" }, { status: 500 });
  }
}