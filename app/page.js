"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";

export default function Home() {
  const [requests, setRequests] = useState([]);

  // Load data from API
  useEffect(() => {
    async function load() {
      const res = await fetch("/api/requests");
      const data = await res.json();
      setRequests(data.requests || []);
    }

    load();

    // Refresh every 5 seconds for now (real-time coming next)
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  // Update request status (Approve / Played / Reject)
  async function handleStatus(id, newStatus) {
    await fetch("/api/update-request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id, status: newStatus }),
    });

    // Optimistically update UI without waiting
    setRequests((prev) =>
      prev.map((req) =>
        req.id === id ? { ...req, status: newStatus } : req
      )
    );
  }

  return (
    <main className="p-10 font-sans text-white bg-slate-900 min-h-screen">
      <h1 className="text-3xl font-bold mb-4">
        🎧 TextMyTrack DJ Dashboard
      </h1>

      <p className="opacity-70 mb-8">
        Live song requests with AI: genre, tone, energy, explicit flag, and request history.
      </p>

      <div className="flex flex-col gap-6 mt-6">
        {requests.map((request) => {
          const timeAgo = formatDistanceToNow(new Date(request.requestedAt), {
            addSuffix: true,
          });

          return (
            <div
              key={request.id}
              className="p-6 rounded-xl bg-slate-800 border border-slate-700 shadow-md"
            >
              {/* Title + Artist */}
              <h2 className="text-xl font-semibold">
                {request.title}{" "}
                <span className="opacity-70 text-sm">
                  — {request.artist}
                </span>
              </h2>

              {/* Metadata */}
              <div className="mt-2 opacity-80 text-sm">
                Genre: <strong>{request.genre}</strong> • Energy:{" "}
                <strong>{request.energy}</strong> • Mood:{" "}
                <strong>{request.mood}</strong>
              </div>

              {/* Time & requester */}
              <div className="mt-3 text-xs opacity-60">
                Requested by <strong>{request.requestedBy}</strong> — {timeAgo}
              </div>

              {/* Status Label */}
              {request.status && (
                <div className="mt-3 text-xs">
                  Status:{" "}
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      request.status === "approved"
                        ? "bg-green-600"
                        : request.status === "played"
                        ? "bg-blue-600"
                        : request.status === "rejected"
                        ? "bg-red-600"
                        : "bg-slate-700"
                    }`}
                  >
                    {request.status}
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => handleStatus(request.id, "approved")}
                  className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded-lg text-sm font-semibold transition"
                >
                  Approve
                </button>

                <button
                  onClick={() => handleStatus(request.id, "played")}
                  className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg text-sm font-semibold transition"
                >
                  Played
                </button>

                <button
                  onClick={() => handleStatus(request.id, "rejected")}
                  className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg text-sm font-semibold transition"
                >
                  Reject
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
