import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .order("requestedAt", { ascending: false });

  if (error) {
    return Response.json({ error }, { status: 500 });
  }

  return Response.json({ requests: data });
}

export async function POST(request) {
  const body = await request.json();

  const newEntry = {
    id: body.id || Date.now().toString(),
    title: body.title,
    artist: body.artist,
    genre: body.genre,
    mood: body.mood,
    energy: body.energy,
    explicit: body.explicit,
    requestedBy: body.requestedBy,
    requestedAt: body.requestedAt || new Date().toISOString(),
    status: "pending",
  };

  const { error } = await supabase.from("requests").insert([newEntry]);

  if (error) {
    return Response.json({ error }, { status: 400 });
  }

  return Response.json({ success: true, newEntry });
}
