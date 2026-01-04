import { 
  Play, ThumbsUp, Ban, Check, Trash2, Clock, 
  ExternalLink, Music, User, RotateCcw, GripVertical, 
  ListMusic, Zap, Smile
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
    if (!confirm(`Are you sure you want to BAN ${req.requestedBy}? They will no longer be able to request songs.`)) return;
    
    await fetch("/api/blacklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dj_id: req.dj_id, phone_number: req.requestedBy })
    });
    
    onUpdateStatus(req.id, "rejected");
    alert("User has been banned.");
  };

  // Helper to render small tags
  const renderTag = (text, colorClass, icon = null) => {
      if (!text || text === "Unknown" || text === "FILL_THIS") return null;
      return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border flex items-center gap-1 capitalize ${colorClass}`}>
           {icon} {text}
        </span>
      );
  };

  return (
    <Draggable draggableId={req.id.toString()} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`group relative p-3 sm:p-4 rounded-xl border transition-all duration-200 ${
            snapshot.isDragging 
              ? "shadow-2xl ring-2 ring-pink-500 bg-[#1a1a24] z-50 scale-[1.02]" 
              : isCurrentlyPlaying 
                ? "bg-pink-500/5 border-pink-500/30" 
                : "bg-[#12121a] border-white/5 hover:border-white/10"
          }`}
          style={provided.draggableProps.style}
        >
          {/* --- TOP RIGHT STATUS BADGE --- */}
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
             <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  isCurrentlyPlaying ? "bg-pink-500 text-white shadow-lg shadow-pink-500/20" : 
                  isPlayedStatus ? "bg-green-500/20 text-green-400 border border-green-500/20" : 
                  isApproved ? "bg-blue-500/20 text-blue-400 border border-blue-500/20" : 
                  isRejected ? "bg-red-500/20 text-red-400 border border-red-500/20" : 
                  "bg-yellow-500/20 text-yellow-400 border border-yellow-500/20"
                }`}>
                  {isCurrentlyPlaying ? "Now Playing" : isPlayedStatus ? "Played" : req.status}
             </span>
          </div>

          <div className="flex items-start gap-3 sm:gap-4 pr-16"> {/* pr-16 leaves room for badge */}
            
            {/* Desktop Drag Handle */}
            <div 
               {...provided.dragHandleProps}
               className="hidden md:flex mt-2 w-8 h-8 rounded-lg bg-white/5 items-center justify-center flex-shrink-0 text-gray-500 cursor-grab active:cursor-grabbing hover:bg-white/10 hover:text-white"
            >
               <GripVertical size={16} />
            </div>

            {/* Thumbnail */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg sm:rounded-xl overflow-hidden bg-white/5 flex-shrink-0 group/thumb">
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
              
              {/* Equalizer Overlay (Playing) */}
              {isCurrentlyPlaying && (
                <div className="absolute inset-0 bg-pink-500/40 flex items-center justify-center">
                  <div className="flex gap-0.5 items-end h-4">
                    {[0, 150, 300].map(d => <div key={d} className="w-1 bg-white rounded-full animate-pulse" style={{ animationDelay: `${d}ms`, height: '100%' }} />)}
                  </div>
                </div>
              )}
            </div>

            {/* Info Column */}
            <div className="flex-1 min-w-0 flex flex-col justify-center min-h-[4rem]">
              
              {/* Title & Artist */}
              <div className="mb-2">
                {hasUrl ? (
                    <button onClick={() => onPlay(req)} className="text-left group/title">
                      <h3 className="font-bold text-white text-sm sm:text-base leading-tight group-hover/title:text-pink-400 transition-colors line-clamp-1">
                        {req.title}
                      </h3>
                    </button>
                  ) : (
                    <h3 className="font-bold text-white text-sm sm:text-base leading-tight line-clamp-1">{req.title}</h3>
                  )}
                <p className="text-xs sm:text-sm text-gray-400 font-medium line-clamp-1">{req.artist}</p>
              </div>

              {/* Tags & Metadata Row */}
              <div className="flex flex-wrap items-center gap-2">
                 {/* Explicit/Clean */}
                 {req.explicit === "Explicit" && renderTag("Explicit", "bg-red-500/10 text-red-400 border-red-500/20")}
                 {req.explicit === "Clean" && renderTag("Clean", "bg-green-500/10 text-green-400 border-green-500/20")}
                 
                 {/* AI Tags - Show if space permits (flex-wrap handles this) */}
                 {renderTag(req.genre, "bg-purple-500/10 text-purple-400 border-purple-500/20", <ListMusic size={10}/>)}
                 {renderTag(req.energy, "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", <Zap size={10}/>)}
                 {renderTag(req.mood, "bg-blue-500/10 text-blue-400 border-blue-500/20", <Smile size={10}/>)}

                 <div className="w-[1px] h-3 bg-white/10 mx-1 hidden sm:block"></div>

                 {/* User & Time */}
                 <div className="flex items-center gap-3 text-[10px] text-gray-500 font-mono">
                    <div className="flex items-center gap-1">
                      <User size={10} />
                      <button onClick={handleBanUser} className="hover:text-red-400 hover:underline transition-colors" title="Ban User">
                        {req.requestedBy}
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={10} />
                      <span>{timeAgo(req.requestedAt)}</span>
                    </div>
                 </div>
              </div>
            </div>
          </div>

          {/* --- ACTION BUTTONS (Desktop) --- */}
          <div className="hidden sm:flex absolute bottom-4 right-4 items-center gap-2">
             
             {/* PENDING ACTIONS */}
             {isPending && (
               <>
                 <button onClick={() => onUpdateStatus(req.id, "approved")} className="px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-medium flex items-center gap-1.5 transition-colors">
                   <ThumbsUp size={14} /> Approve
                 </button>
                 <button onClick={() => onUpdateStatus(req.id, "rejected")} className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors" title="Reject">
                   <Ban size={16} />
                 </button>
               </>
             )}

             {/* APPROVED ACTIONS */}
             {isApproved && (
                <>
                  <button onClick={() => onUpdateStatus(req.id, "played")} className="px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 text-xs font-medium flex items-center gap-1.5 transition-colors">
                    <Check size={14} /> Mark Played
                  </button>
                  <button onClick={() => onUpdateStatus(req.id, "rejected")} className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors" title="Reject">
                    <Ban size={16} />
                  </button>
                </>
             )}

             {/* REJECTED ACTIONS - NEW: Add Move to Approved */}
             {isRejected && (
                <button onClick={() => onUpdateStatus(req.id, "approved")} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-blue-500/10 text-gray-400 hover:text-blue-400 text-xs font-medium flex items-center gap-1.5 transition-colors">
                  <RotateCcw size={14} /> Restore
                </button>
             )}

             {/* PLAYED ACTIONS */}
             {isPlayedStatus && (
                <button onClick={() => onUpdateStatus(req.id, "approved")} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-blue-500/10 text-gray-400 hover:text-blue-400 text-xs font-medium flex items-center gap-1.5 transition-colors">
                  <RotateCcw size={14} /> Re-Queue
                </button>
             )}

             {/* DELETE (Always Available) */}
             <button onClick={() => onDelete(req.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors" title="Delete">
               <Trash2 size={16} />
             </button>
          </div>

          {/* --- ACTION BUTTONS (Mobile) --- */}
          <div className="sm:hidden flex items-center gap-2 mt-4 pt-3 border-t border-white/5">
             {isPending ? (
               <>
                <button onClick={() => onUpdateStatus(req.id, "approved")} className="flex-1 py-2 bg-blue-500/10 text-blue-400 rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                  <ThumbsUp size={14} /> Approve
                </button>
                <button onClick={() => onUpdateStatus(req.id, "rejected")} className="px-4 py-2 bg-white/5 text-gray-400 rounded-lg text-xs font-medium">
                  <Ban size={16} />
                </button>
                <button onClick={() => onDelete(req.id)} className="px-3 py-2 bg-white/5 text-gray-400 rounded-lg">
                   <Trash2 size={16} />
                </button>
               </>
             ) : isApproved ? (
                <>
                  <button onClick={() => onUpdateStatus(req.id, "played")} className="flex-1 py-2 bg-green-500/10 text-green-400 rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                    <Check size={14} /> Mark Played
                  </button>
                  <button onClick={() => onUpdateStatus(req.id, "rejected")} className="px-3 py-2 bg-white/5 text-gray-400 rounded-lg">
                    <Ban size={16} />
                  </button>
                </>
             ) : isRejected ? (
                <>
                   <button onClick={() => onUpdateStatus(req.id, "approved")} className="flex-1 py-2 bg-white/5 text-blue-400 rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                     <RotateCcw size={14} /> Restore
                   </button>
                   <button onClick={() => onDelete(req.id)} className="px-3 py-2 bg-white/5 text-red-400 rounded-lg">
                      <Trash2 size={16} />
                   </button>
                </>
             ) : (
                <div className="flex w-full gap-2">
                  <button onClick={() => onUpdateStatus(req.id, "approved")} className="flex-1 py-2 bg-white/5 text-blue-400 rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                     <RotateCcw size={14} /> Re-Queue
                  </button>
                  <button onClick={() => onDelete(req.id)} className="px-3 py-2 bg-white/5 text-red-400 rounded-lg">
                      <Trash2 size={16} />
                  </button>
                </div>
             )}
          </div>
        </div>
      )}
    </Draggable>
  );
}