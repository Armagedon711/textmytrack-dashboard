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
  onApprove, // Now handles Mark As Approved
  onMarkPlayed,
  onVideoEnd,
}) {
  const playerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFirstSong, setIsFirstSong] = useState(true); 
  
  const onVideoEndRef = useRef(onVideoEnd);
  
  useEffect(() => {
    onVideoEndRef.current = onVideoEnd;
  }, [onVideoEnd]);

  useEffect(() => {
    loadYoutubeScript();
  }, []);

  // Initialize player ONCE, then just load new videos
  useEffect(() => {
    if (!videoId) {
        setIsFirstSong(true);
        return;
    }

    let initTimeout;
    let isSubscribed = true;

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) {
        initTimeout = setTimeout(initPlayer, 100);
        return;
      }
      
      const loadVideoAndPlay = (target) => {
        try {
          // FIX: Explicitly stop video before loading new one for clean transition
          if (target.stopVideo) target.stopVideo(); 
          
          target.loadVideoById(videoId);
          setTimeout(() => {
            if (isSubscribed && target) {
              try {
                target.playVideo();
                setIsPlaying(true);
              } catch (e) {
                console.error("Error starting playback:", e);
              }
            }
          }, 200);
        } catch (e) {
          console.error("Error loading video:", e);
        }
      };
      
      // If player exists, just load the new video
      if (playerRef.current) {
        loadVideoAndPlay(playerRef.current);
        if (videoId !== playerRef.current.getVideoData().video_id) {
             setIsFirstSong(false);
        }
        return;
      }

      // Create player only once
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
            if (isSubscribed) {
              if (!isMuted) {
                event.target.unMute();
              }
              event.target.playVideo();
              setIsPlaying(true);
              setIsFirstSong(true);
            }
          },
          onStateChange: (event) => {
            if (!isSubscribed) return;
            
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

    return () => {
      isSubscribed = false;
      clearTimeout(initTimeout);
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
    <>
      {/* Video Container (Fixed) - Positioning fixed to align perfectly with placeholder */}
      <div 
        className={`fixed bg-black transition-all duration-300 overflow-hidden ${
          isMinimized 
            ? "w-[1px] h-[1px] opacity-0 pointer-events-none top-0 left-0" 
            : "rounded-t-xl z-[60]"
        }`}
        style={!isMinimized ? {
          width: 'calc(100vw - 32px)',
          maxWidth: '896px', 
          aspectRatio: '16/9',
          top: '50%',
          left: '50%',
          // FIX: Adjusted transform to align perfectly with the placeholder, removing black space.
          // Calculation: -50% (to center) - 108px (half the control panel height)
          transform: 'translateX(-50%) translateY(calc(-50% - 108px))', 
        } : undefined}
      >
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
          
          {/* Maximized Player UI */}
          {!isMinimized && (
            <div className="flex flex-col h-full relative"> 
              
              {/* Video Container - transparent placeholder */}
              <div className="w-full relative aspect-video bg-black rounded-t-xl overflow-hidden">
                {!playerRef.current && (
                  <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                    <Music size={32} className="text-gray-500 animate-spin" />
                  </div>
                )}
              </div>

              {/* Controls and Info */}
              <div className="flex-1 p-4 sm:p-6 flex flex-col justify-between"> 
                
                {/* Top Section of Controls: Title, Artist, Min/Close Buttons */}
                <div className="flex justify-between items-start mb-2">
                  <div className="min-w-0 pr-4">
                    {/* FIX: Reduced margin to remove excess space between title/artist */}
                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-0 truncate">{request.title}</h2> 
                    <p className="text-md sm:text-lg text-gray-400 truncate">{request.artist}</p>
                  </div>
                  
                  {/* Min/Close Buttons */}
                  <div className="flex gap-3 flex-shrink-0 pt-1">
                    <button onClick={onMinimize} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors" title="Minimize Player">
                      <Minimize2 size={18} />
                    </button>
                    <button onClick={onClose} className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors" title="Stop and Close">
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* Middle Row: Metadata (User, Status, Tags, Up Next) */}
                <div className="flex justify-between items-center mb-6 text-sm flex-wrap gap-3">
                  
                  {/* Requested By & Status Badge + Tags */}
                  <div className="flex flex-col gap-1">
                      <p className="text-sm text-gray-500">Requested by: <span className="text-gray-300 font-medium">{request.requestedBy}</span></p>
                      
                      {/* Status + Tags */}
                      <div className="flex items-center gap-2 mt-1">
                          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            request.status === 'approved' ? 'bg-blue-500/10 text-blue-400' :
                            request.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                            'bg-gray-500/10 text-gray-400'
                          }`}>
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </div>
                          {/* Display Tags */}
                          {tagsToDisplay.map(tag => (
                             <span key={tag} className="px-2 py-0.5 rounded-full text-xs font-medium bg-white/5 text-gray-400">
                                {tag}
                             </span>
                          ))}
                      </div>
                  </div>

                  {/* Up Next Display */}
                  {nextSong && (
                    <div className="flex items-center gap-2 text-gray-500 p-2 bg-white/5 rounded-lg flex-shrink-0">
                      <span className="text-xs">Up next:</span>
                      <span className="text-gray-300 font-medium truncate max-w-[150px]">{nextSong.title}</span>
                    </div>
                  )}
                </div>
                
                {/* Bottom Row: Actions (Left) and Playback (Right) */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center pt-4 border-t border-white/5">
                  
                  {/* Left: Actions (Contextual Display) */}
                  <div className="flex gap-3 w-full sm:w-auto order-2 sm:order-1 justify-center">
                    
                    {/* Only show Mark As Approved/Reject if status is Pending */}
                    {(request.status === 'pending') && (
                      <>
                        <button 
                          onClick={onApprove} 
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-medium transition-colors justify-center"
                          title="Mark As Approved"
                        >
                          <ThumbsUp size={18} /> Mark As Approved
                        </button>
                        <button 
                          onClick={handleReject} 
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium transition-colors justify-center"
                          title="Reject"
                        >
                          <Ban size={18} /> Reject
                        </button>
                      </>
                    )}

                    {/* Only show Mark As Played if status is Approved (or Pending, for direct jump) */}
                    {(request.status === 'approved' || request.status === 'pending') && (
                      <button 
                        onClick={onMarkPlayed} 
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-400 font-medium transition-colors justify-center"
                        title="Mark As Played"
                      >
                        <Check size={18} /> Mark As Played
                      </button>
                    )}
                    
                  </div>

                  {/* Right: Playback Controls (Skip, Play/Pause, Mute, AutoPlay) */}
                  <div className="flex gap-4 p-3 rounded-xl bg-white/5 w-full sm:w-auto justify-center order-1 sm:order-2">
                    <button onClick={onSkip} className="p-2 hover:bg-white/10 rounded-lg text-white transition-colors" title="Skip">
                      <SkipForward size={24} />
                    </button>
                    <button onClick={handleTogglePlay} className="p-3 bg-pink-600 hover:bg-pink-700 rounded-xl text-white transition-colors shadow-lg" title={isPlaying ? "Pause" : "Play"}>
                      {isPlaying ? <Pause size={24} className="fill-white" /> : <Play size={24} className="fill-white" />}
                    </button>
                    <button onClick={onToggleMute} className={`p-2 rounded-lg transition-colors ${isMuted ? "hover:bg-white/10 text-gray-400" : "text-white hover:bg-white/10"}`} title={isMuted ? "Unmute" : "Mute"}>
                      {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                    </button>
                    <button onClick={onToggleAutoPlay} className={`p-2 rounded-lg text-xs font-medium transition-colors ${autoPlay ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 hover:bg-white/10'}`} title={`AutoPlay: ${autoPlay ? 'On' : 'Off'}`}>
                        AutoPlay
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Minimized Player (Enhanced with Mute/Unmute) */}
          {isMinimized && request && (
            <div className="flex items-center p-3 w-full">
              <div className="flex items-center gap-3 cursor-pointer flex-1 min-w-0" onClick={onMaximize}>
                {/* Thumbnail Display */}
                <div 
                  className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden ${
                    isPlaying ? 'bg-pink-500/20' : 'bg-gray-500/10'
                  }`}
                >
                   {request.thumbnail ? (
                       <img src={request.thumbnail} alt="Thumbnail" className="w-full h-full object-cover" />
                   ) : (
                       <Music size={16} className={`${isPlaying ? 'text-pink-400' : 'text-gray-400'}`} />
                   )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-white text-sm truncate">{request.title}</h4>
                  <p className="text-xs text-gray-400 truncate">{request.artist}</p>
                </div>
              </div>
              
              {/* Minimized Controls (Skip, Play/Pause, Mute/Unmute, Maximize, Close) */}
              <div className="flex items-center gap-2 ml-auto flex-shrink-0">
                {/* Mute Button */}
                <button onClick={onToggleMute} className={`p-2 rounded-lg transition-colors ${isMuted ? "bg-white/5 text-gray-400 hover:bg-white/10" : "bg-white/5 text-white hover:bg-white/10"}`} title={isMuted ? "Unmute" : "Mute"}>
                    {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <button onClick={onSkip} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white" title="Skip to Next">
                  <SkipForward size={16} />
                </button>
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