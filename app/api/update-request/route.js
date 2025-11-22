import { supabase } from "@/lib/supabase";

export async function POST(req) {
  const body = await req.json();
  const { id, status } = body;

  if (!id || !status) {
    return Response.json(
      { error: "Missing id or status" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("requests")
    .update({ status })
    .eq("id", id);

  if (error) {
    return Response.json({ error }, { status: 400 });
  }

  return Response.json({ success: true });
}
