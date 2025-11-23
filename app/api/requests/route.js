export async function GET(req) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Supabase admin not initialized" },
        { status: 500 }
      );
    }

    // Read ?dj_id=xxx from URL
    const { searchParams } = new URL(req.url);
    const dj_id = searchParams.get("dj_id");

    if (!dj_id) {
      return NextResponse.json({ error: "Missing dj_id" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("requests")
      .select("*")
      .eq("dj_id", dj_id)
      .order("requestedAt", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ requests: data || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
