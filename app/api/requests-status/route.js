import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { id, status } = await request.json();

    if (!id || !status) {
      return NextResponse.json(
        { error: "Missing id or status" },
        { status: 400 }
      );
    }

    // Valid statuses
    const validStatuses = ["pending", "approved", "played", "rejected"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be: pending, approved, played, or rejected" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("requests")
      .update({ status: status })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating status:", error);
      return NextResponse.json(
        { error: "Failed to update status", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Request marked as ${status}`,
      request: data,
    });
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}