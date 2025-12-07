"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabaseBrowserClient } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Disc3, Settings, LogOut, Trash2 } from "lucide-react";

// Components
import PlayerModal from "../components/dashboard/PlayerModal";
import RequestList from "../components/dashboard/RequestList";
import StatsSidebar from "../components/dashboard/StatsSidebar";
import SettingsModal from "../components/dashboard/SettingsModal";

// Constants
const UNIVERSAL_NUMBER = "(855) 710-5533";
// FIX: Replace broken unicode icons (Issue #3) with standard emojis and update icon choices
const PLATFORMS = {
  youtube: { name: "YouTube", icon: "▶️", color: "#FF0000", textColor: "text-red-400", bgColor: "bg-red-500/10", borderColor: "border-red-500/30" },
  spotify: { name: "Spotify", icon: "🟢", color: "#1DB954", textColor: "text-green-400", bgColor: "bg-green-500/10", borderColor: "border-green-500/30" },
  apple: { name: "Apple Music", icon: "🍎", color: "#FC3C44", textColor: "text-pink-400", bgColor: "bg-pink-500/10", borderColor: "border-pink-500/30" },
  soundcloud: { name: "SoundCloud", icon: "☁️", color: "#FF5500", textColor: "text-orange-400", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/30" },
};
const TABS = [
  { key: "pending", label: "Requests" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "played", label: "Played" },
  { key: "all", label: "All" },
];

export default function Dashboard() {
  const supabase = supabaseBrowserClient();
  const router = useRouter();

  // Data State
  const [requests, setRequests] = useState([]);
  const [djProfile, setDjProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // UI State
  const [filterStatus, setFilterStatus] = useState("pending");
  const [selectedPlatform, setSelectedPlatform] = useState("youtube");
  const [showSettings, setShowSettings] = useState(false);

  // Player State
  const [videoModalId, setVideoModalId] = useState(null); // The Video ID currently in modal
  const [playingRequestId, setPlayingRequestId] = useState(null); // The Request ID
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [autoPlay, setAutoPlay] = useState(true);

  // --- Derived State ---
  const filteredRequests = useMemo(() => {
    if (filterStatus === "all") return requests;
    return requests.filter(r => r.status === filterStatus);
  }, [requests, filterStatus]);

  const stats = useMemo(() => ({
    total: requests.length,
    pending: requests.filter(r => r.status === "pending").length,
    approved: requests.filter(r => r.status === "approved").length,
    rejected: requests.filter(r => r.status === "rejected").length,
    played: requests.filter(r => r.status === "played").length,
  }), [requests]);

  const currentPlayingRequest = useMemo(() => 
    requests.find(r => r.id === playingRequestId), 
  [requests, playingRequestId]);

  const nextSong = useMemo(() => {
    if (!currentPlayingRequest) return null;
    // Look for next approved or pending song with a video ID
    const queue = requests.filter(r => (r.status === 'pending' || r.status === 'approved') && r.youtube_video_id);
    const currentIndex = queue.findIndex(r => r.id === currentPlayingRequest.id);
    return queue[currentIndex + 1] || null;
  }, [requests, currentPlayingRequest]);


  // --- Data Loading & Auth ---
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) return router.push("/login");
      
      setUser(data.user);
      
      // Load Profile
      const { data: profile } = await supabase.from("dj_profiles").select("*").eq("id", data.user.id).single();
      if (profile) {
        setDjProfile(profile);
        if (profile.preferred_platform) setSelectedPlatform(profile.preferred_platform);
      }

      // Load Requests (Initial)
      const reqs = await fetch(`/api/requests?dj_id=${data.user.id}`).then(res => res.json());
      
      if (reqs && reqs.requests) {
         setRequests(reqs.requests);
      } else {
         console.error("Failed to load initial requests from API:", reqs);
         setRequests([]);
      }
      
      setLoading(false);
    };
    init();
  }, []);


  // --- Realtime Subscription (Optimized) ---
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel("realtime-requests")
      .on("postgres_changes", 
        { event: "*", schema: "public", table: "requests", filter: `dj_id=eq.${user.id}` }, 
        (payload) => {
          if (payload.eventType === "INSERT") setRequests(prev => [payload.new, ...prev]);
          else if (payload.eventType === "UPDATE") setRequests(prev => prev.map(r => r.id === payload.new.id ? payload.new : r));
          else if (payload.eventType === "DELETE") setRequests(prev => prev.filter(r => r.id !== payload.old.id));
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user]);


  // --- Actions ---
  const handleUpdateStatus = async (id, status) => {
    // Optimistic Update
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    // NOTE: Using /api/update-request for a POST request to update status
    await fetch("/api/update-request", { // Changed to use update-request endpoint
       method: "POST", headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ id, status })
    });
  };

  const handleDelete = async (id) => {
    if(!confirm("Delete request?")) return;
    setRequests(prev => prev.filter(r => r.id !== id));
    await fetch("/api/requests-delete", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
  };

  const clearAllFiltered = async () => {
    if(!confirm(`Delete all ${filteredRequests.length} items?`)) return;
    const ids = filteredRequests.map(r => r.id);
    setRequests(prev => prev.filter(r => !ids.includes(r.id)));
    // In production, use a batch delete endpoint
    ids.forEach(id => fetch("/api/requests-delete", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
    }));
  };

  const toggleAccepting = async () => {
    if(!djProfile) return;
    const newVal = !djProfile.accepting_requests;
    setDjProfile(prev => ({ ...prev, accepting_requests: newVal }));
    await supabase.from("dj_profiles").update({ accepting_requests: newVal }).eq("id", user.id);
  };

  // --- Player Logic ---
  const handlePlayRequest = (req, isInternalPlayer) => {
    if(isInternalPlayer && req.youtube_video_id) {
       setVideoModalId(req.youtube_video_id);
       setPlayingRequestId(req.id);
       setIsMinimized(false);
    } else {
       // Open External - FIX: Correctly determine external URL based on selectedPlatform
       let url = null;
       if (selectedPlatform === 'spotify' && req.spotify_url) {
           url = req.spotify_url;
       } else if (selectedPlatform === 'apple' && req.apple_url) {
           url = req.apple_url;
       } else if (selectedPlatform === 'soundcloud' && req.soundcloud_url) {
           url = req.soundcloud_url;
       } else if (req.url) { // Fallback to generic URL if it exists
           url = req.url;
       }
       
       if(url) window.open(url, '_blank');
    }
  };

  const handleNextSong = useCallback(() => {
    if (autoPlay && nextSong) {
      // Mark current played
      if(currentPlayingRequest) handleUpdateStatus(currentPlayingRequest.id, "played");
      
      // Play next (small delay to reset player)
      setTimeout(() => {
        setPlayingRequestId(nextSong.id);
        setVideoModalId(nextSong.youtube_video_id);
      }, 100);
    } else {
       // Stop
       setVideoModalId(null);
       setPlayingRequestId(null);
    }
  }, [autoPlay, nextSong, currentPlayingRequest]);


  return (
    // REVERTED FIX: Removed overflow-y-scroll to fix double scrollbar issue
    <main className="min-h-screen bg-[#0a0a0f] text-white bg-gradient-to-b from-[#0a0a0f] via-[#0d0d14] to-[#0a0a0f]">
      {/* ENHANCED BACKGROUND: Increased size, blur, and opacity for a more pronounced glass morphism effect */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Top-Left Glow (Purple/Cyan Hue) */}
        <div className="absolute top-0 left-0 w-[700px] h-[700px] rounded-full bg-purple-500/10 blur-[200px] transform -translate-x-1/2 -translate-y-1/2" />
        {/* Bottom-Right Glow (Pink/Red Hue) */}
        <div className="absolute bottom-0 right-0 w-[800px] h-[800px] rounded-full bg-pink-500/10 blur-[200px] transform translate-x-1/2 translate-y-1/2" />
      </div>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)}
        djProfile={djProfile}
        user={user}
        universalNumber={UNIVERSAL_NUMBER}
      />

      {/* Persistent Player */}
      <PlayerModal 
        videoId={videoModalId}
        request={currentPlayingRequest}
        nextSong={nextSong}
        isMinimized={isMinimized}
        isMuted={isMuted}
        autoPlay={autoPlay}
        onClose={() => { setVideoModalId(null); setPlayingRequestId(null); }}
        onMinimize={() => setIsMinimized(true)}
        onMaximize={() => setIsMinimized(false)}
        onToggleMute={() => setIsMuted(!isMuted)}
        onToggleAutoPlay={() => setAutoPlay(!autoPlay)}
        onTogglePlay={() => {}} // Internal state handled in component
        onSkip={handleNextSong}
        onApprove={() => {
            if(currentPlayingRequest) handleUpdateStatus(currentPlayingRequest.id, "approved");
            handleNextSong();
        }}
        onMarkPlayed={() => {
            if(currentPlayingRequest) handleUpdateStatus(currentPlayingRequest.id, "played");
            setVideoModalId(null);
        }}
        onVideoEnd={handleNextSong}
      />

      <div className={`relative max-w-7xl mx-auto p-4 lg:p-8 ${videoModalId && isMinimized ? "pb-32" : ""}`}>
        
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
              <Disc3 size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">TextMyTrack</h1>
              <p className="text-xs text-gray-500">DJ Dashboard</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowSettings(true)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 flex items-center gap-2">
              <Settings size={18} /> <span className="hidden sm:block">Settings</span>
            </button>
            <button onClick={() => { supabase.auth.signOut(); router.push("/login"); }} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 flex items-center gap-2">
              <LogOut size={18} /> <span className="hidden sm:block">Logout</span>
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="hidden lg:block lg:col-span-1">
             <StatsSidebar 
               stats={stats}
               djProfile={djProfile}
               universalNumber={UNIVERSAL_NUMBER}
               acceptingRequests={djProfile?.accepting_requests}
               toggleAccepting={toggleAccepting}
               platform={selectedPlatform}
               setPlatform={setSelectedPlatform}
               platformsConfig={PLATFORMS}
             />
          </div>

          {/* Mobile Sidebar Replacement (simplified) */}
          <div className="lg:hidden mb-4">
             {/* Render simplified mobile stats here if needed, or rely on StatsSidebar adapting to mobile (it currently has desktop styles) */}
             <div className="p-4 bg-[#12121a] rounded-xl border border-white/5 flex justify-between items-center">
                <span className="text-sm text-gray-400">Status</span>
                <button onClick={toggleAccepting} className={`text-xs px-2 py-1 rounded ${djProfile?.accepting_requests ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                   {djProfile?.accepting_requests ? "Live" : "Paused"}
                </button>
             </div>
          </div>

          {/* Main List */}
          <div className="lg:col-span-3">
             {/* Tabs */}
             <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                {TABS.map(tab => (
                  <button 
                    key={tab.key}
                    onClick={() => setFilterStatus(tab.key)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border ${
                      filterStatus === tab.key 
                      // FIX: Set background color for all tabs
                      ? "bg-white/10 border-white/20 text-white" 
                      : "bg-[#12121a] border-transparent text-gray-400 hover:bg-white/5"
                    }`}
                  >
                    {tab.label} <span className="ml-1 text-xs opacity-50">{tab.key === 'all' ? stats.total : stats[tab.key]}</span>
                  </button>
                ))}
                {/* FIX: Jitter fix: Always render the clear button space but hide content if no requests */}
                <button 
                  onClick={clearAllFiltered} 
                  disabled={filteredRequests.length === 0}
                  className={`ml-auto px-3 py-2 rounded-lg transition-colors ${
                    filteredRequests.length > 0 
                      ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400' 
                      : 'bg-transparent text-transparent pointer-events-none' // Hide but reserve space
                  }`}
                >
                  <Trash2 size={16} />
                </button>
             </div>

             <RequestList 
               requests={filteredRequests}
               loading={loading}
               filterStatus={filterStatus}
               currentPlayingId={playingRequestId}
               onPlay={handlePlayRequest}
               onUpdateStatus={handleUpdateStatus}
               onDelete={handleDelete}
               platformPreference={selectedPlatform}
               tabLabel={TABS.find(t => t.key === filterStatus)?.label}
             />
          </div>
        </div>
      </div>
    </main>
  );
}