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
  TrendingUp,
  Activity,
  Sparkles,
  VolumeX,
  ChevronDown,
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
  const [selectedPlatform, setSelectedPlatform] = useState("youtube"); // NEW: Platform selector

  // Helper function to add mute parameter to YouTube URLs
  function getMutedYouTubeUrl(url) {
    if (!url) return '';
    return url.includes('?') ? `${url}&mute=1` : `${url}?mute=1`;
  }

  // Helper function to get the appropriate URL based on platform
  function getPlatformUrl(request) {
    if (selectedPlatform === "youtube") {
      // Try youtube_url first, then fall back to url field
      return request.youtube_url || request.url || null;
    } else if (selectedPlatform === "spotify") {
      return request.spotify_url || null;
    }
    return null;
  }

  // Helper function to get final URL with muting applied for YouTube
  function getFinalUrl(request) {
    const platformUrl = getPlatformUrl(request);
    
    if (!platformUrl) return null;
    
    // If YouTube is selected, ALWAYS apply mute parameter
    if (selectedPlatform === "youtube") {
      return getMutedYouTubeUrl(platformUrl);
    }
    
    // For other platforms, return URL as-is
    return platformUrl;
  }

  // Fetch DJ profile with Twilio number
  async function fetchDjProfile(userId) {
    try {
      let data;
      const result1 = await supabase
        .from("dj_profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (result1.data) data = result1.data;
      else {
        const result2 = await supabase
          .from("dj_profiles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (result2.data) data = result2.data;
        else {
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
        // Load saved platform preference if exists
        if (data.preferred_platform) {
          setSelectedPlatform(data.preferred_platform);
        }
      } else {
        setProfileError("DJ profile not found");
      }
    } catch (err) {
      setProfileError("Error loading profile");
    }
  }

  async function fetchRequests(djId) {
    if (!djId) return;
    try {
      const res = await fetch(`/api/requests?dj_id=${djId}`);
      const json = await res.json();
      setRequests(json.requests || []);
    } catch (err) {
      console.error("Error loading requests", err);
    } finally {
      setLoading(false);
    }
  }

  // Save platform preference
  async function updatePlatformPreference(platform) {
    setSelectedPlatform(platform);
    
    // Save to database
    if (user) {
      await supabase
        .from('dj_profiles')
        .update({ preferred_platform: platform })
        .eq('id', user.id);
    }
  }

  useEffect(() => {
    async function getUser() {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUser(data.user);
        fetchDjProfile(data.user.id);
        fetchRequests(data.user.id);
      } else {
        router.push("/login");
      }
    }
    getUser();
  }, [router, supabase]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("realtime-requests")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "requests" },
        () => fetchRequests(user.id)
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user, supabase]);

  async function updateStatus(id, status) {
    await fetch("/api/requests-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (user) fetchRequests(user.id);
  }

  async function deleteRequest(id) {
    if (!confirm("Delete this request?")) return;
    const res = await fetch("/api/requests-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const result = await res.json();
    if (result.success) {
      setRequests((prev) => prev.filter((req) => req.id !== id));
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
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  }

  function formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) return "Not assigned";
    const cleaned = phoneNumber.replace(/\D/g, "");
    let core = cleaned;
    if (cleaned.length === 11 && cleaned.startsWith("1")) {
      core = cleaned.slice(1);
    }
    if (core.length === 10) {
      return `(${core.slice(0, 3)}) ${core.slice(3, 6)}-${core.slice(6)}`;
    }
    return phoneNumber;
  }

  const filteredRequests = requests.filter((req) => {
    if (filterStatus === "all") return true;
    return req.status === filterStatus;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    played: requests.filter((r) => r.status === "played").length,
  };

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Gradient Background Orb */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-br from-[#ff4da3]/20 via-[#b366ff]/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative max-w-7xl mx-auto p-8">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ff4da3] to-[#b366ff] flex items-center justify-center shadow-lg shadow-[#ff4da3]/20">
              <Music size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">TextMyTrack</h1>
              <p className="text-sm text-gray-500">Request Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-gray-500">Logged in as</p>
              <p className="text-sm font-medium text-gray-300">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-sm font-medium text-gray-300 hover:text-white"
            >
              <LogOut size={16} className="inline mr-2" />
              Logout
            </button>
          </div>
        </div>

        {/* Phone Number Card with Platform Selector */}
        {user && (
          <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#4da3ff] to-[#b366ff] flex items-center justify-center shadow-lg shadow-[#4da3ff]/20">
                  <Phone size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">Your TextMyTrack Number</p>
                  {djProfile ? (
                    <p className="text-3xl font-bold tracking-tight text-white">
                      {formatPhoneNumber(djProfile.twilio_number)}
                    </p>
                  ) : profileError ? (
                    <p className="text-lg text-red-400 flex items-center gap-2">
                      <AlertCircle size={18} />
                      {profileError}
                    </p>
                  ) : (
                    <p className="text-gray-400">Loading...</p>
                  )}
                </div>
              </div>

              {/* Platform Selector Dropdown */}
              <div className="flex flex-col items-end gap-2">
                <label className="text-xs text-gray-500 font-medium">Music Platform</label>
                <div className="relative">
                  <select
                    value={selectedPlatform}
                    onChange={(e) => updatePlatformPreference(e.target.value)}
                    className="appearance-none px-4 py-2 pr-10 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#ff4da3]/50"
                  >
                    <option value="youtube" className="bg-[#1a1a2a] text-white">YouTube</option>
                    <option value="spotify" className="bg-[#1a1a2a] text-white">Spotify</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
                <div className="px-3 py-1 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-xs text-green-400 font-medium">● Active</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Requests", value: stats.total, icon: Activity, color: "text-white" },
            { label: "Pending", value: stats.pending, icon: Clock, color: "text-yellow-400" },
            { label: "Approved", value: stats.approved, icon: Check, color: "text-green-400" },
            { label: "Played", value: stats.played, icon: TrendingUp, color: "text-blue-400" },
          ].map((stat, i) => (
            <div
              key={i}
              className="p-5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/[0.07] transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <stat.icon size={20} className={`${stat.color} opacity-60`} />
                <Sparkles size={14} className="text-gray-600 group-hover:text-gray-500 transition-colors" />
              </div>
              <p className={`text-3xl font-bold mb-1 ${stat.color}`}>
                {stat.value}
              </p>
              <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 mb-6">
          {["all", "pending", "approved", "played"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filterStatus === status
                  ? "bg-[#ff4da3] text-white shadow-lg shadow-[#ff4da3]/30"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-300 border border-white/10"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Request Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-white/10 border-t-[#ff4da3] rounded-full animate-spin" />
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-[#b366ff] rounded-full animate-spin" style={{ animationDuration: '1.5s' }} />
            </div>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-32">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/5 flex items-center justify-center">
              <Music size={40} className="text-gray-600" />
            </div>
            <p className="text-xl text-gray-500 font-medium">
              {filterStatus === "all" ? "No requests yet" : `No ${filterStatus} requests`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((req) => {
              const finalUrl = getFinalUrl(req);
              const isYouTube = selectedPlatform === "youtube";

              return (
                <div
                  key={req.id}
                  className="p-5 rounded-2xl bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 backdrop-blur-sm hover:border-white/20 transition-all group"
                >
                  <div className="flex gap-5">
                    {/* Thumbnail */}
                    <div className="flex-shrink-0">
                      <div className="w-32 h-32 rounded-xl overflow-hidden border border-white/10 group-hover:border-[#ff4da3]/50 transition-all shadow-lg">
                        {req.thumbnail ? (
                          <img src={req.thumbnail} alt={req.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/10 to-white/5">
                            <Music size={32} className="text-gray-600" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          {finalUrl ? (
                            <a
                              href={finalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group/link inline-flex items-center gap-2"
                            >
                              <h2 className="text-xl font-bold text-white group-hover/link:text-[#ff4da3] transition-colors">
                                {req.title}
                              </h2>
                              <div className="flex items-center gap-1">
                                {isYouTube && <VolumeX size={14} className="text-gray-600 group-hover/link:text-gray-500" />}
                                <ExternalLink size={16} className="text-gray-600 group-hover/link:text-[#ff4da3] transition-colors" />
                              </div>
                            </a>
                          ) : (
                            <div>
                              <h2 className="text-xl font-bold text-white">{req.title}</h2>
                              <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                                <AlertCircle size={12} />
                                {selectedPlatform === "spotify" 
                                  ? "Spotify link not available yet" 
                                  : "Link not available"}
                              </p>
                            </div>
                          )}
                          <p className="text-sm text-gray-400 font-medium mt-1">{req.artist}</p>
                        </div>

                        <span
                          className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                            req.status === "pending"
                              ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                              : req.status === "approved"
                              ? "bg-green-500/10 text-green-400 border border-green-500/20"
                              : req.status === "played"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : "bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>

                      {/* Metadata */}
                      <div className="flex flex-wrap gap-3 mb-4">
                        {[
                          { label: req.genre || "Unknown", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
                          { label: req.energy || "Unknown", color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/20" },
                          { label: req.mood || "Unknown", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
                          { 
                            label: req.explicit || "Unknown",
                            color: req.explicit === "Explicit" ? "text-red-400" : req.explicit === "Clean" ? "text-green-400" : "text-yellow-400",
                            bg: req.explicit === "Explicit" ? "bg-red-500/10" : req.explicit === "Clean" ? "bg-green-500/10" : "bg-yellow-500/10",
                            border: req.explicit === "Explicit" ? "border-red-500/20" : req.explicit === "Clean" ? "border-green-500/20" : "border-yellow-500/20"
                          },
                        ].map((tag, i) => (
                          <span
                            key={i}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold ${tag.color} ${tag.bg} border ${tag.border}`}
                          >
                            {tag.label}
                          </span>
                        ))}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1.5">
                            <User size={12} />
                            <span>{req.requestedBy}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock size={12} />
                            <span>{timeAgo(req.requestedAt)}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateStatus(req.id, "approved")}
                            className="px-4 py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 transition-all text-xs font-semibold"
                          >
                            <Check size={14} className="inline mr-1" /> Approve
                          </button>
                          <button
                            onClick={() => updateStatus(req.id, "played")}
                            className="px-4 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 transition-all text-xs font-semibold"
                          >
                            <ArrowRight size={14} className="inline mr-1" /> Played
                          </button>
                          <button
                            onClick={() => deleteRequest(req.id)}
                            className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 transition-all text-xs font-semibold"
                          >
                            <Trash2 size={14} className="inline mr-1" /> Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}