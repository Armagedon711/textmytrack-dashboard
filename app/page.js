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
  Play,
} from "lucide-react";
import { useRouter } from "next/navigation";

// Platform configuration
const PLATFORMS = {
  youtube: {
    name: "YouTube",
    icon: "🎬",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
  },
  spotify: {
    name: "Spotify",
    icon: "🎵",
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
  },
  apple: {
    name: "Apple Music",
    icon: "🍎",
    color: "text-pink-400",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/20",
  },
  soundcloud: {
    name: "SoundCloud",
    icon: "🔊",
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/20",
  },
};

export default function Dashboard() {
  const supabase = supabaseBrowserClient();
  const router = useRouter();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [djProfile, setDjProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedPlatform, setSelectedPlatform] = useState("youtube");
  const [videoModal, setVideoModal] = useState(null);

  // Helper function to get the appropriate URL based on platform
  function getPlatformUrl(request) {
    switch (selectedPlatform) {
      case "youtube":
        return request.youtube_url || request.url || null;
      case "spotify":
        return request.spotify_url || null;
      case "apple":
        return request.apple_url || null;
      case "soundcloud":
        return request.soundcloud_url || null;
      default:
        return request.youtube_url || request.url || null;
    }
  }

  // Helper function to check if a platform URL exists for a request
  function hasPlatformUrl(request, platform) {
    switch (platform) {
      case "youtube":
        return !!(request.youtube_url || request.url);
      case "spotify":
        return !!request.spotify_url;
      case "apple":
        return !!request.apple_url;
      case "soundcloud":
        return !!request.soundcloud_url;
      default:
        return false;
    }
  }

  // Helper function to open video (modal for YouTube, direct link for others)
  function handleOpenVideo(request) {
    if (selectedPlatform === "youtube" && request.youtube_video_id) {
      // Open YouTube in modal with embedded player (muted by default)
      setVideoModal(request.youtube_video_id);
    } else {
      // For other platforms, open in new tab
      const url = getPlatformUrl(request);
      if (url) {
        window.open(url, "_blank");
      }
    }
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

  async function updatePlatformPreference(platform) {
    setSelectedPlatform(platform);
    if (user) {
      await supabase
        .from("dj_profiles")
        .update({ preferred_platform: platform })
        .eq("id", user.id);
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

  async function clearAllRequests() {
    if (
      !confirm(
        "Are you sure you want to delete ALL requests? This cannot be undone."
      )
    )
      return;

    const deletePromises = filteredRequests.map((req) =>
      fetch("/api/requests-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: req.id }),
      })
    );

    await Promise.all(deletePromises);
    if (user) fetchRequests(user.id);
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

  const currentPlatform = PLATFORMS[selectedPlatform];

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Gradient Background Orb */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-br from-[#ff4da3]/20 via-[#b366ff]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Video Modal */}
      {videoModal && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setVideoModal(null)}
        >
          <div
            className="bg-[#1a1a2a] rounded-2xl overflow-hidden max-w-5xl w-full shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-video">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${videoModal}?autoplay=1&mute=1&rel=0&modestbranding=1`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
            <div className="p-3 flex items-center justify-between bg-[#141420]">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <VolumeX size={16} />
                <span>Video started muted - Click video to unmute</span>
              </div>
              <button
                onClick={() => setVideoModal(null)}
                className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 transition-all text-sm font-semibold"
              >
                <X size={16} className="inline mr-1" /> Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative max-w-7xl mx-auto p-4 sm:p-6">
        {/* Top Bar - Compacted */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff4da3] to-[#b366ff] flex items-center justify-center shadow-lg shadow-[#ff4da3]/20">
              <Music size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">TextMyTrack</h1>
              <p className="text-xs text-gray-500">Request Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-gray-500">Logged in as</p>
              <p className="text-sm font-medium text-gray-300">
                {user?.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-sm font-medium text-gray-300 hover:text-white"
            >
              <LogOut size={16} className="inline sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Phone Number Card with Platform Selector - Compacted */}
        {user && (
          <div className="mb-4 p-4 rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4da3ff] to-[#b366ff] flex items-center justify-center shadow-lg shadow-[#4da3ff]/20">
                  <Phone size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">
                    Your Number
                  </p>
                  {djProfile ? (
                    <p className="text-xl font-bold tracking-tight text-white">
                      {formatPhoneNumber(djProfile.twilio_number)}
                    </p>
                  ) : profileError ? (
                    <p className="text-sm text-red-400 flex items-center gap-2">
                      <AlertCircle size={16} />
                      {profileError}
                    </p>
                  ) : (
                    <p className="text-gray-400 text-sm">Loading...</p>
                  )}
                </div>
              </div>

              {/* Platform Selector Dropdown - All 4 Platforms */}
              <div className="flex items-center gap-3">
                <div className="px-2 py-1 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-xs text-green-400 font-medium">● Active</p>
                </div>
                <div className="relative">
                  <select
                    value={selectedPlatform}
                    onChange={(e) => updatePlatformPreference(e.target.value)}
                    className="appearance-none px-3 py-1.5 pr-8 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#ff4da3]/50"
                  >
                    <option value="youtube" className="bg-[#1a1a2a] text-white">
                      🎬 YouTube
                    </option>
                    <option value="spotify" className="bg-[#1a1a2a] text-white">
                      🎵 Spotify
                    </option>
                    <option value="apple" className="bg-[#1a1a2a] text-white">
                      🍎 Apple Music
                    </option>
                    <option
                      value="soundcloud"
                      className="bg-[#1a1a2a] text-white"
                    >
                      🔊 SoundCloud
                    </option>
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                  />
                </div>
              </div>
            </div>

            {/* Platform indicator */}
            <div className="mt-3 pt-3 border-t border-white/5">
              <p className="text-xs text-gray-500">
                Songs will open in{" "}
                <span className={currentPlatform.color}>
                  {currentPlatform.icon} {currentPlatform.name}
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Stats Grid - Compacted */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            {
              label: "Total",
              value: stats.total,
              icon: Activity,
              color: "text-white",
            },
            {
              label: "Pending",
              value: stats.pending,
              icon: Clock,
              color: "text-yellow-400",
            },
            {
              label: "Approved",
              value: stats.approved,
              icon: Check,
              color: "text-green-400",
            },
            {
              label: "Played",
              value: stats.played,
              icon: TrendingUp,
              color: "text-blue-400",
            },
          ].map((stat, i) => (
            <div
              key={i}
              className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/[0.07] transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <stat.icon size={16} className={`${stat.color} opacity-60`} />
                <Sparkles
                  size={12}
                  className="text-gray-600 group-hover:text-gray-500 transition-colors"
                />
              </div>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Filter Pills with Clear All Button */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex gap-2 flex-wrap">
            {["all", "pending", "approved", "played"].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filterStatus === status
                    ? "bg-[#ff4da3] text-white shadow-lg shadow-[#ff4da3]/30"
                    : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-300 border border-white/10"
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          {/* Clear All Button */}
          {filteredRequests.length > 0 && (
            <button
              onClick={clearAllRequests}
              className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 transition-all text-xs font-semibold"
            >
              <Trash2 size={14} className="inline mr-1" />
              Clear All ({filteredRequests.length})
            </button>
          )}
        </div>

        {/* Request Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-white/10 border-t-[#ff4da3] rounded-full animate-spin" />
              <div
                className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-[#b366ff] rounded-full animate-spin"
                style={{ animationDuration: "1.5s" }}
              />
            </div>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-32">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/5 flex items-center justify-center">
              <Music size={40} className="text-gray-600" />
            </div>
            <p className="text-xl text-gray-500 font-medium">
              {filterStatus === "all"
                ? "No requests yet"
                : `No ${filterStatus} requests`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((req) => {
              const hasUrl = getPlatformUrl(req);
              const isYouTube = selectedPlatform === "youtube";

              // Count available platforms for this request
              const availablePlatforms = Object.keys(PLATFORMS).filter((p) =>
                hasPlatformUrl(req, p)
              );

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
                          <img
                            src={req.thumbnail}
                            alt={req.title}
                            className="w-full h-full object-cover"
                          />
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
                          {hasUrl ? (
                            <button
                              onClick={() => handleOpenVideo(req)}
                              className="group/link inline-flex items-center gap-2 text-left hover:opacity-90 transition-opacity"
                            >
                              <h2 className="text-xl font-bold text-white group-hover/link:text-[#ff4da3] transition-colors">
                                {req.title}
                              </h2>
                              <div className="flex items-center gap-1">
                                {isYouTube && (
                                  <VolumeX
                                    size={14}
                                    className="text-gray-600 group-hover/link:text-gray-500"
                                  />
                                )}
                                <Play
                                  size={16}
                                  className="text-gray-600 group-hover/link:text-[#ff4da3] transition-colors"
                                />
                              </div>
                            </button>
                          ) : (
                            <div>
                              <h2 className="text-xl font-bold text-white">
                                {req.title}
                              </h2>
                              <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                                <AlertCircle size={12} />
                                {currentPlatform.name} link not available
                                {availablePlatforms.length > 0 && (
                                  <span className="text-gray-500 ml-1">
                                    (Try:{" "}
                                    {availablePlatforms
                                      .map((p) => PLATFORMS[p].name)
                                      .join(", ")}
                                    )
                                  </span>
                                )}
                              </p>
                            </div>
                          )}
                          <p className="text-sm text-gray-400 font-medium mt-1">
                            {req.artist}
                          </p>
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
                          {
                            label: req.genre || "Unknown",
                            color: "text-purple-400",
                            bg: "bg-purple-500/10",
                            border: "border-purple-500/20",
                          },
                          {
                            label: req.energy || "Unknown",
                            color: "text-pink-400",
                            bg: "bg-pink-500/10",
                            border: "border-pink-500/20",
                          },
                          {
                            label: req.mood || "Unknown",
                            color: "text-blue-400",
                            bg: "bg-blue-500/10",
                            border: "border-blue-500/20",
                          },
                          {
                            label: req.explicit || "Unknown",
                            color:
                              req.explicit === "Explicit"
                                ? "text-red-400"
                                : req.explicit === "Clean"
                                ? "text-green-400"
                                : "text-yellow-400",
                            bg:
                              req.explicit === "Explicit"
                                ? "bg-red-500/10"
                                : req.explicit === "Clean"
                                ? "bg-green-500/10"
                                : "bg-yellow-500/10",
                            border:
                              req.explicit === "Explicit"
                                ? "border-red-500/20"
                                : req.explicit === "Clean"
                                ? "border-green-500/20"
                                : "border-yellow-500/20",
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

                      {/* Platform availability indicators */}
                      <div className="flex gap-2 mb-4">
                        {Object.entries(PLATFORMS).map(([key, platform]) => {
                          const available = hasPlatformUrl(req, key);
                          return (
                            <span
                              key={key}
                              className={`text-xs px-2 py-0.5 rounded ${
                                available
                                  ? `${platform.bgColor} ${platform.color} ${platform.borderColor} border`
                                  : "bg-white/5 text-gray-600 border border-white/5"
                              }`}
                              title={
                                available
                                  ? `${platform.name} available`
                                  : `${platform.name} not available`
                              }
                            >
                              {platform.icon}
                            </span>
                          );
                        })}
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

                        {/* Actions - Conditional rendering based on status */}
                        <div className="flex gap-2">
                          {req.status === "pending" && (
                            <button
                              onClick={() => updateStatus(req.id, "approved")}
                              className="px-4 py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 transition-all text-xs font-semibold"
                            >
                              <Check size={14} className="inline mr-1" />{" "}
                              Approve
                            </button>
                          )}

                          {(req.status === "pending" ||
                            req.status === "approved") && (
                            <button
                              onClick={() => updateStatus(req.id, "played")}
                              className="px-4 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 transition-all text-xs font-semibold"
                            >
                              <ArrowRight size={14} className="inline mr-1" />{" "}
                              Played
                            </button>
                          )}

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