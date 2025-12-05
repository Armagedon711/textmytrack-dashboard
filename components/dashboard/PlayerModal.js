"use client";

import { useEffect, useRef, useState } from "react";
import { 
  Play, Pause, Volume2, VolumeX, SkipForward, 
  ThumbsUp, Check, Minimize2, Maximize2, X, Music 
} from "lucide-react";

// Function to load the YT IFrame API script
const loadYoutubeScript = () => {
  if (window.YT && window.YT.Player) return;

  const tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  const firstScriptTag = document.getElementsByTagName('script')[0];
  // Ensure we only insert if it's not already there
  if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
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
  onTogglePlay, // Keeping for compatibility, but logic is internal
  onToggleMute,
  onToggleAutoPlay,
  onSkip,
  onApprove,
  onMarkPlayed,
  onVideoEnd,
}) {
  const playerRef = useRef(null);
  // Default to true, as we autoplay when videoId is set
  const [isPlaying, setIsPlaying] = useState(true); 

  // Load the YouTube API script once on mount
  useEffect(() => {
    loadYoutubeScript();
  }, []);

  // Initialize YouTube Player
  useEffect(() => {
    if (!videoId) return;

    let playerInstance = null;
    let initTimeout;

    const initPlayer = () => {
      // Wait for YT API to be loaded
      if (!window.YT || !window.YT.Player) {
        initTimeout = setTimeout(initPlayer, 100);
        return;
      }
      
      // Destroy old player instance if it exists
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch (e) {}
        playerRef.current = null;
      }

      playerInstance = new window.YT.Player("youtube-player", {
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
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
            }
          },
          onError: (e) => {
            console.error("Player Error:", e);
            // Auto-skip on error after 2 seconds
            setTimeout(onVideoEnd, 2000);
          }
        },
      });
      playerRef.current = playerInstance;
    };
    
    // Use the global callback if the script hasn't finished loading yet
    if (window.YT && window.YT.Player) {
        initPlayer();
    } else {
        window.onYouTubeIframeAPIReady = initPlayer;
    }


    // Cleanup
    return () => {
      clearTimeout(initTimeout); // Clear the retry timeout
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.error("Error destroying player", e);
        }
      }
      // Note: We don't remove window.onYouTubeIframeAPIReady as it might break other components
    };
  }, [videoId, onVideoEnd]); 

  // Handle External Mute/Play Controls
  useEffect(() => {
    if (!playerRef.current?.mute) return;
    try {
      isMuted ? playerRef.current.mute() : playerRef.current.unMute();
    } catch(e) {}
  }, [isMuted]);
  
  // Handle Play/Pause
  const handleTogglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
      setIsPlaying(false);
    } else {
      playerRef.current.playVideo();
      setIsPlaying(true);
    }
  };

  if (!videoId || !request) return null;

  return (
    <div
      className={`fixed z-50 transition-all duration-300 ${
        isMinimized
          ? "bottom-4 right-4 w-full max-w-sm"
          : "inset-0 flex items-center justify-center p-4"
      }`}
    >
      <div
        className={`relative bg-[#12121a] rounded-xl shadow-2xl border border-white/5 ${
          isMinimized ? "h-auto" : "w-full max-w-4xl h-full max-h-[90vh]"
        }`}
      >
        
        {/* Minimized Player (FIXED: Ensure controls use current state) */}
        {isMinimized && request && (
          <div className="flex items-center p-3">
            <div className="flex items-center gap-3">
              {/* Active/Playing Icon */}
              <div 
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-300 ${
                  isPlaying ? 'bg-pink-500/20' : 'bg-gray-500/10'
                }`}
              >
                 <Music size={16} className={`${isPlaying ? 'text-pink-400' : 'text-gray-400'}`} />
              </div>
              <div className="flex-1 min-w-0 cursor-pointer" onClick={onMaximize}>
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
                {/* FIX: Use fill-white when playing to show the icon, especially Play */}
                {isPlaying ? <Pause size={16} /> : <Play size={16} className="fill-white" />} 
              </button>
              <button onClick={onClose} className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg" title="Stop and Close">
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Maximize Player (No changes needed here from last update) */}
        {!isMinimized && (
          <div className="flex flex-col h-full">
            
            {/* Video Container (Aspect Ratio Box) */}
            <div className="w-full relative aspect-video bg-black rounded-t-xl overflow-hidden">
              <div id="youtube-player" className="absolute inset-0 w-full h-full" />
              {/* Fallback if video fails/loads slowly */}
              {!playerRef.current && (
                 <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                    <Music size={32} className="text-gray-500 animate-spin" />
                 </div>
              )}
            </div>

            {/* Controls and Info */}
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
      </div>
    </div>
  );
}