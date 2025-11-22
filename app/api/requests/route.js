import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    requests: [
      {
        id: "1",
        title: "Yeah!",
        artist: "Usher ft. Lil Jon, Ludacris",
        genre: "R&B / Party",
        mood: "Hype",
        energy: "high",
        explicit: false,
        requestedBy: "+1 (502) 555-0142",
        requestedAt: "9:42 PM",
      },
      {
        id: "2",
        title: "Tennessee Whiskey",
        artist: "Chris Stapleton",
        genre: "Country",
        mood: "Slow",
        energy: "low",
        explicit: false,
        requestedBy: "+1 (812) 555-3311",
        requestedAt: "9:38 PM",
      },
    ],
  });
}
