import { ListMusic } from "lucide-react";
import RequestItem from "./RequestItem";

export default function RequestList({ 
  requests, 
  loading, 
  filterStatus, 
  currentPlayingId,
  onPlay,
  onUpdateStatus,
  onDelete,
  platformPreference,
  tabLabel
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

  return (
    <div className="space-y-2 sm:space-y-3">
      {requests.map((req, index) => {
        
        // 1. Determine if a play button is justified based on the selected platform
        let hasExternalUrlForSelectedPlatform = false;
        if (platformPreference === 'youtube') hasExternalUrlForSelectedPlatform = req.youtube_video_id || req.url;
        else if (platformPreference === 'spotify') hasExternalUrlForSelectedPlatform = req.spotify_url;
        else if (platformPreference === 'apple') hasExternalUrlForSelectedPlatform = req.apple_url;
        else if (platformPreference === 'soundcloud') hasExternalUrlForSelectedPlatform = req.soundcloud_url;
        
        // 2. The flag that tells handlePlayRequest whether to open the internal modal or external tab
        // CRITICAL FIX: The internal player is only used if YouTube is the preference AND the YouTube ID exists.
        const shouldUseInternalPlayer = platformPreference === 'youtube' && !!req.youtube_video_id; 

        return (
          <RequestItem
            key={req.id}
            req={req}
            index={index}
            isCurrentlyPlaying={currentPlayingId === req.id}
            // The button should appear if the internal player can be used OR if an external URL is available for the preferred platform
            hasUrl={shouldUseInternalPlayer || hasExternalUrlForSelectedPlatform}
            onPlay={(r) => onPlay(r, shouldUseInternalPlayer)} // Pass the correct flag to page.js's handlePlayRequest
            onUpdateStatus={onUpdateStatus}
            onDelete={onDelete}
          />
        );
      })}
    </div>
  );
}