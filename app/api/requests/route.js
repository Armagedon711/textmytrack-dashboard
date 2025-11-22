import { NextResponse } from "next/server";
import { requests } from "../requests/route";

// Update a request's status
export async function POST(req) {
  const body = await req.json();
  const { id, status } = body;

  if (!id || !status) {
    return NextResponse.json(
      { error: "Missing id or status" },
      { status: 400 }
    );
  }

  // Find the request entry
  const request = requests.find((r) => r.id === id);

  if (!request) {
    return NextResponse.json(
      { error: "Request not found" },
      { status: 404 }
    );
  }

  // Update the status
  request.status = status;

  return NextResponse.json({
    success: true,
    updated: request,
  });
}
