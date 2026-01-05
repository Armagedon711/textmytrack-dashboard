"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabaseBrowserClient } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Disc3, Settings, LogOut, Trash2, MessageSquare, ChevronDown, ChevronUp, Power, ExternalLink, Plus, Phone } from "lucide-react";
import { DragDropContext } from "@hello-pangea/dnd"; 

// Components
import PlayerModal from "../components/dashboard/PlayerModal";
import RequestList from "../components/dashboard/RequestList";
import StatsSidebar from "../components/dashboard/StatsSidebar";
import SettingsModal from "../components/dashboard/SettingsModal";
import LiveChat from "../components/dashboard/LiveChat"; 
import AddSongModal from "../components/dashboard/AddSongModal"; 

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

// Helper to format phone numbers
const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return "...";
  let cleaned = ('' + phoneNumber).replace(/\D/g, '');
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
      cleaned = cleaned.substring(1);
  }
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return '(' + match[1] + ') ' + match[2] + '-' + match[3];
  }
  return phoneNumber;
};

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
  const [showAddSong, setShowAddSong] = useState(false); 
  const [isChatExpanded, setIsChatExpanded] = useState(false); 

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

  // --- Next Song Logic ---
  const nextSong = useMemo(() => {
    if (!currentPlayingRequest) return null;
    
    const queue = requests
        .filter(r => r.status === 'approved' && r.youtube_video_id)
        .sort((a, b) => (a.position || 0) - (b.position || 0));
    
    if (queue.length === 0) return null;

    const currentIndex = queue.findIndex(r => r.id === currentPlayingRequest.id);
    const next = queue[currentIndex + 1];
    
    return next || queue[0];
  }, [requests, currentPlayingRequest]);


  // --- Data Loading & Auth ---
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // 1. Initial Session Check
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        if (mounted) router.push("/login");
        return;
      }
      
      if (mounted) setUser(session.user);
      
      // 2. Load Profile
      const { data: profile } = await supabase.from("dj_profiles").select("*").eq("id", session.user.id).single();
      if (profile && mounted) {
        setDjProfile(profile);
        if (profile.preferred_platform) setSelectedPlatform(profile.preferred_platform);
      }

      // 3. Load Requests
      const { data: reqs } = await supabase
        .from('requests')
        .select('*')
        .eq('dj_id', session.user.id)
        .order('position', { ascending: true });
      
      if (reqs && mounted) setRequests(reqs);
      
      if (mounted) setLoading(false);
    };

    init();

    // 4. AUTH STATE LISTENER (Fixes Auto-Logout Issues)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push("/login");
        setUser(null);
      } else if (session?.user) {
        // If token refreshes, update the user state silently
        setUser(session.user);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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

  const handleOnDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(filteredRequests);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updates = items.map((item, index) => ({
        id: item.id,
        position: index * 1000 
    }));

    setRequests(prev => {
        const next = prev.map(r => {
            const update = updates.find(u => u.id === r.id);
            return update ? { ...r, position: update.position } : r;
        });
        return next;
    });

    const { error } = await supabase.from('requests').upsert(updates);
    if (error) console.error("Reorder failed", error);
  };

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

      {/* --- ADD SONG MODAL --- */}
      <AddSongModal 
        isOpen={showAddSong}
        onClose={() => setShowAddSong(false)}
        djId={user?.id}
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

      {/* Main Container */}
      <div className={`relative max-w-7xl mx-auto p-4 lg:p-8 ${videoModalId && isMinimized ? "pb-48" : "pb-24"}`}>
        
        {/* Desktop Header */}
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
            
            {/* --- ADD SONG BUTTON --- */}
            <button 
              onClick={() => setShowAddSong(true)} 
              className="p-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg shadow-lg shadow-pink-900/20 flex items-center gap-2 transition-all"
            >
              <Plus size={18} /> <span className="hidden sm:block font-bold">Add Song</span>
            </button>

            <button onClick={() => setShowSettings(true)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 flex items-center gap-2">
              <Settings size={18} /> <span className="hidden sm:block">Settings</span>
            </button>
            <button onClick={() => { supabase.auth.signOut(); router.push("/login"); }} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 flex items-center gap-2">
              <LogOut size={18} /> <span className="hidden sm:block">Logout</span>
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* LEFT SIDEBAR (Desktop Only) */}
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

          {/* MOBILE CONTROLS (Mobile Only) */}
          <div className="lg:hidden space-y-4 mb-6">
             {/* Row 1: Status & Platform */}
             <div className="grid grid-cols-2 gap-3">
                {/* Status Toggle */}
                <button 
                  onClick={toggleAccepting} 
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-colors ${
                    djProfile?.accepting_requests 
                      ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}
                >
                   <Power size={14} />
                   <span className="text-xs font-bold">{djProfile?.accepting_requests ? "Live" : "Paused"}</span>
                </button>

                {/* Platform Selector */}
                <div className="relative bg-[#12121a] rounded-xl border border-white/5">
                   <select 
                      value={selectedPlatform}
                      onChange={(e) => setSelectedPlatform(e.target.value)}
                      className="w-full h-full bg-transparent text-gray-300 text-xs font-medium px-3 py-0 appearance-none outline-none"
                   >
                      {Object.entries(PLATFORMS).map(([key, config]) => (
                        <option key={key} value={key}>{config.name}</option>
                      ))}
                   </select>
                   <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <ChevronDown size={14} className="text-gray-500" />
                   </div>
                </div>
             </div>

             {/* Row 2: MOBILE REQUEST NUMBER DISPLAY */}
             <div className="bg-[#12121a] rounded-xl border border-white/5 p-4 flex items-center justify-center text-center">
                 <div className="flex flex-col items-center">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Text Requests To</p>
                    <div className="flex items-center gap-2">
                       <Phone size={14} className="text-pink-400" />
                       {djProfile?.plan?.toLowerCase() === "headliner" ? (
                          <span className="text-lg font-bold text-white tracking-wide">
                            {formatPhoneNumber(djProfile?.twilio_number)}
                          </span>
                       ) : (
                          <span className="text-sm text-gray-300">
                             <span className="font-bold text-pink-400 text-base">{djProfile?.tag || "..."}</span> to <span className="font-bold text-white">{formatPhoneNumber(UNIVERSAL_NUMBER)}</span>
                          </span>
                       )}
                    </div>
                 </div>
             </div>

             {/* Expandable Chat */}
             <div className="bg-[#12121a] rounded-xl border border-white/5 overflow-hidden">
                <button 
                  onClick={() => setIsChatExpanded(!isChatExpanded)} 
                  className="w-full p-4 flex justify-between items-center text-sm font-medium text-gray-300 bg-[#16161f]"
                >
                   <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-green-500/10 text-green-400">
                        <MessageSquare size={14} />
                      </div>
                      <span>Live Text Feed</span>
                   </div>
                   {isChatExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                
                {isChatExpanded && (
                   <div className="border-t border-white/5 h-[350px]">
                      {djProfile?.id && (
                        <LiveChat 
                          djId={djProfile.id} 
                          showHeader={false} 
                          className="h-full mt-0 rounded-none border-0" 
                        />
                      )}
                   </div>
                )}
             </div>
          </div>

          {/* MAIN CONTENT AREA */}
          <div className="lg:col-span-3">
             
             {/* UPDATED: Tabs Layout (Pinned Trash Can) */}
             <div className="flex items-center justify-between gap-3 mb-6">
                {/* Scrollable Tabs Area */}
                <div className="flex-1 flex items-center gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                    {TABS.map(tab => (
                      <button 
                        key={tab.key}
                        onClick={() => setFilterStatus(tab.key)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border flex-shrink-0 ${
                          filterStatus === tab.key 
                          ? "bg-white/10 border-white/20 text-white" 
                          : "bg-[#12121a] border-transparent text-gray-400 hover:bg-white/5"
                        }`}
                      >
                        {tab.label} <span className="ml-1 text-xs opacity-50">{tab.key === 'all' ? stats.total : stats[tab.key]}</span>
                      </button>
                    ))}
                </div>

                {/* Fixed "Clear All" Button */}
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
                   onPlay={handlePlayRequest}
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