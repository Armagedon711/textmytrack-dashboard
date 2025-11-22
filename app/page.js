"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [requests, setRequests] = useState([]);

  // Load mock data (later replaced with n8n)
  useEffect(() => {
    async function load() {
      const res = await fetch("/api/requests");
      const data = await res.json();
      setRequests(data.requests || []);
    }
    load();
  }, []);

  return (
    <main style={{ padding: "40px", fontFamily: "Arial", color: "white" }}>
      <h1 style={{ fontSize: "28px", marginBottom: "20px" }}>
        🎧 TextMyTrack DJ Dashboard
      </h1>

      <p style={{ opacity: 0.7, marginBottom: "20px" }}>
        Live song requests with AI: genre, tone, energy level, and explicit flag.
      </p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          marginTop: "20px",
        }}
      >
        {requests.map((req) => (
          <div
            key={req.id}
            style={{
              padding: "20px",
              borderRadius: "12px",
              background: "#0f172a",
              border: "1px solid #1e293b",
            }}
          >
            <h2 style={{ margin: 0 }}>
              {req.title}{" "}
              <span style={{ opacity: 0.6 }}>
                — {req.artist}
              </span>
            </h2>

            <div style={{ marginTop: "10px", opacity: 0.7 }}>
              Genre: {req.genre} • Energy: {req.energy} • Mood:{" "}
              {req.mood}
            </div>

            <div
              style={{
                marginTop: "10px",
                fontSize: "12px",
                opacity: 0.6,
              }}
            >
              Requested by: {req.requestedBy} at {req.requestedAt}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
