"use client";

import { useEffect, useRef, useState } from "react";
import { 
  Play, Pause, Volume2, VolumeX, SkipForward, 
  ThumbsUp, Check, Minimize2, Maximize2, X, Music 
} from "lucide-react";

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

  // Initialize YouTube Player
  useEffect(() => {
    if (!videoId) return;

    let playerInstance = null;

    const initPlayer = () => {
      // If YT API isn't loaded yet, wait
      if (!window.YT || !window.YT.Player) {
        setTimeout(initPlayer, 100);
        return;
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

    initPlayer();

    // Cleanup
    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.error("Error destroying player", e);
        }
      }
    };
  }, [videoId]); // Re-initialize only when videoId changes

  // Handle External Mute/Play Controls
  useEffect(() => {
    if (!playerRef.current?.mute) return;
    try {
      isMuted ? playerRef.current.mute() : playerRef.current.unMute();
    } catch(e) {}
  }, [isMuted]);

  const handleTogglePlay = () => {
    if (!playerRef.current?.playVideo) return;
    try {
      if (isPlaying) playerRef.current.pauseVideo();
      else playerRef.current.playVideo();
      setIsPlaying(!isPlaying);
      onTogglePlay(!isPlaying);
    } catch(e) {}
  };

  // Render Logic
  if (!videoId || !request) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/95 backdrop-blur-md z-40 transition-opacity duration-200 ${
          isMinimized ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto"
        }`}
        onClick={onMinimize}
      />

      {/* Modal Container */}
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
          {/* MAXIMIZED VIEW */}
          {!isMinimized && (
            <>
              {/* Header */}
              <div className="p-3 sm:p-4 border-b border-white/5 bg-[#12121a] flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
                    <Play size={16} className="text-pink-400 fill-pink-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm sm:text-base truncate max-w-[200px] sm:max-w-md">
                      {request.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-400 truncate">{request.artist}</p>
                  </div>
                </div>
                {nextSong && (
                  <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
                    <span>Up next:</span>
                    <span className="text-gray-300 truncate max-w-[150px]">{nextSong.title}</span>
                  </div>
                )}
              </div>

              {/* Player Area */}
              <div className="aspect-video bg-black w-full">
                <div id="youtube-player" className="w-full h-full" />
              </div>

              {/* Controls */}
              <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#12121a] border-t border-white/5">
                <div className="flex items-center gap-2">
                  <button onClick={handleTogglePlay} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white">
                    {isPlaying ? <Pause size={18} /> : <Play size={18} className="fill-white" />}
                  </button>
                  <button onClick={onToggleMute} className={`p-2 rounded-lg ${isMuted ? "bg-white/5 text-gray-400" : "bg-green-500/20 text-green-400"}`}>
                    {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </button>
                  <button onClick={onToggleAutoPlay} className={`p-2 rounded-lg ${autoPlay ? "bg-blue-500/20 text-blue-400" : "bg-white/5 text-gray-400"}`} title="Auto-play">
                    <SkipForward size={18} />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={onSkip} className="px-3 py-2 bg-purple-500/20 text-purple-400 rounded-lg text-sm font-medium hover:bg-purple-500/30">
                    Skip
                  </button>
                  <button onClick={onApprove} className="px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-500/30">
                    Approve & Next
                  </button>
                  <button onClick={onMarkPlayed} className="px-3 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium hover:bg-green-500/30">
                    Played & Close
                  </button>
                  <button onClick={onMinimize} className="p-2 bg-white/5 text-white rounded-lg hover:bg-white/10">
                    <Minimize2 size={18} />
                  </button>
                  <button onClick={onClose} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20">
                    <X size={18} />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* MINIMIZED BAR */}
          {isMinimized && (
            <div className="bg-[#12121a] border-t border-white/10 p-3 sm:p-4">
               {/* Hidden div to keep player alive in DOM */}
               <div className="w-0 h-0 overflow-hidden absolute opacity-0 pointer-events-none">
                 <div id="youtube-player" />
               </div>

              <div className="flex items-center gap-3">
                <div 
                  className="relative w-12 h-12 rounded-lg overflow-hidden bg-white/5 cursor-pointer flex-shrink-0"
                  onClick={onMaximize}
                >
                  {request.thumbnail ? (
                    <img src={request.thumbnail} alt={request.title} className="w-full h-full object-cover" />
                  ) : (
                    <Music className="w-6 h-6 m-auto text-gray-500 mt-3" />
                  )}
                  {/* Equalizer overlay */}
                  <div className="absolute inset-0 bg-pink-500/40 flex items-center justify-center gap-0.5">
                    {[0, 150, 300].map(d => (
                       <div key={d} className="w-0.5 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: `${d}ms`}} />
                    ))}
                  </div>
                </div>

                <div className="flex-1 min-w-0 cursor-pointer" onClick={onMaximize}>
                  <h4 className="font-semibold text-white text-sm truncate">{request.title}</h4>
                  <p className="text-xs text-gray-400 truncate">{request.artist}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={handleTogglePlay} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white">
                    {isPlaying ? <Pause size={16} /> : <Play size={16} className="fill-white" />}
                  </button>
                  <button onClick={onToggleMute} className={`p-2 rounded-lg ${isMuted ? "bg-white/5 text-gray-400" : "bg-green-500/20 text-green-400"}`}>
                    {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                  <button onClick={onMaximize} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white">
                    <Maximize2 size={16} />
                  </button>
                  <button onClick={onClose} className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg">
                    <X size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}