"use client";

import { useEffect, useRef, useState } from "react";
import { 
  Play, Pause, Volume2, VolumeX, SkipForward, 
  ThumbsUp, Check, Minimize2, Maximize2, X, Music 
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
  
  // CRITICAL FIX: Use refs for callbacks to avoid stale closures
  const onVideoEndRef = useRef(onVideoEnd);
  
  // Keep the ref updated with the latest callback
  useEffect(() => {
    onVideoEndRef.current = onVideoEnd;
  }, [onVideoEnd]);

  useEffect(() => {
    loadYoutubeScript();
  }, []);

  // Initialize player ONCE, then just load new videos
  useEffect(() => {
    if (!videoId) return;

    let initTimeout;
    let isSubscribed = true; // Track if effect is still active

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) {
        initTimeout = setTimeout(initPlayer, 100);
        return;
      }
      
      // If player exists, just load the new video
      if (playerRef.current) {
        try {
          playerRef.current.loadVideoById(videoId);
          // CRITICAL FIX: Explicitly call playVideo after a short delay to ensure autoplay works when minimized
          setTimeout(() => {
            if (isSubscribed && playerRef.current) {
              try {
                playerRef.current.playVideo();
                setIsPlaying(true);
              } catch (e) {
                console.error("Error starting playback:", e);
              }
            }
          }, 200);
        } catch (e) {
          console.error("Error loading video:", e);
        }
        return;
      }

      // Create player only once
      playerRef.current = new window.YT.Player(PLAYER_ID, {
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          mute: 1, // Always start muted to avoid autoplay restrictions
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          controls: 1, 
        },
        events: {
          onReady: (event) => {
            if (isSubscribed) {
              event.target.playVideo();
              setIsPlaying(true);
            }
          },
          onStateChange: (event) => {
            if (!isSubscribed) return;
            
            if (event.data === window.YT.PlayerState.ENDED) {
              // Use ref to get the latest callback
              onVideoEndRef.current?.();
            } else if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
            } else if (event.data === window.YT.PlayerState.PAUSED || event.data === window.YT.PlayerState.BUFFERING) {
              setIsPlaying(false);
            }
          },
          onError: (e) => {
            console.error("Player Error:", e);
            if (isSubscribed) {
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

    // Cleanup only clears timeout, does NOT destroy player (player persists across video changes)
    return () => {
      isSubscribed = false;
      clearTimeout(initTimeout);
    };
  }, [videoId]); // Only depend on videoId - mute is handled separately

  // Separate cleanup effect that only runs on unmount
  useEffect(() => {
    return () => {
      const playerInstance = playerRef.current;
      if (playerInstance) {
        try {
          if (typeof playerInstance.destroy === 'function') {
            playerInstance.stopVideo();
            playerInstance.destroy();
          }
        } catch (e) {
          console.error("Error destroying player on unmount:", e);
        } finally {
          playerRef.current = null;
        }
      }
    };
  }, []); // Empty deps = only runs on unmount 

  useEffect(() => {
    if (!playerRef.current?.mute) return;
    try {
      isMuted ? playerRef.current.mute() : playerRef.current.unMute();
    } catch(e) {
      console.error("Error setting mute state:", e);
    }
  }, [isMuted]);

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

  if (!videoId || !request) return null;

  return (
    <>
      {/* 
        FIX: Wrapper container that handles ALL positioning.
        The inner div (PLAYER_ID) gets replaced by YouTube's iframe,
        so we can't rely on its classes for positioning.
      */}
      <div 
        className={`fixed bg-black transition-all duration-300 overflow-hidden ${
          isMinimized 
            ? "w-[1px] h-[1px] opacity-0 pointer-events-none top-0 left-0" 
            : "rounded-t-xl z-[60]"
        }`}
        style={!isMinimized ? {
          width: 'calc(100vw - 32px)',
          maxWidth: '896px', // max-w-4xl equivalent
          aspectRatio: '16/9',
          top: '50%',
          left: '50%',
          transform: 'translateX(-50%) translateY(calc(-50% - 60px))', // Offset up to account for controls below
        } : undefined}
      >
        {/* This div gets replaced by YouTube iframe - it just fills the container */}
        <div 
          id={PLAYER_ID}
          className="w-full h-full"
        />
      </div>

      {/* THE VISIBLE MODAL UI CONTAINER */}
      <div
        className={`fixed z-50 transition-all duration-300 ${
          isMinimized
            ? "bottom-0 left-0 w-full" 
            : "inset-0 flex items-center justify-center p-4 backdrop-blur-sm bg-black/50" 
        }`}
      >
        <div
          className={`relative bg-[#12121a] shadow-2xl border border-white/5 ${
            isMinimized 
              ? "h-auto rounded-t-xl rounded-b-none w-full"
              : "w-full max-w-4xl h-full max-h-[90vh] rounded-xl"
          }`}
        >
          
          {/* Maximized Player Controls and Info */}
          {!isMinimized && (
            <div className="flex flex-col h-full relative"> 
              
              {/* Video Container - transparent placeholder, actual video is in the fixed container above */}
              <div className="w-full relative aspect-video bg-black rounded-t-xl overflow-hidden">
                {!playerRef.current && (
                  <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                    <Music size={32} className="text-gray-500 animate-spin" />
                  </div>
                )}
              </div>

              {/* Controls and Info (Maximized) */}
              <div className="flex-1 p-4 sm:p-6 flex flex-col justify-between"> 
                
                {/* Song Info */}
                <div className="mb-4">
                  <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 truncate">{request.title}</h2>
                  <p className="text-md sm:text-lg text-gray-400 truncate">{request.artist}</p>
                  <p className="text-xs text-gray-500 mt-1">Requested by: <span className="text-gray-300 font-medium">{request.requestedBy}</span></p>
                </div>

                {/* Status and Next Song */}
                <div className="flex justify-between items-center mb-6 text-sm">
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    request.status === 'approved' ? 'bg-blue-500/10 text-blue-400' :
                    request.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                    'bg-gray-500/10 text-gray-400'
                  }`}>
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </div>
                  {nextSong && (
                    <div className="flex items-center gap-2 text-gray-500">
                      <span className="text-xs">Up next:</span>
                      <span className="text-gray-300 font-medium truncate max-w-[150px]">{nextSong.title}</span>
                    </div>
                  )}
                </div>
                
                {/* Main Controls */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                  
                  {/* Left: Actions */}
                  <div className="flex gap-3 w-full sm:w-auto">
                    <button 
                      onClick={onApprove} 
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-medium transition-colors w-1/2 sm:w-auto justify-center"
                      title="Approve and Play Next"
                    >
                      <ThumbsUp size={18} /> <span className="hidden sm:block">Approve</span>
                    </button>
                    <button 
                      onClick={onMarkPlayed} 
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-400 font-medium transition-colors w-1/2 sm:w-auto justify-center"
                      title="Mark as Played"
                    >
                      <Check size={18} /> <span className="hidden sm:block">Played</span>
                    </button>
                  </div>

                  {/* Center: Playback */}
                  <div className="flex gap-3 p-3 bg-white/5 rounded-xl w-full sm:w-auto justify-center">
                    <button onClick={onSkip} className="p-2 hover:bg-white/10 rounded-lg text-white" title="Skip to Next">
                      <SkipForward size={20} />
                    </button>
                    <button onClick={handleTogglePlay} className="p-2 bg-pink-600 hover:bg-pink-700 rounded-lg text-white transition-colors" title={isPlaying ? "Pause" : "Play"}>
                      {isPlaying ? <Pause size={20} className="fill-white" /> : <Play size={20} className="fill-white" />}
                    </button>
                    <button onClick={onToggleMute} className={`p-2 rounded-lg transition-colors ${isMuted ? "bg-white/10 text-gray-400 hover:bg-white/20" : "bg-white/20 text-white hover:bg-white/30"}`} title={isMuted ? "Unmute" : "Mute"}>
                      {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </button>
                  </div>
                  
                  {/* Right: Min/Close */}
                  <div className="flex gap-3 w-full sm:w-auto justify-center sm:justify-end">
                    <button onClick={onMinimize} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-colors">
                      <Minimize2 size={20} />
                    </button>
                    <button onClick={onClose} className="p-3 bg-red-500/10 hover:bg-red-500/20 rounded-xl text-red-400 transition-colors">
                      <X size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Minimized Player */}
          {isMinimized && request && (
            <div className="flex items-center p-3 w-full">
              <div className="flex items-center gap-3 cursor-pointer flex-1 min-w-0" onClick={onMaximize}>
                <div 
                  className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-300 ${
                    isPlaying ? 'bg-pink-500/20' : 'bg-gray-500/10'
                  }`}
                >
                   <Music size={16} className={`${isPlaying ? 'text-pink-400' : 'text-gray-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-white text-sm truncate">{request.title}</h4>
                  <p className="text-xs text-gray-400 truncate">{request.artist}</p>
                </div>
              </div>
              
              {/* Minimized Controls */}
              <div className="flex items-center gap-2 ml-auto flex-shrink-0">
                <button 
                  onClick={handleTogglePlay} 
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} className="fill-white" />} 
                </button>
                <button onClick={onMaximize} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white" title="Maximize Player">
                   <Maximize2 size={16} />
                </button>
                <button onClick={onClose} className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg" title="Stop and Close">
                  <X size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}