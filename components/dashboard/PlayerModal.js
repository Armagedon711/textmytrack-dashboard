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

  useEffect(() => {
    if (!videoId) {
        setIsFirstSong(true);
        return;
    }

    let initTimeout;

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) {
        initTimeout = setTimeout(initPlayer, 100);
        return;
      }
      
      const loadVideoAndPlay = (target) => {
        try {
          const currentData = target.getVideoData ? target.getVideoData() : null;
          const currentId = currentData ? currentData.video_id : null;

          if (currentId !== videoId) {
             setIsFirstSong(false);
             target.loadVideoById({
                 videoId: videoId,
                 startSeconds: 0
             });
             setIsPlaying(true);
          }
        } catch (e) {
          console.error("Error loading video:", e);
        }
      };
      
      if (playerRef.current) {
        loadVideoAndPlay(playerRef.current);
        return;
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

    return () => {
      clearTimeout(initTimeout);
    };
  }, [videoId]); 

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
          : "inset-0 flex items-center justify-center p-4 backdrop-blur-sm bg-black/60" 
      }`}
      onClick={!isMinimized ? onMinimize : undefined}
    >
      <div
        className={`relative bg-[#12121a] shadow-2xl border border-white/5 overflow-hidden flex flex-col ${
          isMinimized 
            ? "h-auto rounded-t-xl rounded-b-none w-full"
            : "w-full max-w-4xl h-auto max-h-[90vh] rounded-2xl ring-1 ring-white/10"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* PLAYER AREA */}
        <div className={`w-full bg-black relative transition-all duration-300 ${
            isMinimized ? "h-0 opacity-0 pointer-events-none" : "aspect-video"
        }`}>
            <div id={PLAYER_ID} className="w-full h-full" />
        </div>

        {/* CONTROLS UI */}
        {!isMinimized && (
            <div className="flex-1 flex flex-col"> 
              
              {/* MAIN CONTENT PADDING */}
              <div className="p-6 pb-2">
                {/* Header Row: Title/Artist + Window Controls */}
                <div className="flex justify-between items-start mb-4">
                  <div className="min-w-0 pr-4">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1 truncate leading-tight tracking-tight">{request.title}</h2> 
                    <p className="text-lg text-gray-400 truncate font-medium">{request.artist}</p>
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

                          {/* Divider */}
                          <div className="h-4 w-[1px] bg-white/10 mx-1"></div>

                          {/* Tags */}
                          {tagsToDisplay.map(tag => (
                             <span key={tag} className="px-2.5 py-1 rounded-md text-xs font-medium bg-white/5 text-gray-300 border border-white/5">
                                {tag}
                             </span>
                          ))}
                      </div>
                  </div>

                  {/* Right: Up Next */}
                  {nextSong && (
                    <div className="w-full sm:w-auto flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 max-w-xs">
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Up Next</div>
                      <div className="text-sm text-gray-200 font-medium truncate">{nextSong.title}</div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* CONTROL BAR (Footer) */}
              <div className="bg-[#0e0e14] p-4 sm:px-6 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center mt-auto border-t border-white/5">
                
                {/* 1. Admin Actions (Left Aligned) */}
                <div className="flex justify-center sm:justify-start gap-2 order-2 sm:order-1">
                  {(request.status === 'pending') && (
                    <>
                      <button onClick={onApprove} className="p-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors" title="Approve">
                        <ThumbsUp size={18} />
                      </button>
                      <button onClick={handleReject} className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors" title="Reject">
                        <Ban size={18} />
                      </button>
                    </>
                  )}
                  
                  {/* Mark Played Button - Only Main Action */}
                  <button 
                    onClick={onMarkPlayed} 
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-medium transition-colors text-sm"
                  >
                    <Check size={16} /> <span>Mark Played</span>
                  </button>
                </div>

                {/* 2. Playback Controls (Center Aligned) */}
                <div className="flex items-center justify-center gap-6 order-1 sm:order-2">
                   {/* Play/Pause is the Hero Button */}
                   <button 
                    onClick={handleTogglePlay} 
                    className="w-14 h-14 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 transition-all shadow-lg shadow-white/10"
                  >
                    {isPlaying ? <Pause size={28} className="fill-black" /> : <Play size={28} className="fill-black ml-1" />}
                  </button>
                  
                   <button onClick={onSkip} className="text-gray-400 hover:text-white transition-colors p-2" title="Skip">
                    <SkipForward size={24} />
                  </button>
                </div>

                {/* 3. Settings (Right Aligned) */}
                <div className="flex items-center justify-center sm:justify-end gap-3 order-3">
                  <button onClick={onToggleMute} className={`p-2 rounded-lg transition-colors ${isMuted ? "text-gray-500 hover:text-gray-300" : "text-gray-300 hover:text-white"}`}>
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
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

              </div>
            </div>
        )}

        {/* Minimized Player UI */}
        {isMinimized && request && (
          <div className="flex items-center p-3 w-full bg-[#12121a] border-t border-white/10">
            <div className="flex items-center gap-3 cursor-pointer flex-1 min-w-0 group" onClick={onMaximize}>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden relative ${isPlaying ? 'bg-gray-800' : 'bg-gray-900'}`}>
                 {request.thumbnail ? (
                     <img src={request.thumbnail} alt="Thumbnail" className="w-full h-full object-cover" />
                 ) : (
                     <Music size={20} className="text-gray-600" />
                 )}
                 {/* Hover Overlay */}
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