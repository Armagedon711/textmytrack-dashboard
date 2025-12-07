import { 
  Play, ThumbsUp, Ban, Check, Trash2, Clock, 
  ExternalLink, Music, User 
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
  
  // Simplified time format
  const timeAgo = (timestamp) => {
    const diff = (new Date() - new Date(timestamp)) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  return (
    <div className={`group relative flex items-center gap-4 py-3 px-4 rounded-lg transition-all duration-200 ${
      isCurrentlyPlaying 
        ? "bg-primary/10 border border-primary/20" 
        : "hover:bg-white/[0.03] border border-transparent border-b-white/[0.05]"
    }`}>
      
      {/* 1. Playing Indicator / Index */}
      <div className="hidden md:flex w-8 justify-center text-sm font-medium text-subtle">
        {isCurrentlyPlaying ? (
          <div className="flex gap-0.5 items-end h-4">
             <span className="w-1 h-2 bg-primary animate-pulse" />
             <span className="w-1 h-4 bg-primary animate-pulse delay-75" />
             <span className="w-1 h-3 bg-primary animate-pulse delay-150" />
          </div>
        ) : (
          <span className="group-hover:hidden">{index + 1}</span>
        )}
        {/* Play Icon on Hover */}
        {!isCurrentlyPlaying && hasUrl && (
          <button 
            onClick={() => onPlay(req)}
            className="hidden group-hover:block text-white hover:text-primary transition-colors"
          >
            <Play size={14} fill="currentColor" />
          </button>
        )}
      </div>

      {/* 2. Thumbnail */}
      <div className="relative w-12 h-12 rounded bg-surfaceHighlight overflow-hidden flex-shrink-0 shadow-lg">
        {req.thumbnail ? (
          <img src={req.thumbnail} alt={req.title} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-subtle">
            <Music size={16} />
          </div>
        )}
      </div>

      {/* 3. Title & Artist (The main content) */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-center gap-2">
          <h3 className={`font-medium truncate text-sm sm:text-base ${isCurrentlyPlaying ? 'text-primary' : 'text-white'}`}>
            {req.title}
          </h3>
          {req.explicit === "Explicit" && (
            <span className="px-1.5 py-[2px] rounded bg-red-500/10 text-[10px] font-bold text-red-400 border border-red-500/20">
              E
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs sm:text-sm text-subtle">
           <span className="truncate max-w-[200px]">{req.artist}</span>
           <span className="w-1 h-1 rounded-full bg-white/20" />
           <span className="flex items-center gap-1 text-white/40">
              <User size={10} /> {req.requestedBy}
           </span>
        </div>
      </div>

      {/* 4. Metadata (Desktop) */}
      <div className="hidden lg:flex items-center text-xs text-subtle font-mono">
        <Clock size={12} className="mr-1.5" />
        {timeAgo(req.requestedAt)}
      </div>

      {/* 5. Actions (Hover reveal on Desktop, persistent on Touch) */}
      <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        {isPending ? (
          <>
            <ActionButton onClick={() => onUpdateStatus(req.id, "approved")} icon={<ThumbsUp size={16} />} color="hover:text-blue-400 hover:bg-blue-400/10" />
            <ActionButton onClick={() => onUpdateStatus(req.id, "rejected")} icon={<Ban size={16} />} color="hover:text-red-400 hover:bg-red-400/10" />
          </>
        ) : (
           // If approved/played, allow deletion or archiving
           <ActionButton onClick={() => onDelete(req.id)} icon={<Trash2 size={16} />} color="hover:text-red-400 hover:bg-red-400/10" />
        )}
      </div>
    </div>
  );
}

// Micro-component for buttons to keep things clean
function ActionButton({ onClick, icon, color }) {
  return (
    <button 
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`p-2 rounded-md text-subtle transition-all duration-200 ${color}`}
    >
      {icon}
    </button>
  )
}