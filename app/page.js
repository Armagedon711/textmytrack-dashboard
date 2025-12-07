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

// Platform Config - mapped for the UI
const PLATFORMS = {
  youtube: { 
    name: "YouTube", 
    icon: "▶️", 
    bgColor: "bg-red-500/10", 
    borderColor: "border-red-500/30",
    textColor: "text-red-400"
  },
  spotify: { 
    name: "Spotify", 
    icon: "🟢", 
    bgColor: "bg-green-500/10", 
    borderColor: "border-green-500/30",
    textColor: "text-green-400" 
  },
  apple: { 
    name: "Apple Music", 
    icon: "", 
    bgColor: "bg-pink-500/10", 
    borderColor: "border-pink-500/30",
    textColor: "text-pink-400" 
  },
  soundcloud: { 
    name: "SoundCloud", 
    icon: "☁️", 
    bgColor: "bg-orange-500/10", 
    borderColor: "border-orange-500/30",
    textColor: "text-orange-400" 
  },
};

const TABS = [
  { key: "pending", label: "Queue" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "played", label: "History" },
  { key: "all", label: "All Requests" },
];

export default function Dashboard() {
  const supabase = supabaseBrowserClient();
  const router = useRouter();

  // --- Data State ---
  const [requests, setRequests] = useState([]);
  const [djProfile, setDjProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- UI State ---
  const [filterStatus, setFilterStatus] = useState("pending");
  const [selectedPlatform, setSelectedPlatform] = useState("youtube");
  const [showSettings, setShowSettings] = useState(false);

  // --- Player State ---
  const [videoModalId, setVideoModalId] = useState(null);
  const [playingRequestId, setPlayingRequestId] = useState(null);
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

  // --- Initialization ---
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

      // Load Requests
      try {
        const res = await fetch(`/api/requests?dj_id=${data.user.id}`);
        const json = await res.json();
        if (json && json.requests) {
           setRequests(json.requests);
        }
      } catch (e) {
        console.error("Failed to load requests:", e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // --- Realtime Subscription ---
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

  // --- Action Handlers ---
  const handleUpdateStatus = async (id, status) => {
    // Optimistic Update
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    try {
      await fetch("/api/update-request", {
         method: "POST", 
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ id, status })
      });
    } catch (e) {
      console.error("Error updating status", e);
    }
  };

  const handleDelete = async (id) => {
    if(!confirm("Are you sure you want to remove this request?")) return;
    setRequests(prev => prev.filter(r => r.id !== id));
    try {
      await fetch("/api/requests-delete", {
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
    } catch(e) {
      console.error("Error deleting", e);
    }
  };

  const clearAllFiltered = async () => {
    if(!confirm(`Delete all ${filteredRequests.length} ${filterStatus} items? This cannot be undone.`)) return;
    const ids = filteredRequests.map(r => r.id);
    
    // Optimistic UI clear
    setRequests(prev => prev.filter(r => !ids.includes(r.id)));
    
    // Batch delete (simulated via loop for now)
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
       // Open External
       const url = selectedPlatform === 'spotify' ? req.spotify_url : 
                   selectedPlatform === 'apple' ? req.apple_url : req.url;
       if(url) window.open(url, '_blank');
    }
  };

  const handleNextSong = useCallback(() => {
    if (autoPlay && nextSong) {
      // Mark current as played
      if(currentPlayingRequest) handleUpdateStatus(currentPlayingRequest.id, "played");
      
      // Small delay to ensure player re-initializes cleanly
      setTimeout(() => {
        setPlayingRequestId(nextSong.id);
        setVideoModalId(nextSong.youtube_video_id);
      }, 150);
    } else {
       // Stop playback
       setVideoModalId(null);
       setPlayingRequestId(null);
    }
  }, [autoPlay, nextSong, currentPlayingRequest]);


  return (
    <main className="min-h-screen bg-[#09090b] text-white selection:bg-pink-500/30">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
         <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-pink-500/5 rounded-full blur-[100px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      {/* Modals */}
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)}
        djProfile={djProfile}
        user={user}
        universalNumber={UNIVERSAL_NUMBER}
      />

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
        onTogglePlay={() => {}} 
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

      {/* Main Layout */}
      <div className={`relative max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 transition-all duration-500 ${videoModalId && isMinimized ? "pb-32" : ""}`}>
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-zinc-800 to-zinc-900 border border-white/5 flex items-center justify-center shadow-2xl group">
              <Disc3 size={24} className="text-pink-500 group-hover:rotate-180 transition-transform duration-700 ease-out" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard</h1>
              <p className="text-sm text-zinc-400">Manage your set list in real-time</p>
            </div>
          </div>
          
          <div className="flex gap-3">
             <button 
                onClick={() => setShowSettings(true)}
                className="px-4 py-2 text-sm font-medium text-zinc-300 bg-[#18181b] border border-white/5 rounded-full hover:bg-white/5 hover:text-white transition-all flex items-center gap-2"
             >
                <Settings size={16} /> <span>Configure</span>
             </button>
             <button 
                onClick={() => { supabase.auth.signOut(); router.push("/login"); }}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-[#18181b] border border-white/5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                title="Logout"
             >
                <LogOut size={16} />
             </button>
          </div>
        </header>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT: Stats & Control (3 Columns) */}
          <div className="lg:col-span-3 lg:sticky lg:top-8 lg:h-fit space-y-6">
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

          {/* RIGHT: Request Feed (9 Columns) */}
          <div className="lg:col-span-9">
             
             {/* Tab Navigation */}
             <div className="flex items-center border-b border-white/5 mb-6">
                <nav className="flex gap-6 overflow-x-auto scrollbar-hide">
                  {TABS.map(tab => {
                    const isActive = filterStatus === tab.key;
                    return (
                      <button 
                        key={tab.key}
                        onClick={() => setFilterStatus(tab.key)}
                        className={`group pb-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap px-1 flex items-center gap-2 ${
                          isActive 
                          ? "border-pink-500 text-white" 
                          : "border-transparent text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        {tab.label} 
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full transition-colors ${
                          isActive ? 'bg-pink-500/20 text-pink-400' : 'bg-white/5 text-zinc-500 group-hover:bg-white/10'
                        }`}>
                          {tab.key === 'all' ? stats.total : stats[tab.key]}
                        </span>
                      </button>
                    )
                  })}
                </nav>
                
                {/* Clear Button */}
                <div className="ml-auto pl-4">
                  {filteredRequests.length > 0 && (
                     <button 
                        onClick={clearAllFiltered}
                        className="text-xs text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1.5 px-2 py-1 rounded hover:bg-red-500/10"
                     >
                       <Trash2 size={12} /> <span className="hidden sm:inline">Clear List</span>
                     </button>
                  )}
                </div>
             </div>

             {/* Request List Container */}
             <div className="bg-[#18181b]/50 border border-white/5 rounded-2xl p-2 min-h-[500px] backdrop-blur-sm">
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
      </div>
    </main>
  );
}