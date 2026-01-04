import { 
  Play, ThumbsUp, Ban, Check, Trash2, Clock, 
  User, RotateCcw, GripVertical, 
  Music
} from "lucide-react";
import { Draggable } from "@hello-pangea/dnd"; 

export default function RequestItem({ 
  req, 
  index, 
  isCurrentlyPlaying, 
  hasUrl, 
  onPlay, 
  onUpdateStatus, 
  onDelete 
}) {
  const isPending = req.status === "pending";
  const isApproved = req.status === "approved";
  const isRejected = req.status === "rejected";
  const isPlayedStatus = req.status === "played";

  const timeAgo = (timestamp) => {
    const diff = (new Date() - new Date(timestamp)) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const handleBanUser = async () => {
    if (!confirm(`Are you sure you want to BAN ${req.requestedBy}?`)) return;
    
    await fetch("/api/blacklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dj_id: req.dj_id, phone_number: req.requestedBy })
    });
    
    onUpdateStatus(req.id, "rejected");
  };

  const renderTag = (text, icon = null) => {
      if (!text || text === "Unknown" || text === "FILL_THIS") return null;
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium border border-white/5 bg-white/5 text-gray-400 flex items-center gap-1 capitalize whitespace-nowrap">
           {icon} {text}
        </span>
      );
  };

  // Shared Tags Component
  const TagsRow = ({ className }) => (
    <div className={`flex-wrap items-center gap-1.5 ${className}`}>
        {req.explicit === "Explicit" && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium border border-red-500/20 bg-red-500/10 text-red-400">Explicit</span>
        )}
        {req.explicit === "Clean" && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium border border-green-500/20 bg-green-500/10 text-green-400">Clean</span>
        )}
        {renderTag(req.genre)}
        {renderTag(req.energy)}
        {renderTag(req.mood)}
    </div>
  );

  // --- BUTTON STYLES (UPDATED: Subtler Colors) ---
  const btnBase = "rounded-lg flex items-center justify-center gap-2 transition-colors duration-200 border";
  
  // Blue: Translucent background, blue text/border
  const btnPrimaryBlue = `${btnBase} px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20 text-blue-400 text-xs font-semibold`;
  
  // Green: Translucent background, green text/border
  const btnPrimaryGreen = `${btnBase} px-4 py-2 bg-green-500/10 hover:bg-green-500/20 border-green-500/20 text-green-400 text-xs font-semibold`;
  
  // Secondary/Ghost
  const btnSecondary = `${btnBase} px-3 py-2 bg-white/5 hover:bg-white/10 border-white/5 text-gray-300 hover:text-white text-xs font-medium`;
  const btnIcon = `rounded-lg p-2 text-gray-500 hover:bg-white/5 border border-transparent transition-colors`;
  const btnIconDestructive = `${btnIcon} hover:text-red-400 hover:bg-red-500/10`;

  return (
    <Draggable draggableId={req.id.toString()} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`group relative rounded-xl border overflow-hidden ${
            snapshot.isDragging 
              ? "shadow-2xl ring-2 ring-pink-500 bg-[#1a1a24] z-50 scale-[1.02]" 
              : isCurrentlyPlaying 
                ? "bg-pink-500/5 border-pink-500/30" 
                : "bg-[#181824] md:bg-[#12121a] border-white/10 md:border-white/5 hover:border-white/10"
          }`}
          style={provided.draggableProps.style}
        >
          {/* Main Card Content Wrapper */}
          <div className="p-3 sm:p-4">
            
            {/* Top Section: Drag, Thumb, Info */}
            <div className="flex items-stretch gap-3">
                {/* 1. Drag Handle */}
                <div 
                  {...provided.dragHandleProps}
                  className="flex w-6 sm:w-8 items-center justify-center flex-shrink-0 text-gray-600 cursor-grab active:cursor-grabbing hover:bg-white/5 hover:text-gray-300 transition-colors rounded-lg"
                >
                  <GripVertical size={20} />
                </div>

                {/* 2. Thumbnail */}
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg sm:rounded-xl overflow-hidden bg-white/5 flex-shrink-0 group/thumb self-start">
                  {req.thumbnail ? (
                    <img src={req.thumbnail} alt={req.title} className="w-full h-full object-cover scale-[1.35]" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Music size={24} className="text-gray-600" /></div>
                  )}

                  {/* Play Overlay */}
                  {hasUrl && !isCurrentlyPlaying && (
                    <button onClick={() => onPlay(req)} className="absolute inset-0 bg-black/40 flex items-center justify-center sm:opacity-0 sm:group-hover/thumb:opacity-100 transition-opacity">
                      <div className="p-2 bg-white/20 backdrop-blur-sm rounded-full"><Play size={20} className="text-white fill-white ml-0.5" /></div>
                    </button>
                  )}
                  
                  {/* Equalizer (Playing) */}
                  {isCurrentlyPlaying && (
                    <div className="absolute inset-0 bg-pink-500/40 flex items-center justify-center">
                      <div className="flex gap-0.5 items-end h-4">
                        {[0, 150, 300].map(d => <div key={d} className="w-1 bg-white rounded-full animate-pulse" style={{ animationDelay: `${d}ms`, height: '100%' }} />)}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Info Column */}
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
                  
                  {/* Header: Title + Status Badge */}
                  <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        {/* Title */}
                        {hasUrl ? (
                            <button onClick={() => onPlay(req)} className="text-left group/title w-full">
                              <h3 className="font-bold text-white text-sm sm:text-base leading-tight group-hover/title:text-pink-400 transition-colors truncate">
                                {req.title}
                              </h3>
                            </button>
                          ) : (
                            <h3 className="font-bold text-white text-sm sm:text-base leading-tight truncate">{req.title}</h3>
                          )}
                          
                          {/* Artist + Desktop User Info */}
                          <div className="flex items-center gap-2 overflow-hidden">
                             <p className="text-xs sm:text-sm text-gray-300 font-medium truncate flex-shrink-0 max-w-[50%] sm:max-w-none">{req.artist}</p>
                             
                             {/* DESKTOP ONLY: Inline User Info */}
                             <div className="hidden sm:flex items-center gap-2 text-[10px] text-gray-500 font-mono whitespace-nowrap">
                                <span className="text-gray-700">•</span>
                                <div className="flex items-center gap-1">
                                    <User size={10} />
                                    <button onClick={handleBanUser} className="hover:text-red-400 hover:underline transition-colors">
                                      {req.requestedBy}
                                    </button>
                                </div>
                                <span className="text-gray-700">•</span>
                                <div className="flex items-center gap-1">
                                    <Clock size={10} />
                                    <span>{timeAgo(req.requestedAt)}</span>
                                </div>
                             </div>
                          </div>
                      </div>

                      {/* Status Badge */}
                      <span className={`flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${
                          isCurrentlyPlaying ? "bg-pink-500 text-white shadow-lg shadow-pink-500/20" : 
                          isPlayedStatus ? "text-gray-500 border border-white/5" : 
                          isApproved ? "text-blue-400/80 border border-blue-500/10 bg-blue-500/5" : 
                          isRejected ? "text-red-400/80 border border-red-500/10 bg-red-500/5" : 
                          "text-yellow-400/80 border border-yellow-500/10 bg-yellow-500/5"
                        }`}>
                          {isCurrentlyPlaying ? "Playing" : isPlayedStatus ? "Played" : req.status}
                      </span>
                  </div>

                  {/* MOBILE ONLY: User Info Row */}
                  <div className="sm:hidden flex items-center gap-2 text-[10px] text-gray-500 font-mono bg-white/5 px-2 py-1 rounded-md w-fit max-w-full">
                    <div className="flex items-center gap-1 min-w-0">
                        <User size={10} className="shrink-0"/>
                        <button onClick={handleBanUser} className="hover:text-red-400 hover:underline transition-colors truncate">
                          {req.requestedBy}
                        </button>
                    </div>
                    <span className="text-gray-700 mx-0.5">•</span>
                    <div className="flex items-center gap-1 shrink-0">
                        <Clock size={10} />
                        <span>{timeAgo(req.requestedAt)}</span>
                    </div>
                  </div>

                  {/* Desktop Tags (Hidden on Mobile) */}
                  <TagsRow className="hidden sm:flex mt-0.5" />
                </div>
            </div>

            {/* Mobile Tags (Visible only on Mobile, Full Width) */}
            <TagsRow className="flex sm:hidden mt-3" />
            
          </div>

          {/* --- ACTION BUTTONS (Desktop) --- */}
          <div className="hidden sm:flex absolute bottom-4 right-4 items-center gap-2 bg-[#12121a]/90 backdrop-blur-sm pl-2 rounded-l-xl">
             {isPending && (
               <>
                 <button onClick={() => onDelete(req.id)} className={btnIconDestructive} title="Delete">
                   <Trash2 size={16} />
                 </button>
                 <button onClick={() => onUpdateStatus(req.id, "rejected")} className={btnIconDestructive} title="Reject">
                   <Ban size={16} />
                 </button>
                 <button onClick={() => onUpdateStatus(req.id, "approved")} className={btnPrimaryBlue}>
                   <ThumbsUp size={14} /> Approve
                 </button>
               </>
             )}

             {isApproved && (
                <>
                  <button onClick={() => onUpdateStatus(req.id, "rejected")} className={btnIconDestructive} title="Reject">
                    <Ban size={16} />
                  </button>
                  <button onClick={() => onUpdateStatus(req.id, "played")} className={btnPrimaryGreen}>
                    <Check size={14} /> Mark Played
                  </button>
                </>
             )}

             {isRejected && (
                <>
                    <button onClick={() => onDelete(req.id)} className={btnIconDestructive} title="Delete">
                        <Trash2 size={16} />
                    </button>
                    <button onClick={() => onUpdateStatus(req.id, "approved")} className={btnSecondary}>
                        <RotateCcw size={14} /> Restore
                    </button>
                </>
             )}

             {isPlayedStatus && (
                <>
                    <button onClick={() => onDelete(req.id)} className={btnIconDestructive} title="Delete">
                        <Trash2 size={16} />
                    </button>
                    <button onClick={() => onUpdateStatus(req.id, "approved")} className={btnSecondary}>
                        <RotateCcw size={14} /> Re-Queue
                    </button>
                </>
             )}
          </div>

          {/* --- ACTION BUTTONS (Mobile) --- */}
          <div className="sm:hidden flex items-center gap-2 p-2 border-t border-white/5 bg-black/20">
             {isPending ? (
               <>
                <button onClick={() => onUpdateStatus(req.id, "approved")} className="flex-1 h-10 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg text-xs font-bold flex items-center justify-center gap-2 active:bg-blue-500/20 transition-colors">
                  <ThumbsUp size={16} /> Approve
                </button>
                <button onClick={() => onUpdateStatus(req.id, "rejected")} className="h-10 w-12 bg-white/5 text-gray-400 rounded-lg flex items-center justify-center active:bg-red-500/20 active:text-red-400 transition-colors">
                  <Ban size={18} />
                </button>
               </>
             ) : isApproved ? (
                <>
                  <button onClick={() => onUpdateStatus(req.id, "played")} className="flex-1 h-10 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg text-xs font-bold flex items-center justify-center gap-2 active:bg-green-500/20 transition-colors">
                    <Check size={16} /> Mark Played
                  </button>
                  <button onClick={() => onUpdateStatus(req.id, "rejected")} className="h-10 w-12 bg-white/5 text-gray-400 rounded-lg flex items-center justify-center active:bg-red-500/20 active:text-red-400 transition-colors">
                    <Ban size={18} />
                  </button>
                </>
             ) : (
                <>
                  <button onClick={() => onUpdateStatus(req.id, "approved")} className="flex-1 h-10 bg-white/5 border border-white/10 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 active:bg-white/10 transition-colors">
                     <RotateCcw size={14} /> {isRejected ? "Restore" : "Re-Queue"}
                  </button>
                  <button onClick={() => onDelete(req.id)} className="h-10 w-12 bg-white/5 text-red-400 rounded-lg flex items-center justify-center active:bg-red-500/10 transition-colors">
                      <Trash2 size={18} />
                  </button>
                </>
             )}
          </div>
        </div>
      )}
    </Draggable>
  );
}