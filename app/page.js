"use client";

import { useState, useEffect } from "react";
import { supabaseBrowserClient } from "../lib/supabaseClient";
import { ArrowRight, Check, X, Music, LogOut, Phone, AlertCircle } from "lucide-react";
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
      console.log("Fetching DJ profile for user ID:", userId);
      
      // Try fetching with different possible column names
      let data, error;
      
      // First attempt: match by 'id'
      const result1 = await supabase
        .from("dj_profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      
      console.log("Query by 'id':", result1);
      
      if (result1.data) {
        data = result1.data;
      } else {
        // Second attempt: match by 'user_id'
        const result2 = await supabase
          .from("dj_profiles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();
        
        console.log("Query by 'user_id':", result2);
        
        if (result2.data) {
          data = result2.data;
        } else {
          // Third attempt: match by email
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.email) {
            const result3 = await supabase
              .from("dj_profiles")
              .select("*")
              .eq("email", user.email)
              .maybeSingle();
            
            console.log("Query by 'email':", result3);
            data = result3.data;
          }
        }
      }

      if (data) {
        console.log("DJ Profile found:", data);
        setDjProfile(data);
      } else {
        console.log("No DJ profile found in database");
        setProfileError("DJ profile not found. Please contact support.");
      }
    } catch (err) {
      console.error("Error fetching DJ profile:", err);
      setProfileError("Error loading profile");
    }
  }

  // Fetch initial data
  async function fetchRequests() {
    const res = await fetch("/api/requests");
    const json = await res.json();
    setRequests(json.requests || []);
    setLoading(false);
  }

  // Get current user and fetch profile
  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      console.log("Current user:", user);
      if (user) {
        setUser(user);
        fetchDjProfile(user.id);
      } else {
        console.log("No user found - redirecting to login");
        router.push("/login");
      }
    }
    
    getUser();
  }, []);

  // Realtime updates
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

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "https://textmytrack-dashboard.vercel.app/login";
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
    // Format as (XXX) XXX-XXXX if it's a US number
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      const match = cleaned.match(/^1(\d{3})(\d{3})(\d{4})$/);
      if (match) {
        return `+1 (${match[1]}) ${match[2]}-${match[3]}`;
      }
    }
    if (cleaned.length === 10) {
      const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
      if (match) {
        return `(${match[1]}) ${match[2]}-${match[3]}`;
      }
    }
    return phoneNumber;
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white p-6">
      {/* Header with Logout */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-[#ff4da3] drop-shadow-glow flex items-center gap-2">
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

      {/* DJ Info Card - Always show if user exists */}
      {user && (
        <div className="mb-6 bg-[#141420] p-5 rounded-xl border border-[#1e1e2d] shadow-glow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-[#4da3ff]/20 p-3 rounded-lg">
                <Phone size={24} className="text-[#4da3ff]" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Your TextMyTrack Number</p>
                {djProfile ? (
                  <p className="text-2xl font-bold text-[#4da3ff]">
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

      {/* Requests Section */}
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
                  <span className="text-[#4da3ff]">{req.artist}</span>
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
                <span className="text-[#b366ff] font-medium">
                  {req.genre || "Unknown"}
                </span>{" "}
                • Energy:{" "}
                <span className="text-[#ff4da3] font-medium">
                  {req.energy || "Unknown"}
                </span>{" "}
                • Mood:{" "}
                <span className="text-[#4da3ff] font-medium">
                  {req.mood || "Unknown"}
                </span>{" "}
                • Cursing:{" "}
                <span className={`font-medium ${req.explicit ? "text-red-400" : "text-green-400"}`}>
                  {req.explicit ? "Yes" : "No"}
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