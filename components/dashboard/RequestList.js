import { ListMusic } from "lucide-react";
import RequestItem from "./RequestItem";
// CHANGE: Import from your new file instead of the library directly
import { StrictModeDroppable } from "./StrictModeDroppable"; 

export default function RequestList({ 
  requests, 
  loading, 
  filterStatus, 
  currentPlayingId,
  onPlay,
  onUpdateStatus, 
  onDelete,
  platformPreference,
  tabLabel,
  droppableId 
}) {
  if (loading) {
    return (
      <div className="text-center py-12 sm:py-20">
        <div className="w-10 h-10 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Loading requests...</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12 sm:py-20">
        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
          <ListMusic size={28} className="text-gray-600" />
        </div>
        <h3 className="text-base sm:text-lg font-semibold text-gray-400 mb-2">
          No {tabLabel.toLowerCase()} yet
        </h3>
        <p className="text-gray-600 text-xs sm:text-sm px-4">
          {filterStatus === "pending" ? "Waiting for guests to text in songs..." : "Requests will appear here."}
        </p>
      </div>
    );
  }

  // CHANGE: Use StrictModeDroppable instead of Droppable
  return (
    <StrictModeDroppable droppableId={droppableId || "list"}>
      {(provided) => (
        <div 
           className="space-y-2 sm:space-y-3"
           ref={provided.innerRef}
           {...provided.droppableProps}
        >
          {requests.map((req, index) => {
            
            let hasExternalUrlForSelectedPlatform = false;
            if (platformPreference === 'youtube') hasExternalUrlForSelectedPlatform = req.youtube_video_id || req.url;
            else if (platformPreference === 'spotify') hasExternalUrlForSelectedPlatform = req.spotify_url;
            else if (platformPreference === 'apple') hasExternalUrlForSelectedPlatform = req.apple_url;
            else if (platformPreference === 'soundcloud') hasExternalUrlForSelectedPlatform = req.soundcloud_url;
            
            const shouldUseInternalPlayer = platformPreference === 'youtube' && !!req.youtube_video_id; 

            return (
              <RequestItem
                key={req.id}
                req={req}
                index={index}
                isCurrentlyPlaying={currentPlayingId === req.id}
                hasUrl={shouldUseInternalPlayer || hasExternalUrlForSelectedPlatform}
                onPlay={(r) => onPlay(r, shouldUseInternalPlayer)}
                onUpdateStatus={onUpdateStatus}
                onDelete={onDelete}
              />
            );
          })}
          {provided.placeholder}
        </div>
      )}
    </StrictModeDroppable>
  );
}