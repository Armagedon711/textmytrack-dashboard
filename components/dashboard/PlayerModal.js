"use client";

import { useEffect, useRef, useState } from "react";
import { 
  Play, Pause, Volume2, VolumeX, SkipForward, 
  ThumbsUp, Check, Minimize2, Maximize2, X, Music 
} from "lucide-react";

const PLAYER_ID = "youtube-player-persistence"; // CRITICAL: Single ID for persistence

// Function to load the YT IFrame API script
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

  useEffect(() => {
    loadYoutubeScript();
  }, []);

  // Initialize YouTube Player ONLY ONCE or update the video when ID changes.
  useEffect(() => {
    if (!videoId) return;

    let initTimeout;

    const initPlayer = () => {
      // Wait for YT API to be loaded
      if (!window.YT || !window.YT.Player) {
        initTimeout = setTimeout(initPlayer, 100);
        return;
      }
      
      // If the player instance exists, just load the new video and return
      if (playerRef.current) {
        playerRef.current.loadVideoById(videoId);
        isMuted ? playerRef.current.mute() : playerRef.current.unMute();
        setIsPlaying(true);
        return;
      }

      // Initialize the player the first time
      playerRef.current = new window.YT.Player(PLAYER_ID, {
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          mute: isMuted ? 1 : 0, 
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          controls: 1, 
        },
        events: {
          onReady: (event) => {
            event.target.playVideo();
            setIsPlaying(true);
          },
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              onVideoEnd();
            } else if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
            } else if (event.data === window.YT.PlayerState.PAUSED || event.data === window.YT.PlayerState.BUFFERING) {
              setIsPlaying(false);
            }
          },
          onError: (e) => {
            console.error("Player Error:", e);
            setTimeout(onVideoEnd, 2000); // Skip on error
          }
        },
      });
    };
    
    // Logic to call initPlayer
    if (window.YT && window.YT.Player) {
        initPlayer();
    } else {
        window.onYouTubeIframeAPIReady = initPlayer;
    }

    // Cleanup: Only runs when the component UNMOUNTS (e.g., when you click Close/X)
    return () => {
      clearTimeout(initTimeout); 
      
      const playerInstance = playerRef.current;
      if (playerInstance) {
        try {
          // Robust check for destroy method to prevent site crash on close
          if (typeof playerInstance.destroy === 'function') {
              playerInstance.stopVideo(); 
              playerInstance.destroy();
          }
        } catch (e) {
          console.error("Error destroying player on unmount:", e);
        } finally {
          playerRef.current = null; // CRITICAL: Ensure the ref is cleared
        }
      }
    };
  }, [videoId, isMuted, onVideoEnd]); 

  // Handle Mute
  useEffect(() => {
    if (!playerRef.current?.mute) return;
    try {
      isMuted ? playerRef.current.mute() : playerRef.current.unMute();
    } catch(e) {
      console.error("Error setting mute state:", e);
    }
  }, [isMuted]);

  // Handle Play/Pause
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
  
  // CRITICAL: Dynamic positioning for the fixed YouTube player container
  const playerContainerClasses = isMinimized 
    // FIX 1: Minimal size/visibility classes when minimized.
    ? "w-[1px] h-[1px] overflow-hidden pointer-events-none transition-all duration-300" 
    // Maximize: Centered within viewport, z-40 (Behind z-50 modal container)
    : "w-full aspect-video top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-t-xl transition-all duration-300 z-40"; 

  return (
    <>
      {/* 1. CRITICAL: The persistent fixed YouTube iframe container (always in DOM) */}
      <div 
        id={PLAYER_ID}
        className={`fixed bg-black ${playerContainerClasses}`}
        style={isMinimized 
          ? { 
              // FIX 1: Aggressively override all positioning/transforms when minimized
              top: '0px', 
              left: '0px',
              transform: 'none', // CRITICAL: Explicitly remove all centering transforms
              opacity: 0,
            } 
          : {
              // Constraints for maximized player (Tailwind classes handle centering)
              maxWidth: 'calc(100vw - 32px)', 
              maxHeight: 'calc(90vh - 32px)',
            }
        }
      />


      {/* 2. THE VISIBLE MODAL UI CONTAINER (Wraps controls and backdrop) */}
      <div
        className={`fixed z-50 transition-all duration-300 ${ // z-50 is the backdrop and container
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
          
          {/* Maximize Player Controls and Info */}
          {!isMinimized && (
            <div className="flex flex-col h-full relative z-55"> 
              
              {/* Video Container (Aspect Ratio Box) - Transparent placeholder for the video element */}
              <div 
                className="w-full relative aspect-video bg-black rounded-t-xl overflow-hidden" 
              >
                {/* Fallback/Loading Overlay */}
                 {!playerRef.current && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-56">
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
              <div className="flex items-center gap-3 cursor-pointer" onClick={onMaximize}>
                {/* Active/Playing Icon */}
                <div 
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-300 ${
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
              <div className="flex items-center gap-2 ml-auto">
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