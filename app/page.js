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
  ExternalLink,
  Clock,
  User,
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
  const [filterStatus, setFilterStatus] = useState("all");

  // Fetch DJ profile with Twilio number
  async function fetchDjProfile(userId) {
    try {
      let data;

      // Attempt #1 – match "id"
      const result1 = await supabase
        .from("dj_profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (result1.data) data = result1.data;
      else {
        // Attempt #2 – match "user_id"
        const result2 = await supabase
          .from("dj_profiles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (result2.data) data = result2.data;
        else {
          // Attempt #3 – match by email
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
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;

    return past.toLocaleDateString();
  }

  // ⭐ UPDATED PHONE FORMATTER
  function formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) return "Not assigned";

    // Strip everything except digits
    const cleaned = phoneNumber.replace(/\D/g, "");

    // Remove leading country code if present
    let core = cleaned;
    if (cleaned.length === 11 && cleaned.startsWith("1")) {
      core = cleaned.slice(1);
    }

    // Now format if 10 digits
    if (core.length === 10) {
      return `(${core.slice(0, 3)}) ${core.slice(3, 6)}-${core.slice(6)}`;
    }

    return phoneNumber;
  }

  // Filter requests
  const filteredRequests = requests.filter((req) => {
    if (filterStatus === "all") return true;
    return req.status === filterStatus;
  });

  // Stats
  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    played: requests.filter((r) => r.status === "played").length,
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0f0f1a] to-[#0a0a0f] text-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#ff4da3] to-[#b366ff] flex items-center gap-3">
              <Music size={36} className="text-[#ff4da3]" /> 
              TextMyTrack
            </h1>
            <p className="text-gray-400 mt-1 ml-12">DJ Dashboard</p>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1e1e2d] hover:bg-[#2a2a40] border border-[#2a2a40] transition-all hover:border-[#3a3a50] text-gray-300 hover:text-white"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>

        {/* DJ Info Card */}
        {user && (
          <div className="mb-8 bg-gradient-to-r from-[#141420] to-[#1a1a2a] p-6 rounded-2xl border border-[#2a2a40] shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-[#4da3ff] to-[#b366ff] p-4 rounded-xl shadow-lg">
                  <Phone size={28} className="text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-400 font-medium">Your TextMyTrack Number</p>

                  {djProfile ? (
                    <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#4da3ff] to-[#b366ff]">
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
                <p className="text-sm text-gray-400 font-medium">Logged in as</p>
                <p className="text-gray-200 font-semibold">{user.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-[#141420] p-4 rounded-xl border border-[#2a2a40]">
            <p className="text-gray-400 text-sm mb-1">Total Requests</p>
            <p className="text-3xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-[#141420] p-4 rounded-xl border border-[#2a2a40]">
            <p className="text-gray-400 text-sm mb-1">Pending</p>
            <p className="text-3xl font-bold text-yellow-400">{stats.pending}</p>
          </div>
          <div className="bg-[#141420] p-4 rounded-xl border border-[#2a2a40]">
            <p className="text-gray-400 text-sm mb-1">Approved</p>
            <p className="text-3xl font-bold text-green-400">{stats.approved}</p>
          </div>
          <div className="bg-[#141420] p-4 rounded-xl border border-[#2a2a40]">
            <p className="text-gray-400 text-sm mb-1">Played</p>
            <p className="text-3xl font-bold text-blue-400">{stats.played}</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {["all", "pending", "approved", "played"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filterStatus === status
                  ? "bg-[#ff4da3] text-white shadow-lg"
                  : "bg-[#1e1e2d] text-gray-400 hover:bg-[#2a2a40] hover:text-gray-300"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Requests */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#ff4da3] border-t-transparent"></div>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-20">
            <Music size={64} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-500 text-xl">
              {filterStatus === "all" ? "No requests yet." : `No ${filterStatus} requests.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((req) => (
              <div
                key={req.id}
                className="bg-[#141420] p-5 rounded-2xl border border-[#2a2a40] hover:border-[#3a3a50] shadow-lg hover:shadow-2xl transition-all group"
              >
                <div className="flex gap-5">
                  {/* Thumbnail */}
                  <div className="flex-shrink-0">
                    {req.thumbnail ? (
                      <img
                        src={req.thumbnail}
                        alt={req.title}
                        className="w-28 h-28 rounded-xl object-cover border-2 border-[#2a2a40] group-hover:border-[#ff4da3] transition-all shadow-lg"
                      />
                    ) : (
                      <div className="w-28 h-28 rounded-xl bg-gradient-to-br from-[#2a2a40] to-[#1e1e2d] flex items-center justify-center border-2 border-[#2a2a40]">
                        <Music size={40} className="text-gray-600" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Title and Status */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        {req.url ? (
                          <a
                            href={req.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group/link inline-flex items-center gap-2 hover:opacity-80 transition-opacity"
                          >
                            <h2 className="text-2xl font-bold text-white group-hover/link:text-[#ff4da3] transition-colors">
                              {req.title}
                            </h2>
                            <ExternalLink
                              size={18}
                              className="text-gray-500 group-hover/link:text-[#ff4da3] transition-colors"
                            />
                          </a>
                        ) : (
                          <h2 className="text-2xl font-bold text-white">{req.title}</h2>
                        )}
                        <p className="text-lg text-[#4da3ff] font-medium mt-1">{req.artist}</p>
                      </div>

                      <span
                        className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wide ${
                          req.status === "pending"
                            ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                            : req.status === "approved"
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : req.status === "played"
                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                            : "bg-red-500/20 text-red-400 border red-500/30"
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>

                    {/* Metadata */}
                    <div className="flex flex-wrap gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-sm">Genre:</span>
                        <span className="text-[#b366ff] font-semibold px-3 py-1 bg-[#b366ff]/10 rounded-lg border border-[#b366ff]/20">
                          {req.genre || "Unknown"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-sm">Energy:</span>
                        <span className="text-[#ff4da3] font-semibold px-3 py-1 bg-[#ff4da3]/10 rounded-lg border border-[#ff4da3]/20">
                          {req.energy || "Unknown"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-sm">Mood:</span>
                        <span className="text-[#4da3ff] font-semibold px-3 py-1 bg-[#4da3ff]/10 rounded-lg border border-[#4da3ff]/20">
                          {req.mood || "Unknown"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-sm">Cursing:</span>
                        <span
                          className={`font-bold px-3 py-1 rounded-lg border ${
                            req.explicit === "Explicit"
                              ? "text-red-400 bg-red-400/10 border-red-400/20"
                              : req.explicit === "Clean"
                              ? "text-green-400 bg-green-400/10 border-green-400/20"
                              : "text-yellow-400 bg-yellow-400/10 border-yellow-400/20"
                          }`}
                        >
                          {req.explicit || "Undetermined"}
                        </span>
                      </div>
                    </div>

                    {/* Request Info */}
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                      <div className="flex items-center gap-2">
                        <User size={14} />
                        <span>{req.requestedBy}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={14} />
                        <span>{timeAgo(req.requestedAt)}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => updateStatus(req.id, "approved")}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 transition-all font-semibold shadow-lg hover:shadow-xl"
                      >
                        <Check size={18} /> Approve
                      </button>

                      <button
                        onClick={() => updateStatus(req.id, "played")}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 transition-all font-semibold shadow-lg hover:shadow-xl"
                      >
                        <ArrowRight size={18} />
                        Played
                      </button>

                      <button
                        onClick={() => deleteRequest(req.id)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 transition-all font-semibold shadow-lg hover:shadow-xl"
                      >
                        <Trash2 size={18} /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
