import { 
  Play, ThumbsUp, Ban, Check, Trash2, Clock, 
  User, RotateCcw, GripVertical, 
  ListMusic, Zap, Smile, Music
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
        <span className="px-2 py-0.5 rounded text-[10px] font-medium border border-white/5 bg-white/5 text-gray-400 flex items-center gap-1.5 capitalize">
           {icon} {text}
        </span>
      );
  };

  // --- BUTTON STYLES ---
  const btnBase = "rounded-lg flex items-center justify-center gap-2 transition-all duration-200";
  const btnPrimaryBlue = `${btnBase} px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-900/20`;
  const btnPrimaryGreen = `${btnBase} px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold shadow-lg shadow-green-900/20`;
  const btnSecondary = `${btnBase} px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/5 text-gray-300 hover:text-white text-xs font-medium`;
  const btnIcon = `${btnBase} p-2 text-gray-500 hover:bg-white/5`;
  const btnIconDestructive = `${btnIcon} hover:text-red-400 hover:bg-red-500/10`;

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
                  isPlayedStatus ? "text-gray-500 border border-white/5" : 
                  isApproved ? "text-blue-400/80 border border-blue-500/10 bg-blue-500/5" : 
                  isRejected ? "text-red-400/80 border border-red-500/10 bg-red-500/5" : 
                  "text-yellow-400/80 border border-yellow-500/10 bg-yellow-500/5"
                }`}>
                  {isCurrentlyPlaying ? "Now Playing" : isPlayedStatus ? "Played" : req.status}
             </span>
          </div>

          <div className="flex items-start gap-3 sm:gap-4 pr-16">
            
            {/* Vertically Centered Drag Handle */}
            <div 
               {...provided.dragHandleProps}
               className="hidden md:flex w-8 h-8 rounded-lg items-center justify-center flex-shrink-0 text-gray-600 cursor-grab active:cursor-grabbing hover:bg-white/5 hover:text-gray-300 transition-colors self-center"
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
              
              {/* Equalizer (Playing) */}
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
              
              {/* Title */}
              <div className="mb-0.5">
                {hasUrl ? (
                    <button onClick={() => onPlay(req)} className="text-left group/title">
                      <h3 className="font-bold text-white text-sm sm:text-base leading-tight group-hover/title:text-pink-400 transition-colors line-clamp-1">
                        {req.title}
                      </h3>
                    </button>
                  ) : (
                    <h3 className="font-bold text-white text-sm sm:text-base leading-tight line-clamp-1">{req.title}</h3>
                  )}
              </div>

              {/* Artist + User Info */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <p className="text-xs sm:text-sm text-gray-300 font-medium truncate max-w-[150px] sm:max-w-[200px]">{req.artist}</p>
                  
                  <span className="hidden sm:inline text-gray-700 text-[10px]">•</span>
                  
                  <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono px-1.5 py-0.5 rounded-full">
                    <div className="flex items-center gap-1 border-r border-white/10 pr-2">
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

              {/* Tags Row */}
              <div className="flex flex-wrap items-center gap-2">
                 {req.explicit === "Explicit" && (
                     <span className="px-2 py-0.5 rounded text-[10px] font-medium border border-red-500/20 bg-red-500/10 text-red-400">Explicit</span>
                 )}
                 {req.explicit === "Clean" && (
                     <span className="px-2 py-0.5 rounded text-[10px] font-medium border border-green-500/20 bg-green-500/10 text-green-400">Clean</span>
                 )}
                 {renderTag(req.genre, <ListMusic size={10}/>)}
                 {renderTag(req.energy, <Zap size={10}/>)}
                 {renderTag(req.mood, <Smile size={10}/>)}
              </div>
            </div>
          </div>

          {/* --- ACTION BUTTONS (Desktop) --- */}
          <div className="hidden sm:flex absolute bottom-4 right-4 items-center gap-2">
             
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
                    {/* RESTORE BUTTON */}
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
                    {/* RE-QUEUE BUTTON - Same style as Restore */}
                    <button onClick={() => onUpdateStatus(req.id, "approved")} className={btnSecondary}>
                        <RotateCcw size={14} /> Re-Queue
                    </button>
                </>
             )}
          </div>

          {/* --- ACTION BUTTONS (Mobile) --- */}
          <div className="sm:hidden flex items-center gap-2 mt-4 pt-3 border-t border-white/5">
             {isPending ? (
               <>
                <button onClick={() => onUpdateStatus(req.id, "approved")} className="flex-1 py-3 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                  <ThumbsUp size={14} /> Approve
                </button>
                <button onClick={() => onUpdateStatus(req.id, "rejected")} className="px-4 py-3 bg-white/5 text-gray-400 rounded-lg">
                  <Ban size={16} />
                </button>
               </>
             ) : isApproved ? (
                <>
                  <button onClick={() => onUpdateStatus(req.id, "played")} className="flex-1 py-3 bg-green-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                    <Check size={14} /> Mark Played
                  </button>
                  <button onClick={() => onUpdateStatus(req.id, "rejected")} className="px-4 py-3 bg-white/5 text-gray-400 rounded-lg">
                    <Ban size={16} />
                  </button>
                </>
             ) : (
                <div className="flex w-full gap-2">
                  <button onClick={() => onUpdateStatus(req.id, "approved")} className="flex-1 py-3 bg-white/5 border border-white/10 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                     <RotateCcw size={14} /> {isRejected ? "Restore" : "Re-Queue"}
                  </button>
                  <button onClick={() => onDelete(req.id)} className="px-4 py-3 bg-white/5 text-red-400 rounded-lg">
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