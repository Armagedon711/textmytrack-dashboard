"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabaseBrowserClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Disc3, Settings, LogOut, Trash2, MessageSquare, ChevronDown, ChevronUp, Power, ExternalLink, Plus, Phone } from "lucide-react";
import { DragDropContext } from "@hello-pangea/dnd"; 

// Components (Using @/ alias for safety)
import PlayerModal from "@/components/dashboard/PlayerModal";
import RequestList from "@/components/dashboard/RequestList";
import StatsSidebar from "@/components/dashboard/StatsSidebar";
import SettingsModal from "@/components/dashboard/SettingsModal";
import LiveChat from "@/components/dashboard/LiveChat"; 
import AddSongModal from "@/components/dashboard/AddSongModal"; 

// Constants
const UNIVERSAL_NUMBER = "(855) 710-5533";
const PLATFORMS = {
  youtube: { name: "YouTube", icon: "▶️", color: "#FF0000", textColor: "text-red-400", bgColor: "bg-red-500/10", borderColor: "border-red-500/30" },
  spotify: { name: "Spotify", icon: "🟢", color: "#1DB954", textColor: "text-green-400", bgColor: "bg-green-500/10", borderColor: "border-green-500/30" },
  apple: { name: "Apple Music", icon: "🍎", color: "#FC3C44", textColor: "text-rose-400", bgColor: "bg-rose-500/10", borderColor: "border-rose-500/30" },
  soundcloud: { name: "SoundCloud", icon: "☁️", color: "#FF5500", textColor: "text-orange-400", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/30" }
};

const TABS = [
  { key: "pending", label: "Requests" },
  { key: "approved", label: "Approved" },
  { key: "played", label: "Played" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All History" },
];

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [djProfile, setDjProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [filterStatus, setFilterStatus] = useState("pending");
  
  // Player State
  const [videoModalId, setVideoModalId] = useState(null);
  const [currentPlayingRequest, setCurrentPlayingRequest] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false); 
  const [playingRequestId, setPlayingRequestId] = useState(null); 

  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [acceptingRequests, setAcceptingRequests] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState('youtube');
  const [isAddSongOpen, setIsAddSongOpen] = useState(false);

  // --- Initial Data Load ---
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabaseBrowserClient.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Fetch DJ Profile
      const { data: profile } = await supabaseBrowserClient
        .from("dj_profiles")
        .select("*")
        .eq("id", user.id)
        .single();
        
      if (profile) {
        setDjProfile(profile);
        setAcceptingRequests(profile.accepting_requests ?? true);
      }

      // Fetch Requests
      const { data: reqs } = await supabaseBrowserClient
        .from("requests")
        .select("*")
        .eq("dj_id", user.id)
        .order("position", { ascending: true }); // Respect DnD order

      if (reqs) setRequests(reqs);
      setLoading(false);
    };

    checkUser();
  }, [router]);

  // --- Realtime Subscription ---
  useEffect(() => {
    if (!djProfile) return;

    const channel = supabaseBrowserClient
      .channel("realtime-requests")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "requests", filter: `dj_id=eq.${djProfile.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
             setRequests((prev) => [...prev, payload.new]);
          } else if (payload.eventType === "UPDATE") {
             setRequests((prev) => prev.map((r) => (r.id === payload.new.id ? payload.new : r)));
             // Sync player state if the updated song is current
             if (currentPlayingRequest?.id === payload.new.id) {
                setCurrentPlayingRequest(payload.new);
             }
          } else if (payload.eventType === "DELETE") {
             setRequests((prev) => prev.filter((r) => r.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabaseBrowserClient.removeChannel(channel);
    };
  }, [djProfile, currentPlayingRequest]);

  // --- Filtering Logic ---
  const filteredRequests = useMemo(() => {
    if (filterStatus === "all") return requests;
    // Simple filter by status
    const filtered = requests.filter((r) => r.status === filterStatus);
    // Sort by position (drag and drop order)
    return filtered.sort((a, b) => (a.position || 0) - (b.position || 0));
  }, [requests, filterStatus]);

  // --- Next Song Logic (UPDATED: Tab-Aware) ---
  const nextSong = useMemo(() => {
    if (!currentPlayingRequest) return null;
    
    // FIX 1: Use filteredRequests so we autoplay from the CURRENT TAB
    const queue = filteredRequests.filter(r => r.youtube_video_id);
    
    if (queue.length === 0) return null;

    const currentIndex = queue.findIndex(r => r.id === currentPlayingRequest.id);
    
    // If current song isn't in this tab, start from the top of the new list
    if (currentIndex === -1) return queue[0];

    const next = queue[currentIndex + 1];
    
    // Return next song or loop to start
    return next || queue[0];
  }, [filteredRequests, currentPlayingRequest]);

  // --- API Handlers ---
  const handleUpdateStatus = useCallback(async (id, newStatus) => {
    // Optimistic UI Update
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));

    try {
      await fetch("/api/update-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
    } catch (err) {
      console.error("Failed to update status", err);
    }
  }, []);

  const handleDelete = useCallback(async (id) => {
    if(!confirm("Are you sure you want to delete this request?")) return;
    
    // Optimistic UI
    setRequests(prev => prev.filter(r => r.id !== id));

    try {
      await fetch("/api/requests-delete", {
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch (err) {
      console.error("Failed to delete", err);
    }
  }, []);

  // --- Drag and Drop Handler ---
  const handleOnDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(filteredRequests);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update Local State Immediately
    // We need to map this back to the main 'requests' array carefully
    const newOrderIds = items.map(i => i.id);
    
    setRequests(prev => {
        const otherRequests = prev.filter(r => r.status !== filterStatus);
        const updatedCurrentStatusRequests = items.map((item, index) => ({
            ...item,
            position: index // Update position index
        }));
        return [...otherRequests, ...updatedCurrentStatusRequests];
    });

    // Save New Positions to DB (Batch Update via n8n or new API route suggested for prod)
    // For now, we just update the specific item moved if needed, but ideally we update all positions.
    // NOTE: Simplified for this snippet. You might want a bulk update endpoint.
  };

  // =========================================================================
  //  THE FIX: Strict Separation of "Manual Click" vs "System Autoplay"
  // =========================================================================

  // 1. ENGINE: Logic to load the track data only
  const playTrackEngine = useCallback((req) => {
    setVideoModalId(req.youtube_video_id);
    setCurrentPlayingRequest(req);
    setPlayingRequestId(req.id);
  }, []);

  // 2. MANUAL HANDLER: User clicked a song -> ALWAYS Open Player
  const handleManualPlay = useCallback((req) => {
    playTrackEngine(req);
    setIsMinimized(false); // Force open
    setAutoPlay(false);    // User took control
  }, [playTrackEngine]);

  // 3. SYSTEM HANDLER: Autoplay triggered -> RESPECT Minimized State
  const handleSystemAutoplay = useCallback((req) => {
    playTrackEngine(req);
    setAutoPlay(true);     // Keep system control
    // We DO NOT call setIsMinimized(false) here, so it stays hidden if hidden.
  }, [playTrackEngine]);

  // 4. NEXT SONG LOGIC: Uses System Handler
  const handleNextSong = useCallback(() => {
    if (!nextSong) return;

    // Fix: Only auto-mark as "played" if it was in the "approved" queue
    if (currentPlayingRequest && currentPlayingRequest.status === "approved") {
      handleUpdateStatus(currentPlayingRequest.id, "played");
    }

    // Trigger System Autoplay
    handleSystemAutoplay(nextSong);
  }, [nextSong, currentPlayingRequest, handleUpdateStatus, handleSystemAutoplay]);


  // --- Toggle Requests (Pause/Resume) ---
  const toggleAccepting = async () => {
     const newValue = !acceptingRequests;
     setAcceptingRequests(newValue);
     
     // Update DB
     if (djProfile) {
        await supabaseBrowserClient
           .from('dj_profiles')
           .update({ accepting_requests: newValue })
           .eq('id', djProfile.id);
           
        // Trigger Broadcast Modal/Logic if Pausing
        if (!newValue) {
           // Logic to prompt for broadcast (optional)
        }
     }
  };

  const clearAllFiltered = async () => {
    if(!confirm(`Delete ALL ${filterStatus} requests? This cannot be undone.`)) return;
    
    // Filter out the ones we are deleting
    const idsToDelete = filteredRequests.map(r => r.id);
    setRequests(prev => prev.filter(r => !idsToDelete.includes(r.id)));

    // API call to batch delete would go here
  };

  if (loading) return <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white"><div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <main 
      className="
        h-screen overflow-y-scroll 
        bg-[#0a0a0f] text-white bg-gradient-to-b from-[#0a0a0f] via-[#0d0d14] to-[#0a0a0f]
        [&::-webkit-scrollbar]:w-2
        [&::-webkit-scrollbar-track]:bg-[#0a0a0f]
        [&::-webkit-scrollbar-thumb]:bg-[#2a2a35]
        [&::-webkit-scrollbar-thumb]:rounded-full
        hover:[&::-webkit-scrollbar-thumb]:bg-[#3a3a4a]
      "
    >
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-32">
        
        {/* HEADER */}
        <header className="flex items-center justify-between mb-8 sm:mb-12">
           <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 p-[2px] shadow-lg shadow-pink-500/20 group-hover:shadow-pink-500/40 transition-all duration-500">
                  <div className="w-full h-full bg-[#0a0a0f] rounded-2xl flex items-center justify-center overflow-hidden">
                    <Disc3 size={28} className="text-white group-hover:rotate-180 transition-transform duration-700" />
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-4 border-[#0a0a0f] rounded-full" />
              </div>
              
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-gray-500">
                  TextMyTrack
                </h1>
                <div className="flex items-center gap-2 mt-1">
                   <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                      DJ DASHBOARD
                   </span>
                   {djProfile?.tag && (
                     <span className="px-2 py-0.5 rounded-md bg-pink-500/10 border border-pink-500/20 text-[10px] font-bold tracking-wider text-pink-400 uppercase">
                       @{djProfile.tag}
                     </span>
                   )}
                </div>
              </div>
           </div>

           <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsAddSongOpen(true)}
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-white transition-all group"
              >
                <Plus size={16} className="text-pink-400 group-hover:scale-110 transition-transform" />
                <span>Add Song</span>
              </button>

              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl transition-all hover:rotate-90 duration-500"
              >
                <Settings size={20} />
              </button>
           </div>
        </header>

        {/* --- MODALS --- */}
        <SettingsModal 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
          djProfile={djProfile}
          user={djProfile} // Alias for settings
          universalNumber={UNIVERSAL_NUMBER}
          onSave={setDjProfile}
        />

        <AddSongModal
           isOpen={isAddSongOpen}
           onClose={() => setIsAddSongOpen(false)}
           djId={djProfile?.id}
        />

        {/* --- VIDEO PLAYER --- */}
        {videoModalId && (
          <PlayerModal
            videoId={videoModalId}
            request={currentPlayingRequest}
            nextSong={nextSong}
            isMinimized={isMinimized}
            isMuted={isMuted}
            autoPlay={autoPlay}
            onClose={() => { setVideoModalId(null); setIsMinimized(false); }}
            onMinimize={() => setIsMinimized(true)}
            onMaximize={() => setIsMinimized(false)}
            onTogglePlay={() => {/* Internal player toggle handled by ref */}}
            onToggleMute={() => setIsMuted(!isMuted)}
            onToggleAutoPlay={() => setAutoPlay(!autoPlay)}
            onSkip={handleNextSong}
            onApprove={() => handleUpdateStatus(currentPlayingRequest.id, "approved")}
            onMarkPlayed={() => handleUpdateStatus(currentPlayingRequest.id, "played")}
            onVideoEnd={handleNextSong} // Trigger next song when video ends
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* SIDEBAR (Stats + Chat) */}
          <div className="lg:col-span-4 space-y-6">
             <StatsSidebar 
                djProfile={djProfile}
                universalNumber={UNIVERSAL_NUMBER}
                acceptingRequests={acceptingRequests}
                toggleAccepting={toggleAccepting}
                platform={selectedPlatform}
                setPlatform={setSelectedPlatform}
                platformsConfig={PLATFORMS}
             />
          </div>

          {/* MAIN LIST AREA */}
          <div className="lg:col-span-8">
             
             {/* Tabs */}
             <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilterStatus(tab.key)}
                    className={`
                      px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all border
                      ${filterStatus === tab.key 
                        ? "bg-white text-black border-white shadow-lg shadow-white/10 scale-105" 
                        : "bg-white/5 text-gray-400 border-transparent hover:bg-white/10 hover:text-white"
                      }
                    `}
                  >
                    {tab.label}
                    <span className={`ml-2 px-1.5 py-0.5 rounded-md text-[10px] ${filterStatus === tab.key ? "bg-black/10 text-black" : "bg-white/10"}`}>
                       {tab.key === "all" 
                         ? requests.length 
                         : requests.filter(r => r.status === tab.key).length
                       }
                    </span>
                  </button>
                ))}
                
                <div className="flex-1" />

                {/* "Clear All" Button */}
                <button 
                  onClick={clearAllFiltered} 
                  disabled={filteredRequests.length === 0}
                  className={`flex-shrink-0 p-2.5 rounded-xl transition-colors border ${
                    filteredRequests.length > 0 
                      ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' 
                      : 'bg-white/5 border-transparent text-gray-600 pointer-events-none' 
                  }`}
                  title="Clear List"
                >
                  <Trash2 size={18} />
                </button>
             </div>

            <DragDropContext onDragEnd={handleOnDragEnd}>
                 <RequestList 
                   requests={filteredRequests}
                   loading={loading}
                   filterStatus={filterStatus}
                   currentPlayingId={playingRequestId}
                   
                   // CRITICAL FIX: Pass the Manual Handler here
                   onPlay={handleManualPlay}
                   
                   onUpdateStatus={handleUpdateStatus}
                   onDelete={handleDelete}
                   platformPreference={selectedPlatform}
                   tabLabel={TABS.find(t => t.key === filterStatus)?.label}
                   droppableId="request-list" 
                 />
            </DragDropContext>

            {/* SPACER DIV */}
            <div className={`transition-all duration-300 w-full ${videoModalId && isMinimized ? "h-64" : "h-24"}`} />
          </div>
        </div>
      </div>
    </main>
  );
}