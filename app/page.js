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
  Clock,
  User,
  Play,
  Pause,
  SkipForward,
  Volume2,
  VolumeX,
  ChevronDown,
  ListMusic,
  Disc3,
  Zap,
  Heart,
  Shield,
  ExternalLink,
  RefreshCw,
  Filter,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Circle,
} from "lucide-react";
import { useRouter } from "next/navigation";

// Platform configuration
const PLATFORMS = {
  youtube: {
    name: "YouTube",
    icon: "🎬",
    color: "#FF0000",
    textColor: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    hoverBg: "hover:bg-red-500/20",
  },
  spotify: {
    name: "Spotify",
    icon: "🎵",
    color: "#1DB954",
    textColor: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    hoverBg: "hover:bg-green-500/20",
  },
  apple: {
    name: "Apple Music",
    icon: "🍎",
    color: "#FC3C44",
    textColor: "text-pink-400",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/30",
    hoverBg: "hover:bg-pink-500/20",
  },
  soundcloud: {
    name: "SoundCloud",
    icon: "🔊",
    color: "#FF5500",
    textColor: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    hoverBg: "hover:bg-orange-500/20",
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
  const [filterStatus, setFilterStatus] = useState("pending");
  const [selectedPlatform, setSelectedPlatform] = useState("youtube");
  const [videoModal, setVideoModal] = useState(null);
  const [showPlatformMenu, setShowPlatformMenu] = useState(false);

  // Helper functions
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

  function handleOpenVideo(request) {
    if (selectedPlatform === "youtube" && request.youtube_video_id) {
      setVideoModal(request.youtube_video_id);
    } else {
      const url = getPlatformUrl(request);
      if (url) window.open(url, "_blank");
    }
  }

  // Data fetching
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
    setShowPlatformMenu(false);
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

  // Actions
  async function updateStatus(id, status) {
    await fetch("/api/requests-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (user) fetchRequests(user.id);
  }

  async function deleteRequest(id) {
    if (!confirm("Remove this request?")) return;
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
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
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

  // Filtered data
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
    <main className="min-h-screen bg-gradient-to-b from-[#0a0a0f] via-[#0d0d14] to-[#0a0a0f] text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-pink-500/5 rounded-full blur-[100px]" />
      </div>

      {/* Video Modal */}
      {videoModal && (
        <div
          className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={() => setVideoModal(null)}
        >
          <div
            className="bg-[#16161f] rounded-2xl overflow-hidden max-w-4xl w-full shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-video bg-black">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${videoModal}?autoplay=1&mute=1&rel=0&modestbranding=1`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="p-4 flex items-center justify-between border-t border-white/5">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <VolumeX size={16} />
                <span>Click video to unmute</span>
              </div>
              <button
                onClick={() => setVideoModal(null)}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all text-sm font-medium flex items-center gap-2"
              >
                <X size={16} /> Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Disc3 size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                TextMyTrack
              </h1>
              <p className="text-sm text-gray-500">DJ Request Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => user && fetchRequests(user.id)}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
              title="Refresh"
            >
              <RefreshCw size={18} className="text-gray-400" />
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-sm font-medium text-gray-300 flex items-center gap-2"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Left Column */}
          <div className="lg:col-span-1 space-y-6">
            {/* DJ Info Card */}
            <div className="p-5 rounded-2xl bg-[#12121a] border border-white/5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Phone size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                    Your Request Line
                  </p>
                  {djProfile ? (
                    <p className="text-lg font-bold text-white">
                      {formatPhoneNumber(djProfile.twilio_number)}
                    </p>
                  ) : profileError ? (
                    <p className="text-sm text-red-400">{profileError}</p>
                  ) : (
                    <p className="text-sm text-gray-500">Loading...</p>
                  )}
                </div>
              </div>
              <div className="px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                <span className="text-xs text-green-400 font-medium">
                  ● Accepting Requests
                </span>
              </div>
            </div>

            {/* Platform Selector */}
            <div className="p-5 rounded-2xl bg-[#12121a] border border-white/5">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">
                Open Songs In
              </p>
              <div className="space-y-2">
                {Object.entries(PLATFORMS).map(([key, platform]) => (
                  <button
                    key={key}
                    onClick={() => updatePlatformPreference(key)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      selectedPlatform === key
                        ? `${platform.bgColor} ${platform.borderColor} border-2`
                        : "bg-white/5 border border-transparent hover:bg-white/10"
                    }`}
                  >
                    <span className="text-xl">{platform.icon}</span>
                    <span
                      className={`font-medium ${
                        selectedPlatform === key
                          ? platform.textColor
                          : "text-gray-300"
                      }`}
                    >
                      {platform.name}
                    </span>
                    {selectedPlatform === key && (
                      <CheckCircle2
                        size={16}
                        className={`ml-auto ${platform.textColor}`}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="p-5 rounded-2xl bg-[#12121a] border border-white/5">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-4">
                Tonight's Stats
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Total Requests</span>
                  <span className="text-white font-bold text-lg">
                    {stats.total}
                  </span>
                </div>
                <div className="h-px bg-white/5" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Circle
                      size={8}
                      className="fill-yellow-400 text-yellow-400"
                    />
                    <span className="text-gray-400 text-sm">Waiting</span>
                  </div>
                  <span className="text-yellow-400 font-semibold">
                    {stats.pending}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Circle
                      size={8}
                      className="fill-green-400 text-green-400"
                    />
                    <span className="text-gray-400 text-sm">Approved</span>
                  </div>
                  <span className="text-green-400 font-semibold">
                    {stats.approved}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Circle size={8} className="fill-blue-400 text-blue-400" />
                    <span className="text-gray-400 text-sm">Played</span>
                  </div>
                  <span className="text-blue-400 font-semibold">
                    {stats.played}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content - Right Columns */}
          <div className="lg:col-span-3">
            {/* Filter Tabs */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
              {[
                {
                  key: "pending",
                  label: "Waiting",
                  count: stats.pending,
                  color: "yellow",
                },
                {
                  key: "approved",
                  label: "Up Next",
                  count: stats.approved,
                  color: "green",
                },
                {
                  key: "played",
                  label: "Played",
                  count: stats.played,
                  color: "blue",
                },
                { key: "all", label: "All", count: stats.total, color: "gray" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilterStatus(tab.key)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                    filterStatus === tab.key
                      ? tab.color === "yellow"
                        ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                        : tab.color === "green"
                        ? "bg-green-500/20 text-green-400 border border-green-500/30"
                        : tab.color === "blue"
                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        : "bg-white/10 text-white border border-white/20"
                      : "bg-white/5 text-gray-400 border border-transparent hover:bg-white/10"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`px-2 py-0.5 rounded-md text-xs ${
                      filterStatus === tab.key
                        ? "bg-white/20"
                        : "bg-white/10"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Request List */}
            {loading ? (
              <div className="flex items-center justify-center py-32">
                <div className="relative">
                  <div className="w-12 h-12 border-3 border-white/10 border-t-pink-500 rounded-full animate-spin" />
                </div>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-20 px-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                  <ListMusic size={28} className="text-gray-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-400 mb-1">
                  {filterStatus === "pending"
                    ? "No requests waiting"
                    : filterStatus === "approved"
                    ? "No songs queued up"
                    : filterStatus === "played"
                    ? "No songs played yet"
                    : "No requests yet"}
                </h3>
                <p className="text-sm text-gray-600">
                  Requests will appear here when people text your number
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRequests.map((req, index) => {
                  const hasUrl = getPlatformUrl(req);
                  const isYouTube = selectedPlatform === "youtube";

                  return (
                    <div
                      key={req.id}
                      className="group p-4 rounded-2xl bg-[#12121a] border border-white/5 hover:border-white/10 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        {/* Queue Number */}
                        <div className="hidden sm:flex w-8 h-8 rounded-lg bg-white/5 items-center justify-center flex-shrink-0">
                          <span className="text-sm font-medium text-gray-500">
                            {index + 1}
                          </span>
                        </div>

                        {/* Thumbnail */}
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-white/5 flex-shrink-0">
                          {req.thumbnail ? (
                            <img
                              src={req.thumbnail}
                              alt={req.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Music size={24} className="text-gray-600" />
                            </div>
                          )}
                          {/* Play overlay */}
                          {hasUrl && (
                            <button
                              onClick={() => handleOpenVideo(req)}
                              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                            >
                              <Play
                                size={24}
                                className="text-white fill-white"
                              />
                            </button>
                          )}
                        </div>

                        {/* Song Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="font-semibold text-white truncate">
                                {req.title}
                              </h3>
                              <p className="text-sm text-gray-400 truncate">
                                {req.artist}
                              </p>
                            </div>

                            {/* Status Badge */}
                            <span
                              className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                req.status === "pending"
                                  ? "bg-yellow-500/10 text-yellow-400"
                                  : req.status === "approved"
                                  ? "bg-green-500/10 text-green-400"
                                  : req.status === "played"
                                  ? "bg-blue-500/10 text-blue-400"
                                  : "bg-red-500/10 text-red-400"
                              }`}
                            >
                              {req.status === "pending"
                                ? "Waiting"
                                : req.status === "approved"
                                ? "Up Next"
                                : req.status === "played"
                                ? "Played"
                                : req.status}
                            </span>
                          </div>

                          {/* Meta Row */}
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            {/* Tags */}
                            <div className="flex items-center gap-1.5">
                              {req.genre && req.genre !== "Unknown" && (
                                <span className="px-2 py-0.5 rounded-md text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                  {req.genre}
                                </span>
                              )}
                              {req.explicit && req.explicit !== "Unknown" && (
                                <span
                                  className={`px-2 py-0.5 rounded-md text-xs border ${
                                    req.explicit === "Explicit"
                                      ? "bg-red-500/10 text-red-400 border-red-500/20"
                                      : "bg-green-500/10 text-green-400 border-green-500/20"
                                  }`}
                                >
                                  {req.explicit === "Explicit" ? "E" : "Clean"}
                                </span>
                              )}
                            </div>

                            <span className="text-gray-600">•</span>

                            {/* Requester & Time */}
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <User size={12} />
                              <span className="truncate max-w-[100px]">
                                {req.requestedBy}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock size={12} />
                              <span>{timeAgo(req.requestedAt)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Preview Button */}
                          {hasUrl && (
                            <button
                              onClick={() => handleOpenVideo(req)}
                              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
                              title={`Preview on ${currentPlatform.name}`}
                            >
                              <ExternalLink
                                size={16}
                                className="text-gray-400"
                              />
                            </button>
                          )}

                          {/* Status Actions */}
                          {req.status === "pending" && (
                            <>
                              <button
                                onClick={() => updateStatus(req.id, "approved")}
                                className="p-2.5 rounded-xl bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 transition-all"
                                title="Add to Queue"
                              >
                                <Check size={16} className="text-green-400" />
                              </button>
                              <button
                                onClick={() => deleteRequest(req.id)}
                                className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all"
                                title="Reject"
                              >
                                <X size={16} className="text-red-400" />
                              </button>
                            </>
                          )}

                          {req.status === "approved" && (
                            <>
                              <button
                                onClick={() => updateStatus(req.id, "played")}
                                className="px-4 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-all flex items-center gap-2"
                                title="Mark as Played"
                              >
                                <SkipForward size={16} className="text-blue-400" />
                                <span className="text-sm font-medium text-blue-400 hidden sm:inline">
                                  Played
                                </span>
                              </button>
                              <button
                                onClick={() => deleteRequest(req.id)}
                                className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/10 transition-all"
                                title="Remove"
                              >
                                <Trash2 size={16} className="text-gray-500 hover:text-red-400" />
                              </button>
                            </>
                          )}

                          {req.status === "played" && (
                            <button
                              onClick={() => deleteRequest(req.id)}
                              className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/10 transition-all"
                              title="Remove"
                            >
                              <Trash2 size={16} className="text-gray-500 hover:text-red-400" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-white/5 text-center">
          <p className="text-xs text-gray-600">
            TextMyTrack • Built for DJs who take requests
          </p>
        </footer>
      </div>
    </main>
  );
}