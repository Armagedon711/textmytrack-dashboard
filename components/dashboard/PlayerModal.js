"use client";

import { useEffect, useRef, useState } from "react";
import { 
  Play, Pause, Volume2, VolumeX, SkipForward, 
  ThumbsUp, Check, Minimize2, Maximize2, X, Music, Ban 
} from "lucide-react";

const PLAYER_ID = "youtube-player-persistence";

const loadYoutubeScript = () => {
  if (window.YT && window.YT.Player) return;

  const tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  const firstScriptTag = document.getElementsByTagName('script')[0];
  if (!document.querySelector(`script[src="https://www.youtube.com/iframe_api"]`)) {
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
  }
};

export default function PlayerModal({
  videoId,
  request,
  nextSong,
  isMinimized,
  isMuted,
  autoPlay,
  onClose,
  onMinimize,
  onMaximize,
  onTogglePlay, 
  onToggleMute,
  onToggleAutoPlay,
  onSkip,
  onApprove,
  onMarkPlayed,
  onVideoEnd,
}) {
  const playerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFirstSong, setIsFirstSong] = useState(true); 
  
  const onVideoEndRef = useRef(onVideoEnd);
  
  // Track mount status to prevent updates on unmounted component
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);
  
  useEffect(() => {
    onVideoEndRef.current = onVideoEnd;
  }, [onVideoEnd]);

  useEffect(() => {
    loadYoutubeScript();
  }, []);

  // Main Player Logic with RESILIENCE FIX
  useEffect(() => {
    // If no video, do nothing
    if (!videoId) {
        setIsFirstSong(true);
        return;
    }

    let initTimeout;

    const initPlayer = () => {
      // Retry if API isn't ready
      if (!window.YT || !window.YT.Player) {
        initTimeout = setTimeout(initPlayer, 100);
        return;
      }
      
      const loadVideoAndPlay = (target) => {
        try {
          const currentData = target.getVideoData ? target.getVideoData() : null;
          const currentId = currentData ? currentData.video_id : null;

          // Only load if it's actually a different video or if the player stopped
          if (currentId !== videoId) {
             setIsFirstSong(false);
             target.loadVideoById({
                 videoId: videoId,
                 startSeconds: 0
             });
             setIsPlaying(true);
          } else {
             // If it's the same video (re-opened), just ensure it plays
             if (target.getPlayerState() !== window.YT.PlayerState.PLAYING) {
                target.playVideo();
             }
          }
        } catch (e) {
          console.error("Error loading video:", e);
        }
      };
      
      // Check if player instance exists AND if the iframe is actually in the DOM
      // (Fixes the "black screen" when re-opening the same song)
      const playerIframe = playerRef.current ? playerRef.current.getIframe() : null;
      
      if (playerRef.current && playerIframe && document.contains(playerIframe)) {
        loadVideoAndPlay(playerRef.current);
        return;
      }

      // If we get here, we need a fresh player instance
      // First, safety destroy any lingering instance to prevent ghosts
      if (playerRef.current) {
         try { playerRef.current.destroy(); } catch(e) {}
      }

      playerRef.current = new window.YT.Player(PLAYER_ID, {
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          mute: 1, 
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          controls: 1, 
        },
        events: {
          onReady: (event) => {
            if (isMountedRef.current) {
              if (!isMuted) {
                event.target.unMute();
              }
              event.target.playVideo();
              setIsPlaying(true);
              setIsFirstSong(true);
            }
          },
          onStateChange: (event) => {
            if (!isMountedRef.current) return;
            
            if (event.data === window.YT.PlayerState.ENDED) {
              onVideoEndRef.current?.();
            } else if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
            } else if (event.data === window.YT.PlayerState.PAUSED || event.data === window.YT.PlayerState.BUFFERING) {
              setIsPlaying(false);
            }
          },
          onError: (e) => {
            console.error("Player Error:", e);
            if (isMountedRef.current) {
              setTimeout(() => onVideoEndRef.current?.(), 2000);
            }
          }
        },
      });
    };
    
    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    // CLEANUP: Determines Player Resilience
    return () => {
      clearTimeout(initTimeout);
      // NOTE: We do NOT destroy the player here if we are just minimizing. 
      // But if the component actually unmounts (modal close), we should eventually clean up.
      // However, for persistent audio, we usually keep the ref. 
      // The "black screen" fix is handled by the 'document.contains' check above.
    };
  }, [videoId]); 

  // Mute/Unmute Logic
  useEffect(() => {
    if (!playerRef.current?.mute) return;
    try {
      if (isMuted) {
        playerRef.current.mute();
      } else {
        if (isFirstSong) {
            playerRef.current.unMute();
            playerRef.current.seekTo(0);
            playerRef.current.playVideo();
            setIsFirstSong(false); 
        } else {
            playerRef.current.unMute();
        }
      }
    } catch(e) {
      console.error("Error setting mute state:", e);
    }
  }, [isMuted, isFirstSong]);

  const handleTogglePlay = () => {
    if (!playerRef.current) return;
    try {
      if (isPlaying) {
        playerRef.current.pauseVideo();
        setIsPlaying(false);
      } else {
        playerRef.current.playVideo();
        setIsPlaying(true);
      }
    } catch(e) {
      console.error("Error toggling play:", e);
    }
  };
  
  const handleReject = () => {
    alert(`Rejecting request ID: ${request.id}`);
    onSkip();
  };
  
  let tagsToDisplay = [];
  if (request) {
      tagsToDisplay = [request.genre, request.mood, request.energy].filter(Boolean);
      if (request.explicit === 'Explicit') tagsToDisplay.push('Explicit');
  }

  if (!videoId || !request) return null;

  return (
    <div
      className={`fixed z-50 transition-all duration-300 ${
        isMinimized
          ? "bottom-0 left-0 w-full pointer-events-auto" 
          : "inset-0 flex items-center justify-center p-0 sm:p-4 backdrop-blur-sm bg-black/60" 
      }`}
      onClick={!isMinimized ? onMinimize : undefined}
    >
      <div
        className={`relative bg-[#12121a] shadow-2xl border-t sm:border border-white/5 overflow-hidden flex flex-col ${
          isMinimized 
            ? "h-auto rounded-t-xl rounded-b-none w-full"
            : "w-full sm:max-w-4xl h-full sm:h-auto sm:max-h-[90vh] sm:rounded-2xl ring-1 ring-white/10"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* PLAYER AREA */}
        <div className={`w-full bg-black relative transition-all duration-300 ${
            isMinimized ? "h-0 opacity-0 pointer-events-none" : "aspect-video flex-shrink-0"
        }`}>
            <div id={PLAYER_ID} className="w-full h-full" />
        </div>

        {/* CONTROLS UI */}
        {!isMinimized && (
            <div className="flex-1 flex flex-col overflow-y-auto sm:overflow-visible"> 
              
              {/* MAIN CONTENT PADDING */}
              <div className="p-4 sm:p-6 pb-2">
                {/* Header Row: Title/Artist + Window Controls */}
                <div className="flex justify-between items-start mb-4 gap-2">
                  <div className="min-w-0 pr-2">
                    <h2 className="text-xl sm:text-3xl font-bold text-white mb-1 truncate leading-tight tracking-tight">{request.title}</h2> 
                    <p className="text-md sm:text-lg text-gray-400 truncate font-medium">{request.artist}</p>
                  </div>
                  
                  {/* Window Controls */}
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={onMinimize} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-300 transition-colors" title="Minimize">
                      <Minimize2 size={20} />
                    </button>
                    <button onClick={onClose} className="p-2 bg-white/5 hover:bg-red-500/20 hover:text-red-400 rounded-full text-gray-300 transition-colors" title="Close">
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {/* Info Row: Meta + Tags + Up Next */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-white/5 pb-6">
                  
                  {/* Left: Request Info & Tags */}
                  <div className="flex flex-col gap-3 w-full sm:w-auto">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                         <span className="font-medium text-gray-500">Requested by</span>
                         <span className="text-white font-semibold">{request.requestedBy}</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 items-center">
                          {/* Status Badge */}
                          <div className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                            request.status === 'approved' ? 'bg-blue-500/20 text-blue-400' :
                            request.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {request.status}
                          </div>

                          <div className="hidden sm:block h-4 w-[1px] bg-white/10 mx-1"></div>

                          {tagsToDisplay.map(tag => (
                             <span key={tag} className="px-2.5 py-1 rounded-md text-xs font-medium bg-white/5 text-gray-300 border border-white/5">
                                {tag}
                             </span>
                          ))}
                      </div>
                  </div>

                  {/* Right: Up Next */}
                  {nextSong && (
                    <div className="w-full sm:w-auto flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 sm:max-w-xs mt-2 sm:mt-0">
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wider shrink-0">Up Next</div>
                      <div className="text-sm text-gray-200 font-medium truncate">{nextSong.title}</div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* CONTROL BAR (Footer) - RESPONSIVE LAYOUT */}
              <div className="bg-[#0e0e14] p-4 sm:px-6 mt-auto border-t border-white/5">
                {/* MOBILE: Flex Column (Playback -> Settings -> Admin)
                   DESKTOP: 3-Column Grid 
                */}
                <div className="flex flex-col gap-6 sm:grid sm:grid-cols-3 sm:gap-4 items-center">

                    {/* 1. Playback Controls (Mobile: Top / Desktop: Center) */}
                    {/* Order: 2 on desktop to be in middle, but 1 on mobile to be top */}
                    <div className="flex items-center justify-center gap-6 order-1 sm:order-2 w-full sm:w-auto">
                      <button onClick={onSkip} className="text-gray-500 hover:text-white transition-colors p-2 sm:hidden rotate-180" title="Previous (Visual only)">
                        <SkipForward size={24} />
                      </button>
                      
                      <button 
                        onClick={handleTogglePlay} 
                        className="w-16 h-16 sm:w-14 sm:h-14 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 transition-all shadow-lg shadow-white/10"
                      >
                        {isPlaying ? <Pause size={32} className="fill-black" /> : <Play size={32} className="fill-black ml-1" />}
                      </button>
                      
                      <button onClick={onSkip} className="text-gray-400 hover:text-white transition-colors p-2" title="Skip">
                        <SkipForward size={28} />
                      </button>
                    </div>

                    {/* 2. Settings (Mobile: Middle / Desktop: Right) */}
                    <div className="flex items-center justify-center sm:justify-end gap-4 order-2 sm:order-3 w-full sm:w-auto">
                        <button onClick={onToggleMute} className={`p-2 rounded-lg transition-colors ${isMuted ? "text-gray-500 hover:text-gray-300" : "text-gray-300 hover:text-white"}`}>
                            {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                        </button>
                        
                        <button 
                            onClick={onToggleAutoPlay} 
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide transition-colors border ${
                            autoPlay 
                                ? 'bg-purple-500/20 border-purple-500/30 text-purple-300' 
                                : 'bg-transparent border-white/10 text-gray-500 hover:border-white/20'
                            }`}
                        >
                            AutoPlay {autoPlay ? 'ON' : 'OFF'}
                        </button>
                    </div>

                    {/* 3. Admin Actions (Mobile: Bottom / Desktop: Left) */}
                    <div className="flex w-full sm:w-auto gap-3 order-3 sm:order-1 sm:justify-start">
                        {/* Mobile: Full width buttons. Desktop: Auto width */}
                        {(request.status === 'pending') ? (
                            <div className="grid grid-cols-2 gap-3 w-full sm:flex sm:w-auto sm:gap-2">
                                <button onClick={onApprove} className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-medium transition-colors">
                                    <ThumbsUp size={18} /> <span className="sm:hidden">Approve</span>
                                </button>
                                <button onClick={handleReject} className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium transition-colors">
                                    <Ban size={18} /> <span className="sm:hidden">Reject</span>
                                </button>
                            </div>
                        ) : (
                            <button 
                                onClick={onMarkPlayed} 
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-medium transition-colors text-sm"
                            >
                                <Check size={18} /> <span>Mark Played</span>
                            </button>
                        )}
                    </div>

                </div>
              </div>
            </div>
        )}

        {/* Minimized Player UI */}
        {isMinimized && request && (
          <div className="flex items-center p-3 w-full bg-[#12121a] border-t border-white/10">
            {/* ... (Same minimized code) ... */}
            <div className="flex items-center gap-3 cursor-pointer flex-1 min-w-0 group" onClick={onMaximize}>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden relative ${isPlaying ? 'bg-gray-800' : 'bg-gray-900'}`}>
                 {request.thumbnail ? (
                     <img src={request.thumbnail} alt="Thumbnail" className="w-full h-full object-cover" />
                 ) : (
                     <Music size={20} className="text-gray-600" />
                 )}
                 <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 size={16} className="text-white" />
                 </div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-white text-sm truncate">{request.title}</h4>
                <p className="text-xs text-gray-400 truncate">{request.artist}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1 ml-4 flex-shrink-0">
               <button onClick={handleTogglePlay} className="p-2.5 bg-white text-black rounded-full hover:scale-105 transition-transform mr-2">
                {isPlaying ? <Pause size={16} className="fill-black" /> : <Play size={16} className="fill-black ml-0.5" />} 
              </button>
              <button onClick={onSkip} className="p-2 hover:bg-white/10 rounded-lg text-gray-300">
                <SkipForward size={18} />
              </button>
              <button onClick={onClose} className="p-2 hover:bg-white/10 text-gray-300 rounded-lg ml-1">
                <X size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}