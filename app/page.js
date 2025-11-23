"use client";

import { useState, useEffect } from "react";
import { supabaseBrowserClient } from "../lib/supabaseClient";
import {
  ArrowRight,
  Check,
  X,
  Music,
  LogOut,
  Phone,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const supabase = supabaseBrowserClient();
  const router = useRouter();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [djProfile, setDjProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [profileError, setProfileError] = useState(null);

  // Fetch DJ profile with Twilio number
  async function fetchDjProfile(userId) {
    try {
      let data;

      // Attempt #1 — match "id"
      const result1 = await supabase
        .from("dj_profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (result1.data) data = result1.data;
      else {
        // Attempt #2 — match "user_id"
        const result2 = await supabase
          .from("dj_profiles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (result2.data) data = result2.data;
        else {
          // Attempt #3 — match by email
          const { data: userObj } = await supabase.auth.getUser();
          if (userObj?.user?.email) {
            const result3 = await supabase
              .from("dj_profiles")
              .select("*")
              .eq("email", userObj.user.email)
              .maybeSingle();

            data = result3.data;
          }
        }
      }

      if (data) {
        setDjProfile(data);
      } else {
        setProfileError("DJ profile not found. Please contact support.");
      }
    } catch (err) {
      setProfileError("Error loading profile");
    }
  }

  // Load requests
  async function fetchRequests() {
    const res = await fetch("/api/requests");
    const json = await res.json();
    setRequests(json.requests || []);
    setLoading(false);
  }

  // Get logged-in user
  useEffect(() => {
    async function getUser() {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUser(data.user);
        fetchDjProfile(data.user.id);
      } else {
        router.push("/login");
      }
    }
    getUser();
  }, []);

  // Live updates
  useEffect(() => {
    fetchRequests();

    const channel = supabase
      .channel("realtime-requests")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "requests" },
        () => fetchRequests()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  async function updateStatus(id, status) {
    await fetch("/api/requests-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    fetchRequests();
  }

  async function deleteRequest(id) {
    if (!confirm("Are you sure you want to reject and delete this song request?"))
      return;

    const res = await fetch("/api/requests-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    const result = await res.json();
    if (result.success) {
      setRequests(requests.filter((req) => req.id !== id));
    } else {
      alert("Failed to delete request");
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
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

  function formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) return "Not assigned";
    const cleaned = phoneNumber.replace(/\D/g, "");
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(
        6
      )}`;
    }
    return phoneNumber;
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-brand-pink drop-shadow-glow flex items-center gap-2">
          <Music size={28} /> TextMyTrack DJ Dashboard
        </h1>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1e1e2d] hover:bg-[#2a2a40] border border-[#2a2a40] transition text-gray-300 hover:text-white"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>

      {/* DJ Info */}
      {user && (
        <div className="mb-6 bg-[#141420] p-5 rounded-xl border border-[#1e1e2d] shadow-glow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-brand-blue/20 p-3 rounded-lg">
                <Phone size={24} className="text-brand-blue" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Your TextMyTrack Number</p>
                {djProfile ? (
                  <p className="text-2xl font-bold text-brand-blue">
                    {formatPhoneNumber(djProfile.twilio_number)}
                  </p>
                ) : profileError ? (
                  <p className="text-lg text-red-400 flex items-center gap-2">
                    <AlertCircle size={18} />
                    {profileError}
                  </p>
                ) : (
                  <p className="text-lg text-gray-400">Loading...</p>
                )}
              </div>
            </div>

            <div className="text-right">
              <p className="text-sm text-gray-400">Logged in as</p>
              <p className="text-gray-200">{user.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Requests */}
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

              <p className="text-gray-300 mb-2">
                Genre:{" "}
                <span className="text-brand-purple font-medium">
                  {req.genre || "Unknown"}
                </span>{" "}
                • Energy:{" "}
                <span className="text-brand-pink font-medium">
                  {req.energy || "Unknown"}
                </span>{" "}
                • Mood:{" "}
                <span className="text-brand-blue font-medium">
                  {req.mood || "Unknown"}
                </span>{" "}
                • Cursing:{" "}
                <span
                  className={`font-medium ${
                    req.explicit === "Explicit"
                      ? "text-red-400"
                      : req.explicit === "Clean"
                      ? "text-green-400"
                      : "text-yellow-400"
                  }`}
                >
                  {req.explicit || "Undetermined"}
                </span>
              </p>

              <p className="text-gray-500 text-sm mb-3">
                Requested by{" "}
                <span className="text-gray-300">{req.requestedBy}</span> —{" "}
                {timeAgo(req.requestedAt)}
              </p>

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
                  onClick={() => deleteRequest(req.id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 transition"
                >
                  <Trash2 size={18} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
