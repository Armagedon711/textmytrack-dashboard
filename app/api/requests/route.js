let requests = []; // Temporary in-memory database

export async function GET() {
  return Response.json({ requests });
}

export async function POST(request) {
  const body = await request.json();

  if (!body.title) {
    return Response.json(
      { error: "Missing title" },
      { status: 400 }
    );
  }

  const newRequest = {
    id: Date.now().toString(),
    title: body.title,
    artist: body.artist || "Unknown",
    genre: body.genre || "Unknown",
    mood: body.mood || "Unknown",
    energy: body.energy || "medium",
    explicit: body.explicit || false,
    requestedBy: body.requestedBy || "Unknown",
    requestedAt: body.requestedAt || new Date().toLocaleTimeString(),
    status: "pending",
  };

  requests.unshift(newRequest);

  return Response.json({ success: true, newRequest });
}
