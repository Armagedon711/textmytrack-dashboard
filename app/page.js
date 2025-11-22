"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { ArrowRight, Check, X, Music } from "lucide-react";

export default function Dashboard() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial data
  async function fetchRequests() {
    const { data } = await fetch("/api/requests").then((res) => res.json());
    setRequests(data || []);
    setLoading(false);
  }

  // Realtime updates
  useEffect(() => {
    fetchRequests();

    const channel = supabase
      .channel("realtime-requests")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "requests" },
        (payload) => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Update status
  async function updateStatus(id, status) {
    await fetch("/api/requests-status", {
      method: "POST",
      body: JSON.stringify({ id, status }),
    });

    fetchRequests();
  }

  function timeAgo(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const diff = (now - past) / 1000;

    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;

    return past.toLocaleString();
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white p-6">
      <h1 className="text-3xl font-bold mb-6 text-brand-pink drop-shadow-glow flex items-center gap-2">
        <Music size={28} /> TextMyTrack DJ Dashboard
      </h1>

      {loading ? (
        <p className="text-gray-400">Loading requests...</p>
      ) : requests.length === 0 ? (
        <div className="text-gray-500 text-lg mt-10">No requests yet.</div>
      ) : (
        <div className="space-y-5">
          {requests.map((req) => (
            <div
              key={req.id}
              className="bg-[#141420] p-5 rounded-xl border border-[#1e1e2d] shadow-glow hover:shadow-lg transition-all"
            >
              {/* Song Header */}
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-semibold">
                  {req.title} —{" "}
                  <span className="text-brand-blue">{req.artist}</span>
                </h2>

                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    req.status === "pending"
                      ? "bg-yellow-500/20 text-yellow-400"
                      : req.status === "approved"
                      ? "bg-green-500/20 text-green-400"
                      : req.status === "played"
                      ? "bg-blue-500/20 text-blue-400"
                      : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {req.status}
                </span>
              </div>

              {/* Song Details */}
              <p className="text-gray-300 mb-2">
                Genre:{" "}
                <span className="text-brand-purple font-medium">
                  {req.genre}
                </span>{" "}
                • Energy:{" "}
                <span className="text-brand-pink font-medium">
                  {req.energy}
                </span>{" "}
                • Mood:{" "}
                <span className="text-brand-blue font-medium">
                  {req.mood}
                </span>
              </p>

              {/* Footer Info */}
              <p className="text-gray-500 text-sm mb-3">
                Requested by{" "}
                <span className="text-gray-300">{req.requestedBy}</span> —{" "}
                {timeAgo(req.requestedAt)}
              </p>

              {/* Buttons */}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => updateStatus(req.id, "approved")}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 transition"
                >
                  <Check size={18} /> Approve
                </button>

                <button
                  onClick={() => updateStatus(req.id, "played")}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition"
                >
                  <ArrowRight size={18} />
                  Played
                </button>

                <button
                  onClick={() => updateStatus(req.id, "rejected")}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 transition"
                >
                  <X size={18} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
