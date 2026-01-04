"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabaseBrowserClient } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Disc3, Settings, LogOut, Trash2 } from "lucide-react";
import { DragDropContext } from "@hello-pangea/dnd"; 

// Components
import PlayerModal from "../components/dashboard/PlayerModal";
import RequestList from "../components/dashboard/RequestList";
import StatsSidebar from "../components/dashboard/StatsSidebar";
import SettingsModal from "../components/dashboard/SettingsModal";

// Constants
const UNIVERSAL_NUMBER = "(855) 710-5533";
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
  const [videoModalId, setVideoModalId] = useState(null); 
  const [playingRequestId, setPlayingRequestId] = useState(null); 
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [autoPlay, setAutoPlay] = useState(true);

  // --- Derived State ---
  const filteredRequests = useMemo(() => {
    let result = requests;
    if (filterStatus !== "all") {
        result = requests.filter(r => r.status === filterStatus);
    }
    // Sort by position ascending
    return result.sort((a, b) => (a.position || 0) - (b.position || 0));
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
    const queue = requests
        .filter(r => (r.status === 'pending' || r.status === 'approved') && r.youtube_video_id)
        .sort((a, b) => (a.position || 0) - (b.position || 0));
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

      // Load Requests (Initial) - ORDER BY POSITION
      const { data: reqs, error } = await supabase
        .from('requests')
        .select('*')
        .eq('dj_id', data.user.id)
        .order('position', { ascending: true });
      
      if (reqs) {
         setRequests(reqs);
      } else {
         console.error("Failed to load requests:", error);
      }
      
      setLoading(false);
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
          if (payload.eventType === "INSERT") setRequests(prev => [...prev, payload.new]); 
          else if (payload.eventType === "UPDATE") setRequests(prev => prev.map(r => r.id === payload.new.id ? payload.new : r));
          else if (payload.eventType === "DELETE") setRequests(prev => prev.filter(r => r.id !== payload.old.id));
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user]);


  // --- Actions ---
  const handleUpdateStatus = async (id, status) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    await fetch("/api/update-request", { 
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

  // --- DRAG AND DROP HANDLER (FIXED) ---
  const handleOnDragEnd = async (result) => {
    if (!result.destination) return;

    // 1. Reorder the visible list in memory
    const items = Array.from(filteredRequests);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // 2. FORCE NEW POSITIONS (0, 1000, 2000...)
    // This ignores the old "duplicate" numbers and forces a clean sort order
    const updates = items.map((item, index) => ({
        id: item.id,
        position: index * 1000 
    }));

    // 3. Update Local State (Merge updates into global request list)
    setRequests(prev => {
        // Map over all requests. If the request was part of the reorder, give it the new position.
        const next = prev.map(r => {
            const update = updates.find(u => u.id === r.id);
            return update ? { ...r, position: update.position } : r;
        });
        return next;
    });

    // 4. Persist to DB
    const { error } = await supabase.from('requests').upsert(updates);
    if (error) console.error("Reorder failed", error);
  };

  // --- Player Logic ---
  const handlePlayRequest = (req, isInternalPlayer) => {
    if(isInternalPlayer && req.youtube_video_id) {
       setVideoModalId(req.youtube_video_id);
       setPlayingRequestId(req.id);
       setIsMinimized(false);
    } else {
       let url = null;
       if (selectedPlatform === 'spotify' && req.spotify_url) url = req.spotify_url;
       else if (selectedPlatform === 'apple' && req.apple_url) url = req.apple_url;
       else if (selectedPlatform === 'soundcloud' && req.soundcloud_url) url = req.soundcloud_url;
       else if (req.url) url = req.url;
       
       if(url) window.open(url, '_blank');
    }
  };

  const handleNextSong = useCallback(() => {
    if (autoPlay && nextSong) {
      if(currentPlayingRequest) handleUpdateStatus(currentPlayingRequest.id, "played");
      setTimeout(() => {
        setPlayingRequestId(nextSong.id);
        setVideoModalId(nextSong.youtube_video_id);
      }, 100);
    } else {
       setVideoModalId(null);
       setPlayingRequestId(null);
    }
  }, [autoPlay, nextSong, currentPlayingRequest]);


  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white bg-gradient-to-b from-[#0a0a0f] via-[#0d0d14] to-[#0a0a0f]">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[700px] h-[700px] rounded-full bg-purple-500/10 blur-[200px] transform -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[800px] rounded-full bg-pink-500/10 blur-[200px] transform translate-x-1/2 translate-y-1/2" />
      </div>

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

      <div className={`relative max-w-7xl mx-auto p-4 lg:p-8 ${videoModalId && isMinimized ? "pb-32" : ""}`}>
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

          <div className="lg:hidden mb-4">
             <div className="p-4 bg-[#12121a] rounded-xl border border-white/5 flex justify-between items-center">
                <span className="text-sm text-gray-400">Status</span>
                <button onClick={toggleAccepting} className={`text-xs px-2 py-1 rounded ${djProfile?.accepting_requests ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                   {djProfile?.accepting_requests ? "Live" : "Paused"}
                </button>
             </div>
          </div>

          <div className="lg:col-span-3">
             <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                {TABS.map(tab => (
                  <button 
                    key={tab.key}
                    onClick={() => setFilterStatus(tab.key)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border ${
                      filterStatus === tab.key 
                      ? "bg-white/10 border-white/20 text-white" 
                      : "bg-[#12121a] border-transparent text-gray-400 hover:bg-white/5"
                    }`}
                  >
                    {tab.label} <span className="ml-1 text-xs opacity-50">{tab.key === 'all' ? stats.total : stats[tab.key]}</span>
                  </button>
                ))}
                <button 
                  onClick={clearAllFiltered} 
                  disabled={filteredRequests.length === 0}
                  className={`ml-auto px-3 py-2 rounded-lg transition-colors ${
                    filteredRequests.length > 0 
                      ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400' 
                      : 'bg-transparent text-transparent pointer-events-none' 
                  }`}
                >
                  <Trash2 size={16} />
                </button>
             </div>

            <DragDropContext onDragEnd={handleOnDragEnd}>
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
                   droppableId="request-list" 
                 />
            </DragDropContext>
          </div>
        </div>
      </div>
    </main>
  );
}