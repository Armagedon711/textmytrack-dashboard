import { 
  Play, ThumbsUp, Ban, Check, Trash2, Clock, 
  ExternalLink, Music, User, RotateCcw
} from "lucide-react";

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

  return (
    <div className={`group p-3 sm:p-4 rounded-xl border transition-all ${
      isCurrentlyPlaying 
        ? "bg-pink-500/10 border-pink-500/30" 
        : "bg-[#12121a] border-white/5 hover:border-white/10"
    }`}>
      {/* Main Row */}
      <div className="flex items-center gap-3 sm:gap-4">
        
        {/* Desktop Index */}
        <div className="hidden md:flex w-8 h-8 rounded-lg bg-white/5 items-center justify-center flex-shrink-0 text-sm font-medium text-gray-500">
          {index + 1}
        </div>

        {/* Thumbnail */}
        <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl overflow-hidden bg-white/5 flex-shrink-0 group/thumb">
          {req.thumbnail ? (
            <img src={req.thumbnail} alt={req.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music size={20} className="text-gray-600" />
            </div>
          )}

          {/* Overlays */}
          {hasUrl && !isCurrentlyPlaying && (
            <button 
              onClick={() => onPlay(req)} 
              className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 sm:group-hover/thumb:opacity-100 sm:opacity-0 transition-opacity"
            >
              <Play size={20} className="text-white fill-white" />
            </button>
          )}
          {hasUrl && !isCurrentlyPlaying && (
             <button onClick={() => onPlay(req)} className="absolute inset-0 bg-black/30 flex items-center justify-center sm:hidden">
               <Play size={16} className="text-white fill-white" />
             </button>
          )}

          {isCurrentlyPlaying && (
            <div className="absolute inset-0 bg-pink-500/30 flex items-center justify-center">
              <div className="flex gap-0.5">
                {[0, 150, 300].map(d => <div key={d} className="w-1 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: `${d}ms` }} />)}
              </div>
            </div>
          )}
        </div>

        {/* Text Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {hasUrl ? (
                <button onClick={() => onPlay(req)} className="block w-full text-left group/title">
                  <h3 className="font-semibold text-white text-sm sm:text-base truncate group-hover/title:text-pink-400 transition-colors">
                    {req.title}
                    <ExternalLink size={12} className="inline-block ml-2 opacity-0 group-hover/title:opacity-100 transition-opacity text-pink-400" />
                  </h3>
                </button>
              ) : (
                <h3 className="font-semibold text-white text-sm sm:text-base truncate">{req.title}</h3>
              )}
              <p className="text-xs sm:text-sm text-gray-400 truncate">{req.artist}</p>
            </div>
            
            {/* Status Badge */}
            <span className={`flex-shrink-0 px-2 py-0.5 rounded text-[10px] sm:text-xs font-semibold ${
              isCurrentlyPlaying ? "bg-pink-500/20 text-pink-400" : 
              isPlayedStatus ? "bg-green-500/10 text-green-400" : 
              isApproved ? "bg-blue-500/10 text-blue-400" : 
              isRejected ? "bg-red-500/10 text-red-400" : 
              "bg-yellow-500/10 text-yellow-400"
            }`}>
              {isCurrentlyPlaying ? "Playing" : isPlayedStatus ? "Played" : isApproved ? "Approved" : isRejected ? "Rejected" : "Pending"}
            </span>
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-2 sm:gap-3 mt-1.5 text-[10px] sm:text-xs text-gray-500 flex-wrap">
            {/* EXPLICIT TAG */}
            {req.explicit === "Explicit" && (
              <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">Explicit</span>
            )}
            
            {/* NEW: CLEAN TAG */}
            {req.explicit === "Clean" && (
              <span className="px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">Clean</span>
            )}

            <div className="flex items-center gap-1">
              <User size={10} />
              <span className="truncate max-w-[80px] sm:max-w-none">{req.requestedBy}</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <Clock size={10} />
              <span>{timeAgo(req.requestedAt)}</span>
            </div>
          </div>
        </div>

        {/* Desktop Action Buttons */}
        <div className="hidden sm:flex items-center gap-2">
           {isPending && (
             <>
               <button onClick={() => onUpdateStatus(req.id, "approved")} className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400" title="Approve">
                 <ThumbsUp size={16} />
               </button>
               <button onClick={() => onUpdateStatus(req.id, "rejected")} className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400" title="Reject">
                 <Ban size={16} />
               </button>
             </>
           )}
           {(isApproved || isPending) && (
              <button onClick={() => onUpdateStatus(req.id, "played")} className="p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400" title="Mark Played">
                <Check size={16} />
              </button>
           )}
           {isPlayedStatus && (
              <button onClick={() => onUpdateStatus(req.id, "approved")} className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400" title="Move to Approved">
                <RotateCcw size={16} />
              </button>
           )}
           <button onClick={() => onDelete(req.id)} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-red-400">
             <Trash2 size={16} />
           </button>
        </div>
      </div>

      {/* Mobile Action Bar */}
      <div className="sm:hidden flex items-center gap-2 mt-3 pt-2 border-t border-white/5">
         {isPending ? (
           <>
            <button onClick={() => onUpdateStatus(req.id, "approved")} className="flex-1 py-2 bg-blue-500/10 text-blue-400 rounded-lg text-xs font-medium flex items-center justify-center gap-1">
              <ThumbsUp size={14} /> Approve
            </button>
            <button onClick={() => onUpdateStatus(req.id, "rejected")} className="px-3 py-2 bg-red-500/10 text-red-400 rounded-lg">
              <Ban size={14} />
            </button>
           </>
         ) : isApproved || isPlayedStatus ? ( 
            <button onClick={() => onUpdateStatus(req.id, isPlayedStatus ? "approved" : "played")} 
                    className={`flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 ${
                       isPlayedStatus ? "bg-blue-500/10 text-blue-400" : "bg-green-500/10 text-green-400"
                    }`}
            >
               {isPlayedStatus ? (<><RotateCcw size={14} /> Move to Approved</>) : (<><Check size={14} /> Mark Played</>)}
            </button>
         ) : (
            <button onClick={() => onDelete(req.id)} className="flex-1 py-2 bg-white/5 text-gray-400 rounded-lg text-xs font-medium flex items-center justify-center gap-1">
               <Trash2 size={14} /> Remove
            </button>
         )}
      </div>
    </div>
  );
}