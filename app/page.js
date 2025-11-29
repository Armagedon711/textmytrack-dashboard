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
  CheckCircle2,
  Circle,
  SkipForward,
  Maximize2,
  Minimize2,
  ThumbsUp,
  Ban,
  History,
  Layers,
  ChevronDown,
  ChevronUp,
  Settings,
  Save,
  AlertCircle,
  Tag,
  Crown,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";

// Universal number for Trial and Pro plans
const UNIVERSAL_NUMBER = "(855) 710-5533";

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

// Tab configuration
const TABS = [
  {
    key: "pending",
    label: "Requests",
    shortLabel: "Requests",
    icon: Clock,
    color: "yellow",
    activeClass: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    dotClass: "fill-yellow-400 text-yellow-400",
  },
  {
    key: "approved",
    label: "Approved",
    shortLabel: "Approved",
    icon: ThumbsUp,
    color: "blue",
    activeClass: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    dotClass: "fill-blue-400 text-blue-400",
  },
  {
    key: "rejected",
    label: "Rejected",
    shortLabel: "Rejected",
    icon: Ban,
    color: "red",
    activeClass: "bg-red-500/20 text-red-400 border-red-500/30",
    dotClass: "fill-red-400 text-red-400",
  },
  {
    key: "played",
    label: "Played",
    shortLabel: "Played",
    icon: History,
    color: "green",
    activeClass: "bg-green-500/20 text-green-400 border-green-500/30",
    dotClass: "fill-green-400 text-green-400",
  },
  {
    key: "all",
    label: "All",
    shortLabel: "All",
    icon: Layers,
    color: "gray",
    activeClass: "bg-white/10 text-white border-white/20",
    dotClass: "fill-gray-400 text-gray-400",
  },
];

// Plan badge configuration
const PLAN_CONFIG = {
  trial: {
    label: "Trial",
    icon: Sparkles,
    bgColor: "bg-gray-500/20",
    textColor: "text-gray-400",
    borderColor: "border-gray-500/30",
  },
  pro: {
    label: "Pro",
    icon: CheckCircle2,
    bgColor: "bg-blue-500/20",
    textColor: "text-blue-400",
    borderColor: "border-blue-500/30",
  },
  headliner: {
    label: "Headliner",
    icon: Crown,
    bgColor: "bg-gradient-to-r from-yellow-500/20 to-orange-500/20",
    textColor: "text-yellow-400",
    borderColor: "border-yellow-500/30",
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

  // Settings modal state
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTag, setSettingsTag] = useState("");
  const [tagError, setTagError] = useState("");
  const [tagSuccess, setTagSuccess] = useState("");
  const [savingTag, setSavingTag] = useState(false);

  // Video modal state
  const [videoModal, setVideoModal] = useState(null);
  const [currentPlayingRequest, setCurrentPlayingRequest] = useState(null);
  const [isMuted, setIsMuted] = useState(true);
  const [autoPlay, setAutoPlay] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackTab, setPlaybackTab] = useState(null);

  // Mobile expandable sections
  const [showMobileStats, setShowMobileStats] = useState(false);
  const [showMobilePlatforms, setShowMobilePlatforms] = useState(false);

  // Refs for stable references - CRITICAL for avoiding stale closures
  const playerRef = useRef(null);
  const playerReady = useRef(false);
  const currentVideoId = useRef(null);
  const requestsRef = useRef(requests);
  const currentPlayingRequestRef = useRef(currentPlayingRequest);
  const autoPlayRef = useRef(autoPlay);
  const isMutedRef = useRef(isMuted);
  const playbackTabRef = useRef(playbackTab);
  const handleVideoEndRef = useRef(null);
  const isTransitioning = useRef(false);

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

  useEffect(() => {
    playbackTabRef.current = playbackTab;
  }, [playbackTab]);

  // Initialize settings tag when profile loads
  useEffect(() => {
    if (djProfile?.tag) {
      setSettingsTag(djProfile.tag);
    }
  }, [djProfile]);

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

  const getRequestsForTab = useCallback((tab, allRequests) => {
    if (tab === "all") return allRequests;
    if (tab === "pending") {
      return allRequests.filter((r) => r.status === "pending");
    }
    return allRequests.filter((r) => r.status === tab);
  }, []);

  const getNextSongFromRef = useCallback(() => {
    const currentRequests = requestsRef.current;
    const currentPlaying = currentPlayingRequestRef.current;
    const currentPlaybackTab = playbackTabRef.current;

    if (!currentPlaybackTab) return null;

    const tabRequests = getRequestsForTab(currentPlaybackTab, currentRequests);
    const playableRequests = tabRequests.filter((r) => r.youtube_video_id);

    if (!currentPlaying) return playableRequests[0] || null;

    const currentIndex = playableRequests.findIndex(
      (r) => r.id === currentPlaying.id
    );

    if (currentIndex === -1 || currentIndex >= playableRequests.length - 1) {
      return playableRequests.find((r) => r.id !== currentPlaying.id) || null;
    }

    return playableRequests[currentIndex + 1] || null;
  }, [getRequestsForTab]);

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

  // Play next song - this is the core function for autoplay
  const playNextSong = useCallback(() => {
    // Prevent multiple rapid calls
    if (isTransitioning.current) return;
    isTransitioning.current = true;

    const currentPlaying = currentPlayingRequestRef.current;
    
    // Mark current as played
    if (currentPlaying) {
      updateStatusDirect(currentPlaying.id, "played");
    }

    if (autoPlayRef.current) {
      const nextSong = getNextSongFromRef();
      if (nextSong && nextSong.youtube_video_id) {
        // Small delay to ensure state updates properly
        setTimeout(() => {
          setCurrentPlayingRequest(nextSong);
          setVideoModal(nextSong.youtube_video_id);
          isTransitioning.current = false;
        }, 100);
      } else {
        setVideoModal(null);
        setCurrentPlayingRequest(null);
        setPlaybackTab(null);
        currentVideoId.current = null;
        isTransitioning.current = false;
      }
    } else {
      setVideoModal(null);
      setCurrentPlayingRequest(null);
      setPlaybackTab(null);
      currentVideoId.current = null;
      isTransitioning.current = false;
    }
  }, [getNextSongFromRef, updateStatusDirect]);

  // Keep handleVideoEndRef updated with latest playNextSong
  useEffect(() => {
    handleVideoEndRef.current = playNextSong;
  }, [playNextSong]);

  // Load YouTube IFrame API
  useEffect(() => {
    if (typeof window !== "undefined" && !window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // YouTube Player Hook - FIXED: Handle player reuse correctly
  useEffect(() => {
    // Cleanup when modal closes
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

    // Skip if same video already playing
    if (currentVideoId.current === videoModal && playerRef.current && playerReady.current) {
      return;
    }

    // If player already exists and is ready, just load the new video
    if (playerRef.current && playerReady.current) {
      currentVideoId.current = videoModal;
      try {
        playerRef.current.loadVideoById({
          videoId: videoModal,
          startSeconds: 0,
        });
        
        const forcePlay = (attempts = 0) => {
          if (attempts > 5 || !playerRef.current || currentVideoId.current !== videoModal) return;
          try {
            const state = playerRef.current.getPlayerState();
            if (state !== 1 && state !== 3) {
              playerRef.current.playVideo();
            }
          } catch (e) {}
          setTimeout(() => forcePlay(attempts + 1), 200 * (attempts + 1));
        };
        
        setTimeout(() => forcePlay(0), 100);
        setIsPlaying(true);
      } catch (e) {
        console.error("Error loading video:", e);
        playerReady.current = false;
      }
      return;
    }

    let timeoutId;
    let isCancelled = false;

    const initPlayer = () => {
      if (isCancelled) return;

      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {}
        playerRef.current = null;
        playerReady.current = false;
      }

      const container = document.getElementById("youtube-player");
      if (!container) {
        timeoutId = setTimeout(initPlayer, 100);
        return;
      }

      currentVideoId.current = videoModal;

      playerRef.current = new window.YT.Player("youtube-player", {
        videoId: videoModal,
        playerVars: {
          autoplay: 1,
          mute: 1,
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          fs: 1,
          controls: 1,
          origin: typeof window !== "undefined" ? window.location.origin : undefined,
        },
        events: {
          onReady: (event) => {
            if (isCancelled) return;
            playerReady.current = true;
            
            try {
              event.target.mute();
              event.target.playVideo();
            } catch (e) {
              console.error("Error starting playback:", e);
            }
            setIsPlaying(true);

            if (!isMutedRef.current) {
              setTimeout(() => {
                if (isCancelled) return;
                try {
                  event.target.unMute();
                } catch (e) {}
              }, 500);
            }
          },

          onStateChange: (event) => {
            if (event.data === 0) {
              console.log("Video ended - triggering next song");
              if (handleVideoEndRef.current) {
                handleVideoEndRef.current();
              }
            } else if (event.data === 1) {
              setIsPlaying(true);
            } else if (event.data === 2) {
              setIsPlaying(false);
            } else if (event.data === -1) {
              try {
                event.target.playVideo();
              } catch (e) {}
            }
          },

          onError: (event) => {
            if (isCancelled) return;
            console.error("YouTube player error:", event.data);
            setTimeout(() => {
              if (!isCancelled && handleVideoEndRef.current) {
                handleVideoEndRef.current();
              }
            }, 1000);
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      timeoutId = setTimeout(initPlayer, 100);
    } else {
      window.onYouTubeIframeAPIReady = () => {
        if (!isCancelled) {
          timeoutId = setTimeout(initPlayer, 100);
        }
      };
    }

    return () => {
      isCancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [videoModal]);

  // Update mute state
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

  function handleOpenVideo(request, fromTab) {
    if (selectedPlatform === "youtube" && request.youtube_video_id) {
      if (currentVideoId.current !== request.youtube_video_id) {
        setCurrentPlayingRequest(request);
        setVideoModal(request.youtube_video_id);
        setPlaybackTab(fromTab);
      }
      setIsMinimized(false);
    } else {
      const url = getPlatformUrl(request);
      if (url) window.open(url, "_blank");
    }
  }

  function handleSkipToNext() {
    playNextSong();
  }

  function handleCloseModal() {
    setVideoModal(null);
    setCurrentPlayingRequest(null);
    setIsMinimized(false);
    setPlaybackTab(null);
    currentVideoId.current = null;
    isTransitioning.current = false;
  }

  function handleApproveAndContinue() {
    const currentPlaying = currentPlayingRequestRef.current;
    if (currentPlaying) {
      updateStatusDirect(currentPlaying.id, "approved");
    }

    if (autoPlayRef.current) {
      const nextSong = getNextSongFromRef();
      if (nextSong && nextSong.youtube_video_id) {
        setTimeout(() => {
          setCurrentPlayingRequest(nextSong);
          setVideoModal(nextSong.youtube_video_id);
        }, 100);
      } else {
        handleCloseModal();
      }
    } else {
      handleCloseModal();
    }
  }

  function handleMarkPlayedAndClose() {
    const currentPlaying = currentPlayingRequestRef.current;
    if (currentPlaying) {
      updateStatusDirect(currentPlaying.id, "played");
    }
    handleCloseModal();
  }

  // Save tag function
  async function handleSaveTag() {
    setTagError("");
    setTagSuccess("");
    
    if (!settingsTag.trim()) {
      setTagError("Tag cannot be empty");
      return;
    }

    // Basic validation - alphanumeric and spaces only, 2-30 chars
    const tagRegex = /^[a-zA-Z0-9\s]{2,30}$/;
    if (!tagRegex.test(settingsTag.trim())) {
      setTagError("Tag must be 2-30 characters, letters, numbers, and spaces only");
      return;
    }

    setSavingTag(true);

    try {
      const res = await fetch("/api/dj-tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          dj_id: user.id, 
          tag: settingsTag.trim() 
        }),
      });

      const result = await res.json();

      if (result.success) {
        setTagSuccess("Tag updated successfully!");
        setDjProfile(prev => ({ ...prev, tag: settingsTag.trim() }));
        setTimeout(() => setTagSuccess(""), 3000);
      } else {
        setTagError(result.error || "Failed to update tag");
      }
    } catch (err) {
      console.error("Error saving tag:", err);
      setTagError("Error saving tag. Please try again.");
    } finally {
      setSavingTag(false);
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
    const tabLabel = TABS.find((t) => t.key === filterStatus)?.label || filterStatus;

    if (!confirm(`Delete all ${count} ${tabLabel.toLowerCase()} items? This cannot be undone.`)) return;

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

  // Get request line display based on plan
  function getRequestLineDisplay() {
    if (!djProfile) return { type: "loading", text: "Loading..." };
    
    const plan = djProfile.plan?.toLowerCase() || "trial";
    
    if (plan === "headliner" && djProfile.twilio_number) {
      return {
        type: "dedicated",
        label: "Dedicated Line",
        text: formatPhoneNumber(djProfile.twilio_number),
      };
    } else {
      // Trial or Pro - use universal number with tag
      const tag = djProfile.tag || "DJ";
      return {
        type: "shared",
        label: "Request Line",
        text: `Text "${tag}" to ${UNIVERSAL_NUMBER}`,
        tag: tag,
      };
    }
  }

  const filteredRequests = requests.filter((req) => {
    if (filterStatus === "all") return true;
    if (filterStatus === "pending") {
      return req.status === "pending";
    }
    return req.status === filterStatus;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
    played: requests.filter((r) => r.status === "played").length,
  };

  const currentPlatform = PLATFORMS[selectedPlatform];
  const requestLineInfo = getRequestLineDisplay();
  const currentPlan = PLAN_CONFIG[djProfile?.plan?.toLowerCase()] || PLAN_CONFIG.trial;

  // Calculate next song for UI display
  const nextSong = (() => {
    if (!playbackTab || !currentPlayingRequest) return null;

    const tabRequests = getRequestsForTab(playbackTab, requests).filter(
      (r) => r.youtube_video_id
    );

    const currentIndex = tabRequests.findIndex(
      (r) => r.id === currentPlayingRequest.id
    );

    if (currentIndex === -1 || currentIndex >= tabRequests.length - 1) {
      return tabRequests.find((r) => r.id !== currentPlayingRequest.id) || null;
    }

    return tabRequests[currentIndex + 1] || null;
  })();

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0a0a0f] via-[#0d0d14] to-[#0a0a0f] text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-pink-500/5 rounded-full blur-[100px]" />
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <>
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={() => setShowSettings(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="w-full max-w-md bg-[#16161f] rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-6 border-b border-white/5 bg-[#12121a]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                      <Settings size={20} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">Settings</h2>
                      <p className="text-xs text-gray-500">Manage your DJ profile</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowSettings(false)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
                  >
                    <X size={18} className="text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-4 sm:p-6 space-y-6">
                {/* Plan Badge */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${currentPlan.bgColor} ${currentPlan.borderColor} border`}>
                      <currentPlan.icon size={18} className={currentPlan.textColor} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Current Plan</p>
                      <p className={`font-semibold ${currentPlan.textColor}`}>{currentPlan.label}</p>
                    </div>
                  </div>
                  {djProfile?.plan?.toLowerCase() !== "headliner" && (
                    <button className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-medium hover:brightness-110 transition-all">
                      Upgrade
                    </button>
                  )}
                </div>

                {/* Tag Setting - Only for Trial/Pro */}
                {djProfile?.plan?.toLowerCase() !== "headliner" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Tag size={16} className="text-gray-400" />
                      <label className="text-sm font-medium text-gray-300">Your DJ Tag</label>
                    </div>
                    <p className="text-xs text-gray-500">
                      This is how guests will request songs from you. They'll text your tag to the universal number.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={settingsTag}
                        onChange={(e) => {
                          setSettingsTag(e.target.value);
                          setTagError("");
                          setTagSuccess("");
                        }}
                        placeholder="e.g., DJ Joey"
                        className="flex-1 px-4 py-3 rounded-lg bg-[#1b1b2e] border border-[#2a2a40] text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 transition-all"
                        maxLength={30}
                      />
                      <button
                        onClick={handleSaveTag}
                        disabled={savingTag || settingsTag === djProfile?.tag}
                        className={`px-4 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                          savingTag || settingsTag === djProfile?.tag
                            ? "bg-white/5 text-gray-500 cursor-not-allowed"
                            : "bg-pink-500 hover:bg-pink-600 text-white"
                        }`}
                      >
                        <Save size={16} />
                        {savingTag ? "..." : "Save"}
                      </button>
                    </div>
                    
                    {/* Tag Preview */}
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <p className="text-xs text-blue-400 mb-1">Preview:</p>
                      <p className="text-sm text-white">
                        Text "<span className="font-semibold text-pink-400">{settingsTag || "DJ"}</span>" to {UNIVERSAL_NUMBER}
                      </p>
                    </div>

                    {/* Error/Success Messages */}
                    {tagError && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                        <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
                        <p className="text-sm text-red-400">{tagError}</p>
                      </div>
                    )}
                    {tagSuccess && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                        <CheckCircle2 size={16} className="text-green-400 flex-shrink-0" />
                        <p className="text-sm text-green-400">{tagSuccess}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Headliner dedicated number info */}
                {djProfile?.plan?.toLowerCase() === "headliner" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Phone size={16} className="text-yellow-400" />
                      <label className="text-sm font-medium text-gray-300">Your Dedicated Line</label>
                    </div>
                    <div className="p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
                      <p className="text-2xl font-bold text-white">
                        {formatPhoneNumber(djProfile.twilio_number)}
                      </p>
                      <p className="text-xs text-yellow-400 mt-1">
                        Guests text this number directly to request songs
                      </p>
                    </div>
                  </div>
                )}

                {/* Email (read-only) */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Email</label>
                  <div className="px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-gray-400">
                    {user?.email || "Not available"}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-6 border-t border-white/5 bg-[#12121a]">
                <button
                  onClick={() => setShowSettings(false)}
                  className="w-full py-3 rounded-lg bg-white/5 hover:bg-white/10 text-white font-medium transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* PERSISTENT PLAYER SYSTEM */}
      {videoModal && (
        <>
          <div
            className={`fixed inset-0 bg-black/95 backdrop-blur-md z-40 transition-opacity duration-200 ${
              isMinimized ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto"
            }`}
            onClick={() => setIsMinimized(true)}
          />

          <div
            className={`fixed z-50 transition-all duration-300 ease-out ${
              isMinimized
                ? "bottom-0 left-0 right-0 top-auto p-0"
                : "inset-0 p-2 sm:p-4 flex items-center justify-center"
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
              {/* Full Mode Header */}
              {!isMinimized && currentPlayingRequest && (
                <div className="p-3 sm:p-4 border-b border-white/5 bg-[#12121a]">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-pink-500/20 flex items-center justify-center flex-shrink-0">
                        <Play size={16} className="text-pink-400 fill-pink-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider">Now Playing</p>
                          {playbackTab && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${TABS.find((t) => t.key === playbackTab)?.activeClass || "bg-white/10"}`}>
                              {TABS.find((t) => t.key === playbackTab)?.label}
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-white text-sm sm:text-base truncate">{currentPlayingRequest.title}</h3>
                        <p className="text-xs sm:text-sm text-gray-400 truncate">{currentPlayingRequest.artist}</p>
                      </div>
                    </div>
                    {nextSong && (
                      <div className="hidden md:flex items-center gap-2 text-sm text-gray-500 flex-shrink-0">
                        <span>Up next:</span>
                        <span className="text-gray-300 truncate max-w-[150px]">{nextSong.title}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* YouTube Player */}
              <div className={`bg-black transition-all duration-300 ${isMinimized ? "h-px opacity-0 pointer-events-none" : "aspect-video"}`}>
                <div id="youtube-player" className="w-full h-full" />
              </div>

              {/* Full Mode Controls */}
              {!isMinimized && (
                <div className="p-2 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-t border-white/5 bg-[#12121a] gap-2 sm:gap-3">
                  <div className="flex items-center justify-center sm:justify-start gap-1 sm:gap-2">
                    <button onClick={togglePlayPause} className="p-2 sm:px-4 sm:py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
                      {isPlaying ? <Pause size={18} className="text-white" /> : <Play size={18} className="text-white fill-white" />}
                    </button>
                    <button onClick={() => setIsMuted(!isMuted)} className={`p-2 sm:px-4 sm:py-2 rounded-lg transition-all ${isMuted ? "bg-white/5 text-gray-400 hover:bg-white/10" : "bg-green-500/20 text-green-400 border border-green-500/30"}`}>
                      {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                    <button onClick={() => setAutoPlay(!autoPlay)} className={`p-2 sm:px-4 sm:py-2 rounded-lg transition-all ${autoPlay ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-white/5 text-gray-400 hover:bg-white/10"}`} title={autoPlay ? "Auto-play ON" : "Auto-play OFF"}>
                      <SkipForward size={18} />
                    </button>
                  </div>
                  <div className="flex items-center justify-center sm:justify-end gap-1 sm:gap-2">
                    {nextSong && (
                      <button onClick={handleSkipToNext} className="p-2 sm:px-3 sm:py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 transition-all" title="Skip to next">
                        <SkipForward size={16} />
                      </button>
                    )}
                    <button onClick={handleApproveAndContinue} className="p-2 sm:px-3 sm:py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 transition-all" title="Approve">
                      <ThumbsUp size={16} />
                    </button>
                    <button onClick={handleMarkPlayedAndClose} className="p-2 sm:px-3 sm:py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 transition-all" title="Mark as Played">
                      <Check size={16} />
                    </button>
                    <button onClick={() => setIsMinimized(true)} className="p-2 sm:px-3 sm:py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all" title="Minimize">
                      <Minimize2 size={16} />
                    </button>
                    <button onClick={handleCloseModal} className="p-2 sm:px-3 sm:py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all" title="Close">
                      <X size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Minimized Bar */}
              {isMinimized && currentPlayingRequest && (
                <div className="bg-[#12121a] border-t border-white/10">
                  <div className="max-w-6xl mx-auto px-3 py-2 sm:px-4 sm:py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-white/5 flex-shrink-0 cursor-pointer" onClick={() => setIsMinimized(false)}>
                        {currentPlayingRequest.thumbnail ? (
                          <img src={currentPlayingRequest.thumbnail} alt={currentPlayingRequest.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Music size={18} className="text-gray-600" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-pink-500/40 flex items-center justify-center">
                          <div className="flex gap-0.5">
                            {[0, 150, 300].map((delay) => (
                              <div key={delay} className="w-0.5 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: `${delay}ms` }} />
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setIsMinimized(false)}>
                        <h4 className="font-semibold text-white text-sm truncate">{currentPlayingRequest.title}</h4>
                        <p className="text-xs text-gray-400 truncate">{currentPlayingRequest.artist}</p>
                      </div>

                      <div className="flex items-center gap-1 sm:gap-2">
                        <button onClick={togglePlayPause} className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
                          {isPlaying ? <Pause size={16} className="text-white" /> : <Play size={16} className="text-white fill-white" />}
                        </button>
                        <button onClick={() => setIsMuted(!isMuted)} className={`p-1.5 sm:p-2 rounded-lg transition-all ${isMuted ? "bg-white/5 text-gray-400" : "bg-green-500/20 text-green-400"}`}>
                          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                        </button>
                        {nextSong && (
                          <button onClick={handleSkipToNext} className="p-1.5 sm:p-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 transition-all" title={`Skip to: ${nextSong.title}`}>
                            <SkipForward size={16} />
                          </button>
                        )}
                        <button onClick={() => setIsMinimized(false)} className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all">
                          <Maximize2 size={16} />
                        </button>
                        <button onClick={handleCloseModal} className="p-1.5 sm:p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all">
                          <X size={16} />
                        </button>
                      </div>
                    </div>

                    {nextSong && (
                      <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-2 text-xs text-gray-500">
                        <span>Up next:</span>
                        <span className="text-gray-300 truncate">{nextSong.title}</span>
                        <span className="text-gray-600">by</span>
                        <span className="text-gray-400 truncate">{nextSong.artist}</span>
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
      <div className={`relative max-w-7xl mx-auto p-3 sm:p-6 lg:p-8 ${videoModal && isMinimized ? "pb-28 sm:pb-36" : ""}`}>
        {/* Header */}
        <header className="flex items-center justify-between mb-4 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Disc3 size={20} className="text-white sm:hidden" />
              <Disc3 size={24} className="text-white hidden sm:block" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">TextMyTrack</h1>
              <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">DJ Request Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Settings Button */}
            <button 
              onClick={() => setShowSettings(true)} 
              className="p-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-sm font-medium text-gray-300 flex items-center gap-2"
            >
              <Settings size={16} />
              <span className="hidden sm:inline">Settings</span>
            </button>
            <button onClick={handleLogout} className="p-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-sm font-medium text-gray-300 flex items-center gap-2">
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Mobile Info Cards */}
        <div className="lg:hidden space-y-3 mb-4">
          {/* DJ Info Banner - Updated for plan-based display */}
          <div className="p-3 rounded-xl bg-[#12121a] border border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Phone size={16} className={requestLineInfo.type === "dedicated" ? "text-yellow-400" : "text-blue-400"} />
                {requestLineInfo.type === "loading" ? (
                  <span className="text-sm text-gray-500">Loading...</span>
                ) : requestLineInfo.type === "dedicated" ? (
                  <>
                    <span className="text-xs text-gray-500">Your Line:</span>
                    <span className="text-sm font-semibold text-white">{requestLineInfo.text}</span>
                  </>
                ) : (
                  <span className="text-xs sm:text-sm text-gray-300 truncate">
                    Text "<span className="font-semibold text-pink-400">{requestLineInfo.tag}</span>" to {UNIVERSAL_NUMBER}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${currentPlan.bgColor} ${currentPlan.textColor} ${currentPlan.borderColor} border`}>
                  {currentPlan.label}
                </span>
                <span className="text-xs text-green-400 font-medium">● Live</span>
              </div>
            </div>
          </div>

          {/* Mobile Stats - Collapsible */}
          <div className="rounded-xl bg-[#12121a] border border-white/5 overflow-hidden">
            <button onClick={() => setShowMobileStats(!showMobileStats)} className="w-full p-3 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-300">Tonight's Stats</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-yellow-400">{stats.pending}</span>
                  <span className="text-gray-600">/</span>
                  <span className="text-blue-400">{stats.approved}</span>
                  <span className="text-gray-600">/</span>
                  <span className="text-green-400">{stats.played}</span>
                </div>
                {showMobileStats ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </div>
            </button>
            {showMobileStats && (
              <div className="px-3 pb-3 pt-0 border-t border-white/5">
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                    <div className="flex items-center gap-2">
                      <Circle size={8} className="fill-yellow-400 text-yellow-400" />
                      <span className="text-xs text-gray-400">Pending</span>
                    </div>
                    <span className="text-sm font-semibold text-yellow-400">{stats.pending}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                    <div className="flex items-center gap-2">
                      <Circle size={8} className="fill-blue-400 text-blue-400" />
                      <span className="text-xs text-gray-400">Approved</span>
                    </div>
                    <span className="text-sm font-semibold text-blue-400">{stats.approved}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                    <div className="flex items-center gap-2">
                      <Circle size={8} className="fill-red-400 text-red-400" />
                      <span className="text-xs text-gray-400">Rejected</span>
                    </div>
                    <span className="text-sm font-semibold text-red-400">{stats.rejected}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                    <div className="flex items-center gap-2">
                      <Circle size={8} className="fill-green-400 text-green-400" />
                      <span className="text-xs text-gray-400">Played</span>
                    </div>
                    <span className="text-sm font-semibold text-green-400">{stats.played}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Platform Selector - Collapsible */}
          <div className="rounded-xl bg-[#12121a] border border-white/5 overflow-hidden">
            <button onClick={() => setShowMobilePlatforms(!showMobilePlatforms)} className="w-full p-3 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-300">Open Songs In</span>
              <div className="flex items-center gap-2">
                <span className="text-xl">{currentPlatform.icon}</span>
                <span className={`text-sm ${currentPlatform.textColor}`}>{currentPlatform.name}</span>
                {showMobilePlatforms ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </div>
            </button>
            {showMobilePlatforms && (
              <div className="px-3 pb-3 pt-0 border-t border-white/5">
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {Object.entries(PLATFORMS).map(([key, platform]) => (
                    <button
                      key={key}
                      onClick={() => {
                        updatePlatformPreference(key);
                        setShowMobilePlatforms(false);
                      }}
                      className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                        selectedPlatform === key
                          ? `${platform.bgColor} ${platform.borderColor} border`
                          : "bg-white/5 border border-transparent"
                      }`}
                    >
                      <span className="text-lg">{platform.icon}</span>
                      <span className={`text-xs font-medium ${selectedPlatform === key ? platform.textColor : "text-gray-300"}`}>{platform.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Sidebar - Desktop Only */}
          <div className="hidden lg:block lg:col-span-1 space-y-6">
            {/* Request Line Card - Updated for plan-based display */}
            <div className="p-5 rounded-2xl bg-[#12121a] border border-white/5">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  requestLineInfo.type === "dedicated" 
                    ? "bg-gradient-to-br from-yellow-500 to-orange-500" 
                    : "bg-gradient-to-br from-blue-500 to-cyan-500"
                }`}>
                  <Phone size={18} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                      {requestLineInfo.label}
                    </p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${currentPlan.bgColor} ${currentPlan.textColor} ${currentPlan.borderColor} border`}>
                      {currentPlan.label}
                    </span>
                  </div>
                  {requestLineInfo.type === "loading" ? (
                    <p className="text-sm text-gray-500">Loading...</p>
                  ) : requestLineInfo.type === "dedicated" ? (
                    <p className="text-lg font-bold text-white">{requestLineInfo.text}</p>
                  ) : (
                    <div className="mt-1">
                      <p className="text-sm text-gray-300">
                        Text "<span className="font-bold text-pink-400">{requestLineInfo.tag}</span>"
                      </p>
                      <p className="text-sm text-gray-300">to <span className="font-semibold text-white">{UNIVERSAL_NUMBER}</span></p>
                    </div>
                  )}
                </div>
              </div>
              <div className="px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                <span className="text-xs text-green-400 font-medium">● Accepting Requests</span>
              </div>
              {profileError && (
                <p className="text-sm text-red-400 mt-2">{profileError}</p>
              )}
            </div>

            <div className="p-5 rounded-2xl bg-[#12121a] border border-white/5">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">Open Songs In</p>
              <div className="space-y-2">
                {Object.entries(PLATFORMS).map(([key, platform]) => (
                  <button key={key} onClick={() => updatePlatformPreference(key)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${selectedPlatform === key ? `${platform.bgColor} ${platform.borderColor} border-2` : "bg-white/5 border border-transparent hover:bg-white/10"}`}>
                    <span className="text-xl">{platform.icon}</span>
                    <span className={`font-medium ${selectedPlatform === key ? platform.textColor : "text-gray-300"}`}>{platform.name}</span>
                    {selectedPlatform === key && <CheckCircle2 size={16} className={`ml-auto ${platform.textColor}`} />}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#12121a] border border-white/5">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-4">Tonight's Stats</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Total</span>
                  <span className="text-white font-bold text-lg">{stats.total}</span>
                </div>
                <div className="h-px bg-white/5" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Circle size={8} className="fill-yellow-400 text-yellow-400" />
                    <span className="text-gray-400 text-sm">Pending</span>
                  </div>
                  <span className="text-yellow-400 font-semibold">{stats.pending}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Circle size={8} className="fill-blue-400 text-blue-400" />
                    <span className="text-gray-400 text-sm">Approved</span>
                  </div>
                  <span className="text-blue-400 font-semibold">{stats.approved}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Circle size={8} className="fill-red-400 text-red-400" />
                    <span className="text-gray-400 text-sm">Rejected</span>
                  </div>
                  <span className="text-red-400 font-semibold">{stats.rejected}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Circle size={8} className="fill-green-400 text-green-400" />
                    <span className="text-gray-400 text-sm">Played</span>
                  </div>
                  <span className="text-green-400 font-semibold">{stats.played}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Tab Navigation */}
            <div className="mb-4 sm:mb-6">
              {/* Desktop Tabs */}
              <div className="hidden sm:flex items-center gap-2 flex-wrap">
                {TABS.map((tab) => {
                  const TabIcon = tab.icon;
                  const count = tab.key === "all" ? stats.total : stats[tab.key] || 0;
                  return (
                    <button key={tab.key} onClick={() => setFilterStatus(tab.key)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap border ${filterStatus === tab.key ? tab.activeClass : "bg-white/5 text-gray-400 border-transparent hover:bg-white/10"}`}>
                      <TabIcon size={16} />
                      <span>{tab.label}</span>
                      <span className={`px-1.5 py-0.5 rounded-md text-xs ${filterStatus === tab.key ? "bg-white/20" : "bg-white/10"}`}>{count}</span>
                    </button>
                  );
                })}
                {filteredRequests.length > 0 && (
                  <button onClick={deleteAllFiltered} className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all border border-red-500/20">
                    <Trash2 size={16} />
                    <span>Clear All</span>
                  </button>
                )}
              </div>

              {/* Mobile Tabs */}
              <div className="sm:hidden flex items-center gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                {TABS.map((tab) => {
                  const TabIcon = tab.icon;
                  const count = tab.key === "all" ? stats.total : stats[tab.key] || 0;
                  return (
                    <button key={tab.key} onClick={() => setFilterStatus(tab.key)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap border flex-shrink-0 ${filterStatus === tab.key ? tab.activeClass : "bg-white/5 text-gray-400 border-transparent"}`}>
                      <TabIcon size={14} />
                      <span>{tab.shortLabel}</span>
                      <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${filterStatus === tab.key ? "bg-white/20" : "bg-white/10"}`}>{count}</span>
                    </button>
                  );
                })}
                {filteredRequests.length > 0 && (
                  <button onClick={deleteAllFiltered} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all border border-red-500/20 flex-shrink-0">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Playback Tab Indicator */}
            {playbackTab && playbackTab !== filterStatus && (
              <div className="mb-4 p-2.5 sm:p-3 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <div className="flex gap-0.5">
                    {[0, 150, 300].map((delay) => (
                      <div key={delay} className="w-1 h-3 sm:h-4 bg-pink-400 rounded-full animate-pulse" style={{ animationDelay: `${delay}ms` }} />
                    ))}
                  </div>
                  <span className="text-pink-400">Playing: <strong>{TABS.find((t) => t.key === playbackTab)?.label}</strong></span>
                </div>
                <button onClick={() => setFilterStatus(playbackTab)} className="text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-400 transition-all">View</button>
              </div>
            )}

            {/* Request List */}
            {loading ? (
              <div className="text-center py-12 sm:py-20">
                <div className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-500 text-sm">Loading requests...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-12 sm:py-20">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <ListMusic size={28} className="text-gray-600" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-400 mb-2">No {TABS.find((t) => t.key === filterStatus)?.label.toLowerCase()} yet</h3>
                <p className="text-gray-600 text-xs sm:text-sm px-4">
                  {filterStatus === "pending" ? "Waiting for song requests..." : filterStatus === "approved" ? "Approve requests to see them here" : filterStatus === "rejected" ? "Rejected requests will appear here" : filterStatus === "played" ? "Played songs will appear here" : "No requests yet"}
                </p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {filteredRequests.map((req, index) => {
                  const hasUrl = getPlatformUrl(req);
                  const isCurrentlyPlaying = videoModal && currentPlayingRequest?.id === req.id;
                  const isPending = req.status === "pending";
                  const isApproved = req.status === "approved";
                  const isRejected = req.status === "rejected";
                  const isPlayedStatus = req.status === "played";

                  return (
                    <div key={req.id} className={`group p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all ${isCurrentlyPlaying ? "bg-pink-500/10 border-pink-500/30" : "bg-[#12121a] border-white/5 hover:border-white/10"}`}>
                      {/* Mobile Layout */}
                      <div className="sm:hidden">
                        <div className="flex items-start gap-3">
                          <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                            {req.thumbnail ? <img src={req.thumbnail} alt={req.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Music size={20} className="text-gray-600" /></div>}
                            {hasUrl && !isCurrentlyPlaying && (
                              <button onClick={() => handleOpenVideo(req, filterStatus)} className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <Play size={18} className="text-white fill-white" />
                              </button>
                            )}
                            {isCurrentlyPlaying && (
                              <div className="absolute inset-0 bg-pink-500/30 flex items-center justify-center">
                                <div className="flex gap-0.5">
                                  {[0, 150, 300].map((delay) => <div key={delay} className="w-0.5 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: `${delay}ms` }} />)}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <h3 className="font-semibold text-white text-sm leading-tight truncate" onClick={() => hasUrl && handleOpenVideo(req, filterStatus)}>{req.title}</h3>
                                <p className="text-xs text-gray-400 truncate mt-0.5">{req.artist}</p>
                              </div>
                              <span className={`flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold ${isCurrentlyPlaying ? "bg-pink-500/20 text-pink-400" : isPlayedStatus ? "bg-green-500/10 text-green-400" : isApproved ? "bg-blue-500/10 text-blue-400" : isRejected ? "bg-red-500/10 text-red-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                                {isCurrentlyPlaying ? "▶" : isPlayedStatus ? "✓" : isApproved ? "👍" : isRejected ? "✕" : "⏳"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-500">
                              {req.explicit === "Explicit" && <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">E</span>}
                              <span className="truncate">{req.requestedBy}</span>
                              <span>•</span>
                              <span>{timeAgo(req.requestedAt)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-white/5">
                          {hasUrl && (
                            <button onClick={() => handleOpenVideo(req, filterStatus)} className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center gap-1.5 text-xs text-gray-300">
                              <Play size={14} className="fill-current" />Play
                            </button>
                          )}
                          {isPending && (
                            <>
                              <button onClick={() => updateStatus(req.id, "approved")} className="flex-1 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-all flex items-center justify-center gap-1.5 text-xs text-blue-400">
                                <ThumbsUp size={14} />Approve
                              </button>
                              <button onClick={() => updateStatus(req.id, "rejected")} className="py-2 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all">
                                <Ban size={14} className="text-red-400" />
                              </button>
                            </>
                          )}
                          {isApproved && (
                            <>
                              <button onClick={() => updateStatus(req.id, "played")} className="flex-1 py-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 transition-all flex items-center justify-center gap-1.5 text-xs text-green-400">
                                <Check size={14} />Played
                              </button>
                              <button onClick={() => updateStatus(req.id, "rejected")} className="py-2 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all">
                                <Ban size={14} className="text-red-400" />
                              </button>
                            </>
                          )}
                          {isRejected && (
                            <>
                              <button onClick={() => updateStatus(req.id, "pending")} className="flex-1 py-2 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 transition-all flex items-center justify-center gap-1.5 text-xs text-yellow-400">
                                <Clock size={14} />Restore
                              </button>
                              <button onClick={() => deleteRequest(req.id)} className="py-2 px-3 rounded-lg bg-white/5 hover:bg-red-500/10 transition-all">
                                <Trash2 size={14} className="text-gray-500" />
                              </button>
                            </>
                          )}
                          {isPlayedStatus && (
                            <>
                              <button onClick={() => updateStatus(req.id, "approved")} className="flex-1 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-all flex items-center justify-center gap-1.5 text-xs text-blue-400">
                                <ThumbsUp size={14} />Re-add
                              </button>
                              <button onClick={() => deleteRequest(req.id)} className="py-2 px-3 rounded-lg bg-white/5 hover:bg-red-500/10 transition-all">
                                <Trash2 size={14} className="text-gray-500" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Desktop Layout */}
                      <div className="hidden sm:flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-white/5 items-center justify-center flex-shrink-0 hidden md:flex">
                          <span className="text-sm font-medium text-gray-500">{index + 1}</span>
                        </div>
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-white/5 flex-shrink-0">
                          {req.thumbnail ? <img src={req.thumbnail} alt={req.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Music size={24} className="text-gray-600" /></div>}
                          {hasUrl && !isCurrentlyPlaying && (
                            <button onClick={() => handleOpenVideo(req, filterStatus)} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Play size={24} className="text-white fill-white" />
                            </button>
                          )}
                          {isCurrentlyPlaying && (
                            <button onClick={() => setIsMinimized(false)} className="absolute inset-0 bg-pink-500/30 flex items-center justify-center">
                              <div className="flex gap-0.5">
                                {[0, 150, 300].map((delay) => <div key={delay} className="w-1 h-4 bg-white rounded-full animate-pulse" style={{ animationDelay: `${delay}ms` }} />)}
                              </div>
                            </button>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1 overflow-hidden">
                              {hasUrl ? (
                                <button onClick={() => handleOpenVideo(req, filterStatus)} className="block w-full text-left group/title">
                                  <h3 className="font-semibold text-white truncate group-hover/title:text-pink-400 transition-colors">
                                    {req.title}
                                    <ExternalLink size={14} className="inline-block ml-2 opacity-0 group-hover/title:opacity-100 transition-opacity text-pink-400" />
                                  </h3>
                                </button>
                              ) : (
                                <h3 className="font-semibold text-white truncate">{req.title}</h3>
                              )}
                              <p className="text-sm text-gray-400 truncate">{req.artist}</p>
                            </div>
                            <span className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold ${isCurrentlyPlaying ? "bg-pink-500/20 text-pink-400" : isPlayedStatus ? "bg-green-500/10 text-green-400" : isApproved ? "bg-blue-500/10 text-blue-400" : isRejected ? "bg-red-500/10 text-red-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                              {isCurrentlyPlaying ? "Playing" : isPlayedStatus ? "Played" : isApproved ? "Approved" : isRejected ? "Rejected" : "Pending"}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              {req.genre && req.genre !== "Unknown" && <span className="px-2 py-0.5 rounded-md text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20">{req.genre}</span>}
                              {req.explicit && req.explicit !== "Unknown" && (
                                <span className={`px-2 py-0.5 rounded-md text-xs border ${req.explicit === "Explicit" ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-green-500/10 text-green-400 border-green-500/20"}`}>
                                  {req.explicit === "Explicit" ? "Explicit" : "Clean"}
                                </span>
                              )}
                            </div>
                            <span className="text-gray-600">•</span>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <User size={12} />
                              <span className="truncate max-w-[100px]">{req.requestedBy}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock size={12} />
                              <span>{timeAgo(req.requestedAt)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {hasUrl && (
                            <button onClick={() => handleOpenVideo(req, filterStatus)} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all" title={`Preview on ${currentPlatform.name}`}>
                              <ExternalLink size={16} className="text-gray-400" />
                            </button>
                          )}
                          {isPending && (
                            <>
                              <button onClick={() => updateStatus(req.id, "approved")} className="p-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-all" title="Approve">
                                <ThumbsUp size={16} className="text-blue-400" />
                              </button>
                              <button onClick={() => updateStatus(req.id, "rejected")} className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all" title="Reject">
                                <Ban size={16} className="text-red-400" />
                              </button>
                            </>
                          )}
                          {isApproved && (
                            <>
                              <button onClick={() => updateStatus(req.id, "played")} className="p-2.5 rounded-xl bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 transition-all" title="Mark as Played">
                                <Check size={16} className="text-green-400" />
                              </button>
                              <button onClick={() => updateStatus(req.id, "rejected")} className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all" title="Reject">
                                <Ban size={16} className="text-red-400" />
                              </button>
                            </>
                          )}
                          {isRejected && (
                            <>
                              <button onClick={() => updateStatus(req.id, "pending")} className="p-2.5 rounded-xl bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 transition-all" title="Restore to Pending">
                                <Clock size={16} className="text-yellow-400" />
                              </button>
                              <button onClick={() => deleteRequest(req.id)} className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/10 transition-all" title="Delete">
                                <Trash2 size={16} className="text-gray-500 hover:text-red-400" />
                              </button>
                            </>
                          )}
                          {isPlayedStatus && (
                            <>
                              <button onClick={() => updateStatus(req.id, "approved")} className="p-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-all" title="Move to Approved">
                                <ThumbsUp size={16} className="text-blue-400" />
                              </button>
                              <button onClick={() => deleteRequest(req.id)} className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/10 transition-all" title="Delete">
                                <Trash2 size={16} className="text-gray-500 hover:text-red-400" />
                              </button>
                            </>
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

        <footer className="mt-8 sm:mt-12 pt-4 sm:pt-6 border-t border-white/5 text-center">
          <p className="text-[10px] sm:text-xs text-gray-600">TextMyTrack • Built for DJs who take requests</p>
        </footer>
      </div>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </main>
  );
}