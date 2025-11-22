"use client";

import { useEffect, useState } from "react";
import { supabaseBrowserClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const supabase = supabaseBrowserClient();
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState([]);

  // ───────────────────────────────────────────
  // STEP 5 — PROTECT ROUTE: Only logged-in DJs
  // ───────────────────────────────────────────
  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUser(user);
    }

    loadUser();
  }, []);

  // ───────────────────────────────────────────
  // LOAD DJ REQUESTS
  // ───────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    async function loadRequests() {
      const { data, error } = await supabase
        .from("requests")
        .select("*")
        .eq("dj_id", user.id)
        .order("requestedAt", { ascending: false });

      if (!error) setRequests(data || []);
    }

    loadRequests();

    // ───────────────────────────────────────────
    // REALTIME LISTENER FOR THIS DJ ONLY
    // ───────────────────────────────────────────
    const channel = supabase
      .channel(`requests:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "requests",
          filter: `dj_id=eq.${user.id}`,
        },
        (payload) => {
          setRequests((prev) => {
            const updated = [...prev];
            const newRow = payload.new;

            const index = updated.findIndex((r) => r.id === newRow.id);

            if (index === -1) {
              updated.unshift(newRow);
            } else {
              updated[index] = newRow;
            }

            return updated;
          });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  // ───────────────────────────────────────────
  // STEP 4 — LOGOUT BUTTON
  // ───────────────────────────────────────────
  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  // ───────────────────────────────────────────
  // TIME AGO HELPER
  // ───────────────────────────────────────────
  function timeAgo(dateString) {
    const diff = Math.floor((Date.now() - new Date(dateString)) / 1000);

    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;

    return `${Math.floor(diff / 86400)} days ago`;
  }

  // ───────────────────────────────────────────
  // UPDATE STATUS (Approve / Played / Reject)
  // ───────────────────────────────────────────
  async function updateStatus(id, status) {
    await supabase
      .from("requests")
      .update({ status })
      .eq("id", id);
  }

  // ───────────────────────────────────────────
  // RENDER
  // ───────────────────────────────────────────
  return (
    <main style={{ maxWidth: "700px", margin: "20px auto", padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>🎧 TextMyTrack DJ Dashboard</h1>
        <button onClick={logout} style={{ height: "40px" }}>
          Logout
        </button>
      </div>

      <p>Live song requests with AI: genre, mood, energy, explicit flag.</p>

      <div style={{ marginTop: "20px" }}>
        {requests.map((request) => {
          const localTime = new Date(request.requestedAt).toLocaleTimeString(
            [],
            { hour: "numeric", minute: "2-digit" }
          );

          return (
            <div
              key={request.id}
              style={{
                padding: "15px",
                marginBottom: "12px",
                border: "1px solid #ccc",
                borderRadius: "8px",
              }}
            >
              <h3>
                {request.title} — {request.artist}
              </h3>
              <p>
                Genre: {request.genre} • Energy: {request.energy} • Mood:{" "}
                {request.mood}
              </p>

              <p style={{ opacity: 0.7 }}>
                Requested by {request.requestedBy} — {timeAgo(request.requestedAt)}
              </p>

              <p>Status: <strong>{request.status}</strong></p>

              <div style={{ marginTop: "8px", display: "flex", gap: "10px" }}>
                <button onClick={() => updateStatus(request.id, "approved")}>
                  Approve
                </button>
                <button onClick={() => updateStatus(request.id, "played")}>
                  Played
                </button>
                <button onClick={() => updateStatus(request.id, "rejected")}>
                  Reject
                </button>
              </div>

              <div style={{ marginTop: "10px", fontSize: "12px", opacity: 0.6 }}>
                {localTime}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
