"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabaseBrowserClient } from "../lib/supabaseClient";
import {
  Check,
  X,
  Music,
  LogOut,
  Phone,
  Trash2,
  Clock,
  User,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ListMusic,
  Disc3,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  Circle,
  SkipForward,
  Maximize2,
  Minimize2,
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

  // Video modal state
  const [videoModal, setVideoModal] = useState(null);
  const [currentPlayingRequest, setCurrentPlayingRequest] = useState(null);
  const [isMuted, setIsMuted] = useState(true);
  const [autoPlay, setAutoPlay] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

  // Refs for stable references
  const playerRef = useRef(null);
  const playerReady = useRef(false);
  const currentVideoId = useRef(null);
  const requestsRef = useRef(requests);
  const currentPlayingRequestRef = useRef(currentPlayingRequest);
  const autoPlayRef = useRef(autoPlay);
  const isMutedRef = useRef(isMuted);

  // Keep refs in sync
  useEffect(() => {
    requestsRef.current = requests;
  }, [requests]);

  useEffect(() => {
    currentPlayingRequestRef.current = currentPlayingRequest;
  }, [currentPlayingRequest]);

  useEffect(() => {
    autoPlayRef.current = autoPlay;
  }, [autoPlay]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

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

  // Get next song using ref to avoid dependency issues
  const getNextSongFromRef = useCallback(() => {
    const currentRequests = requestsRef.current;
    const currentPlaying = currentPlayingRequestRef.current;

    const pendingReqs = currentRequests.filter(
      (r) => r.status === "pending" || r.status === "approved"
    );

    if (!currentPlaying) return pendingReqs[0] || null;

    const currentIndex = pendingReqs.findIndex(
      (r) => r.id === currentPlaying.id
    );

    if (currentIndex === -1 || currentIndex >= pendingReqs.length - 1) {
      return pendingReqs.find((r) => r.id !== currentPlaying.id) || null;
    }

    return pendingReqs[currentIndex + 1] || null;
  }, []);

  // Update status function (stable reference)
  const updateStatusDirect = useCallback(async (id, status) => {
    try {
      const res = await fetch("/api/requests-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const result = await res.json();
      if (result.success) {
        setRequests((prev) =>
          prev.map((req) => (req.id === id ? { ...req, status } : req))
        );
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error updating status:", err);
      return false;
    }
  }, []);

  // Handle video end - uses refs to avoid stale closures
  const handleVideoEnd = useCallback(() => {
    const currentPlaying = currentPlayingRequestRef.current;
    if (!currentPlaying) return;

    // Mark current as played
    updateStatusDirect(currentPlaying.id, "played");

    if (autoPlayRef.current) {
      const nextSong = getNextSongFromRef();
      if (nextSong && nextSong.youtube_video_id) {
        setCurrentPlayingRequest(nextSong);
        setVideoModal(nextSong.youtube_video_id);
        currentVideoId.current = nextSong.youtube_video_id;
      } else {
        setVideoModal(null);
        setCurrentPlayingRequest(null);
        currentVideoId.current = null;
      }
    } else {
      setVideoModal(null);
      setCurrentPlayingRequest(null);
      currentVideoId.current = null;
    }
  }, [getNextSongFromRef, updateStatusDirect]);

  // Load YouTube IFrame API once
  useEffect(() => {
    if (typeof window !== "undefined" && !window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Initialize/update YouTube player - only when videoModal changes to a NEW video
  useEffect(() => {
    if (!videoModal) {
      playerReady.current = false;
      currentVideoId.current = null;
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {}
        playerRef.current = null;
      }
      return;
    }

    // Don't reinitialize if same video
    if (currentVideoId.current === videoModal && playerRef.current) {
      return;
    }

    currentVideoId.current = videoModal;

    const initPlayer = () => {
      // Destroy existing player if any
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {}
        playerRef.current = null;
      }

      const playerElement = document.getElementById("youtube-player");
      if (!playerElement) return;

      playerRef.current = new window.YT.Player("youtube-player", {
        videoId: videoModal,
        playerVars: {
          autoplay: 1,
          mute: isMutedRef.current ? 1 : 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: (event) => {
            playerReady.current = true;

            // Always autoplay muted (browser requirement)
            event.target.mute();
            event.target.playVideo();

            setIsPlaying(true);

            // After autoplay succeeds, THEN unmute if needed
            if (!isMutedRef.current) {
              setTimeout(() => {
                try {
                  event.target.unMute();
                } catch {}
              }, 300);
            }
          },
        },
      });
    };

    // Wait for YT API and DOM element
    const checkAndInit = () => {
      if (window.YT && window.YT.Player) {
        setTimeout(initPlayer, 100);
      } else {
        window.onYouTubeIframeAPIReady = () => {
          setTimeout(initPlayer, 100);
        };
      }
    };

    checkAndInit();
  }, [videoModal, handleVideoEnd]);

  // Update mute state on player
  useEffect(() => {
    if (playerRef.current && playerReady.current) {
      try {
        if (isMuted) {
          playerRef.current.mute();
        } else {
          playerRef.current.unMute();
        }
      } catch (e) {}
    }
  }, [isMuted]);

  // Play/Pause control
  const togglePlayPause = useCallback(() => {
    if (playerRef.current && playerReady.current) {
      try {
        if (isPlaying) {
          playerRef.current.pauseVideo();
        } else {
          playerRef.current.playVideo();
        }
      } catch (e) {}
    }
  }, [isPlaying]);

  function handleOpenVideo(request) {
    if (selectedPlatform === "youtube" && request.youtube_video_id) {
      // Only change if different video
      if (currentVideoId.current !== request.youtube_video_id) {
        setCurrentPlayingRequest(request);
        setVideoModal(request.youtube_video_id);
      }
      setIsMinimized(false);
    } else {
      const url = getPlatformUrl(request);
      if (url) window.open(url, "_blank");
    }
  }

  // Skip to next song manually
  function handleSkipToNext() {
    const currentPlaying = currentPlayingRequestRef.current;
    if (currentPlaying) {
      updateStatusDirect(currentPlaying.id, "played");
    }

    const nextSong = getNextSongFromRef();
    if (nextSong && nextSong.youtube_video_id) {
      setCurrentPlayingRequest(nextSong);
      setVideoModal(nextSong.youtube_video_id);
    } else {
      setVideoModal(null);
      setCurrentPlayingRequest(null);
    }
  }

  // Close modal without marking as played
  function handleCloseModal() {
    setVideoModal(null);
    setCurrentPlayingRequest(null);
    setIsMinimized(false);
    currentVideoId.current = null;
  }

  // Mark as played and close
  function handleMarkPlayedAndClose() {
    const currentPlaying = currentPlayingRequestRef.current;
    if (currentPlaying) {
      updateStatusDirect(currentPlaying.id, "played");
    }
    setVideoModal(null);
    setCurrentPlayingRequest(null);
    setIsMinimized(false);
    currentVideoId.current = null;
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
        () => {
          fetchRequests(user.id);
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user, supabase]);

  async function updateStatus(id, status) {
    const success = await updateStatusDirect(id, status);
    if (!success) {
      alert("Failed to update status. Please try again.");
    }
  }

  async function deleteRequest(id) {
    if (!confirm("Remove this request?")) return;
    try {
      const res = await fetch("/api/requests-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const result = await res.json();
      if (result.success) {
        setRequests((prev) => prev.filter((req) => req.id !== id));
      } else {
        alert("Failed to delete request");
      }
    } catch (err) {
      console.error("Error deleting request:", err);
      alert("Error deleting request. Please try again.");
    }
  }

  async function deleteAllFiltered() {
    const count = filteredRequests.length;
    if (
      !confirm(
        `Delete all ${count} ${
          filterStatus === "pending"
            ? "requests"
            : filterStatus === "played"
            ? "played songs"
            : "items"
        }? This cannot be undone.`
      )
    )
      return;

    try {
      const deletePromises = filteredRequests.map((req) =>
        fetch("/api/requests-delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: req.id }),
        })
      );

      await Promise.all(deletePromises);

      const deletedIds = new Set(filteredRequests.map((r) => r.id));
      setRequests((prev) => prev.filter((req) => !deletedIds.has(req.id)));
    } catch (err) {
      console.error("Error deleting requests:", err);
      alert("Error deleting some requests. Please refresh and try again.");
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

  const filteredRequests = requests.filter((req) => {
    if (filterStatus === "all") return true;
    if (filterStatus === "pending") {
      return req.status === "pending" || req.status === "approved";
    }
    return req.status === filterStatus;
  });

  const pendingRequests = requests.filter(
    (r) => r.status === "pending" || r.status === "approved"
  );

  const stats = {
    total: requests.length,
    requests: pendingRequests.length,
    played: requests.filter((r) => r.status === "played").length,
  };

  const currentPlatform = PLATFORMS[selectedPlatform];

  const nextSong = (() => {
    if (!currentPlayingRequest) return pendingRequests[0] || null;
    const currentIndex = pendingRequests.findIndex(
      (r) => r.id === currentPlayingRequest.id
    );
    if (currentIndex === -1 || currentIndex >= pendingRequests.length - 1) {
      return (
        pendingRequests.find((r) => r.id !== currentPlayingRequest.id) || null
      );
    }
    return pendingRequests[currentIndex + 1] || null;
  })();

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0a0a0f] via-[#0d0d14] to-[#0a0a0f] text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-pink-500/5 rounded-full blur-[100px]" />
      </div>

      {/* 
        PERSISTENT PLAYER SYSTEM
        The player container is ALWAYS in the same place in the DOM.
        We only change its visual presentation via CSS classes.
        This prevents the iframe from being destroyed when toggling modes.
      */}
      {videoModal && (
        <>
          {/* Backdrop - only visible when NOT minimized */}
          <div
            className={`fixed inset-0 bg-black/95 backdrop-blur-md z-40 transition-opacity duration-200 ${
              isMinimized
                ? "opacity-0 pointer-events-none"
                : "opacity-100 pointer-events-auto"
            }`}
            onClick={() => setIsMinimized(true)}
          />

          {/* 
            SINGLE PERSISTENT PLAYER WRAPPER
            This wrapper changes position/size but the player inside never remounts
          */}
          <div
            className={`fixed z-50 transition-all duration-300 ease-out ${
              isMinimized
                ? "bottom-0 left-0 right-0 top-auto p-0"
                : "inset-0 p-4 flex items-center justify-center"
            }`}
          >
            <div
              className={`bg-[#16161f] shadow-2xl border border-white/10 overflow-hidden transition-all duration-300 ${
                isMinimized
                  ? "w-full max-w-none rounded-t-xl rounded-b-none"
                  : "w-full max-w-4xl rounded-2xl"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Now Playing Header - only in full mode */}
              {!isMinimized && currentPlayingRequest && (
                <div className="p-4 border-b border-white/5 bg-[#12121a]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center flex-shrink-0">
                        <Play
                          size={18}
                          className="text-pink-400 fill-pink-400"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500 uppercase tracking-wider">
                          Now Playing
                        </p>
                        <h3 className="font-semibold text-white truncate">
                          {currentPlayingRequest.title}
                        </h3>
                        <p className="text-sm text-gray-400 truncate">
                          {currentPlayingRequest.artist}
                        </p>
                      </div>
                    </div>
                    {nextSong && (
                      <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
                        <span>Up next:</span>
                        <span className="text-gray-300 truncate max-w-[150px]">
                          {nextSong.title}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 
                THE ACTUAL YOUTUBE PLAYER
                This div NEVER gets removed from DOM - only resized via CSS
              */}
              <div
                className={`bg-black transition-all duration-300 ${
                  isMinimized ? "h-0 overflow-hidden" : "aspect-video"
                }`}
              >
                <div id="youtube-player" className="w-full h-full" />
              </div>

              {/* Full Controls - only in full mode */}
              {!isMinimized && (
                <div className="p-4 flex items-center justify-between border-t border-white/5 bg-[#12121a] flex-wrap gap-3">
                  <div className="flex items-center gap-2 sm:gap-4">
                    <button
                      onClick={togglePlayPause}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
                    >
                      {isPlaying ? (
                        <Pause size={18} className="text-white" />
                      ) : (
                        <Play size={18} className="text-white fill-white" />
                      )}
                    </button>

                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                        isMuted
                          ? "bg-white/5 text-gray-400 hover:bg-white/10"
                          : "bg-green-500/20 text-green-400 border border-green-500/30"
                      }`}
                    >
                      {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                      <span className="text-sm font-medium hidden sm:inline">
                        {isMuted ? "Muted" : "Sound On"}
                      </span>
                    </button>

                    <button
                      onClick={() => setAutoPlay(!autoPlay)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                        autoPlay
                          ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                          : "bg-white/5 text-gray-400 hover:bg-white/10"
                      }`}
                    >
                      <SkipForward size={18} />
                      <span className="text-sm font-medium hidden sm:inline">
                        {autoPlay ? "Auto-play" : "Manual"}
                      </span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {nextSong && (
                      <button
                        onClick={handleSkipToNext}
                        className="px-4 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 transition-all flex items-center gap-2"
                      >
                        <SkipForward size={16} />
                        <span className="text-sm font-medium hidden sm:inline">
                          Skip
                        </span>
                      </button>
                    )}

                    <button
                      onClick={handleMarkPlayedAndClose}
                      className="px-4 py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 transition-all flex items-center gap-2"
                    >
                      <Check size={16} />
                      <span className="text-sm font-medium hidden sm:inline">
                        Played
                      </span>
                    </button>

                    <button
                      onClick={() => setIsMinimized(true)}
                      className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all flex items-center gap-2"
                    >
                      <Minimize2 size={16} />
                      <span className="text-sm font-medium hidden sm:inline">
                        Minimize
                      </span>
                    </button>

                    <button
                      onClick={handleCloseModal}
                      className="px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all flex items-center gap-2"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Minimized Bar - only in minimized mode */}
              {isMinimized && currentPlayingRequest && (
                <div className="bg-[#12121a] border-t border-white/10">
                  <div className="max-w-6xl mx-auto px-4 py-3">
                    <div className="flex items-center gap-4">
                      {/* Thumbnail with playing indicator */}
                      <div
                        className="relative w-12 h-12 rounded-lg overflow-hidden bg-white/5 flex-shrink-0 cursor-pointer"
                        onClick={() => setIsMinimized(false)}
                      >
                        {currentPlayingRequest.thumbnail ? (
                          <img
                            src={currentPlayingRequest.thumbnail}
                            alt={currentPlayingRequest.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Music size={20} className="text-gray-600" />
                          </div>
                        )}
                        {/* Playing indicator overlay */}
                        <div className="absolute inset-0 bg-pink-500/40 flex items-center justify-center">
                          <div className="flex gap-0.5">
                            <div
                              className="w-0.5 h-3 bg-white rounded-full animate-pulse"
                              style={{ animationDelay: "0ms" }}
                            />
                            <div
                              className="w-0.5 h-3 bg-white rounded-full animate-pulse"
                              style={{ animationDelay: "150ms" }}
                            />
                            <div
                              className="w-0.5 h-3 bg-white rounded-full animate-pulse"
                              style={{ animationDelay: "300ms" }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Song Info */}
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => setIsMinimized(false)}
                      >
                        <h4 className="font-semibold text-white text-sm truncate">
                          {currentPlayingRequest.title}
                        </h4>
                        <p className="text-xs text-gray-400 truncate">
                          {currentPlayingRequest.artist}
                        </p>
                      </div>

                      {/* Mini Controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={togglePlayPause}
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
                          title={isPlaying ? "Pause" : "Play"}
                        >
                          {isPlaying ? (
                            <Pause size={18} className="text-white" />
                          ) : (
                            <Play size={18} className="text-white fill-white" />
                          )}
                        </button>

                        <button
                          onClick={() => setIsMuted(!isMuted)}
                          className={`p-2 rounded-lg transition-all ${
                            isMuted
                              ? "bg-white/5 text-gray-400 hover:bg-white/10"
                              : "bg-green-500/20 text-green-400"
                          }`}
                          title={isMuted ? "Unmute" : "Mute"}
                        >
                          {isMuted ? (
                            <VolumeX size={18} />
                          ) : (
                            <Volume2 size={18} />
                          )}
                        </button>

                        {nextSong && (
                          <button
                            onClick={handleSkipToNext}
                            className="p-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 transition-all"
                            title={`Skip to: ${nextSong.title}`}
                          >
                            <SkipForward size={18} />
                          </button>
                        )}

                        <button
                          onClick={handleMarkPlayedAndClose}
                          className="p-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-all"
                          title="Mark as Played & Close"
                        >
                          <Check size={18} />
                        </button>

                        <button
                          onClick={() => setIsMinimized(false)}
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all"
                          title="Expand Player"
                        >
                          <Maximize2 size={18} />
                        </button>

                        <button
                          onClick={handleCloseModal}
                          className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all"
                          title="Close Player"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Up Next Preview */}
                    {nextSong && (
                      <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-2 text-xs text-gray-500">
                        <span>Up next:</span>
                        <span className="text-gray-300 truncate">
                          {nextSong.title}
                        </span>
                        <span className="text-gray-600">by</span>
                        <span className="text-gray-400 truncate">
                          {nextSong.artist}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <div
        className={`relative max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 ${
          videoModal && isMinimized ? "pb-32" : ""
        }`}
      >
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
          {/* Sidebar */}
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
                  <span className="text-gray-400 text-sm">Total</span>
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
                    <span className="text-gray-400 text-sm">Requests</span>
                  </div>
                  <span className="text-yellow-400 font-semibold">
                    {stats.requests}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Circle
                      size={8}
                      className="fill-green-400 text-green-400"
                    />
                    <span className="text-gray-400 text-sm">Played</span>
                  </div>
                  <span className="text-green-400 font-semibold">
                    {stats.played}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Filter Tabs */}
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {[
                  {
                    key: "pending",
                    label: "Requests",
                    count: stats.requests,
                    color: "yellow",
                  },
                  {
                    key: "played",
                    label: "Played",
                    count: stats.played,
                    color: "green",
                  },
                  {
                    key: "all",
                    label: "All",
                    count: stats.total,
                    color: "gray",
                  },
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
                          : "bg-white/10 text-white border border-white/20"
                        : "bg-white/5 text-gray-400 border border-transparent hover:bg-white/10"
                    }`}
                  >
                    {tab.label}
                    <span
                      className={`px-2 py-0.5 rounded-md text-xs ${
                        filterStatus === tab.key ? "bg-white/20" : "bg-white/10"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {filteredRequests.length > 0 && (
                <button
                  onClick={deleteAllFiltered}
                  className="flex-shrink-0 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all text-sm font-medium flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  <span className="hidden sm:inline">Clear All</span>
                  <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-xs">
                    {filteredRequests.length}
                  </span>
                </button>
              )}
            </div>

            {/* Request List */}
            {loading ? (
              <div className="flex items-center justify-center py-32">
                <div className="w-12 h-12 border-3 border-white/10 border-t-pink-500 rounded-full animate-spin" />
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-20 px-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                  <ListMusic size={28} className="text-gray-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-400 mb-1">
                  {filterStatus === "pending"
                    ? "No requests yet"
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
                  const isPlayed = req.status === "played";
                  const isCurrentlyPlaying =
                    currentPlayingRequest?.id === req.id;

                  return (
                    <div
                      key={req.id}
                      className={`group p-4 rounded-2xl border transition-all ${
                        isCurrentlyPlaying
                          ? "bg-pink-500/10 border-pink-500/30"
                          : "bg-[#12121a] border-white/5 hover:border-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="hidden sm:flex w-8 h-8 rounded-lg bg-white/5 items-center justify-center flex-shrink-0">
                          <span className="text-sm font-medium text-gray-500">
                            {index + 1}
                          </span>
                        </div>

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
                          {hasUrl && !isCurrentlyPlaying && (
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
                          {isCurrentlyPlaying && (
                            <button
                              onClick={() => setIsMinimized(false)}
                              className="absolute inset-0 bg-pink-500/30 flex items-center justify-center"
                            >
                              <div className="flex gap-0.5">
                                <div
                                  className="w-1 h-4 bg-white rounded-full animate-pulse"
                                  style={{ animationDelay: "0ms" }}
                                />
                                <div
                                  className="w-1 h-4 bg-white rounded-full animate-pulse"
                                  style={{ animationDelay: "150ms" }}
                                />
                                <div
                                  className="w-1 h-4 bg-white rounded-full animate-pulse"
                                  style={{ animationDelay: "300ms" }}
                                />
                              </div>
                            </button>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1 overflow-hidden">
                              {hasUrl ? (
                                <button
                                  onClick={() => handleOpenVideo(req)}
                                  className="block w-full text-left group/title"
                                >
                                  <h3 className="font-semibold text-white truncate group-hover/title:text-pink-400 transition-colors">
                                    {req.title}
                                    <ExternalLink
                                      size={14}
                                      className="inline-block ml-2 opacity-0 group-hover/title:opacity-100 transition-opacity text-pink-400"
                                    />
                                  </h3>
                                </button>
                              ) : (
                                <h3 className="font-semibold text-white truncate">
                                  {req.title}
                                </h3>
                              )}
                              <p className="text-sm text-gray-400 truncate">
                                {req.artist}
                              </p>
                            </div>

                            <span
                              className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                isCurrentlyPlaying
                                  ? "bg-pink-500/20 text-pink-400"
                                  : isPlayed
                                  ? "bg-green-500/10 text-green-400"
                                  : "bg-yellow-500/10 text-yellow-400"
                              }`}
                            >
                              {isCurrentlyPlaying
                                ? "Playing"
                                : isPlayed
                                ? "Played"
                                : "Request"}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 mt-2 flex-wrap">
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
                                  {req.explicit === "Explicit"
                                    ? "Explicit"
                                    : "Clean"}
                                </span>
                              )}
                            </div>
                            <span className="text-gray-600">•</span>
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

                        <div className="flex items-center gap-2 flex-shrink-0">
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

                          {!isPlayed ? (
                            <>
                              <button
                                onClick={() => updateStatus(req.id, "played")}
                                className="p-2.5 rounded-xl bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 transition-all"
                                title="Mark as Played"
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
                          ) : (
                            <button
                              onClick={() => deleteRequest(req.id)}
                              className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/10 transition-all"
                              title="Remove"
                            >
                              <Trash2
                                size={16}
                                className="text-gray-500 hover:text-red-400"
                              />
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

        <footer className="mt-12 pt-6 border-t border-white/5 text-center">
          <p className="text-xs text-gray-600">
            TextMyTrack • Built for DJs who take requests
          </p>
        </footer>
      </div>
    </main>
  );
}