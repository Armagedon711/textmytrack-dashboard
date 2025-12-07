import { Phone, Power, Circle, Music2, Share2 } from "lucide-react";

export default function StatsSidebar({ 
  stats, 
  djProfile, 
  universalNumber, 
  acceptingRequests, 
  toggleAccepting, 
  platform,
  setPlatform,
  platformsConfig 
}) {
  const isHeadliner = djProfile?.plan?.toLowerCase() === "headliner";
  
  return (
    <div className="space-y-4">
      
      {/* 1. Master Toggle (High Priority) */}
      <button 
        onClick={toggleAccepting}
        className={`w-full p-4 rounded-xl border transition-all duration-300 flex items-center justify-between group ${
          acceptingRequests 
            ? "bg-green-500/5 border-green-500/20 hover:bg-green-500/10" 
            : "bg-red-500/5 border-red-500/20 hover:bg-red-500/10"
        }`}
      >
        <div className="text-left">
          <p className={`text-sm font-bold ${acceptingRequests ? 'text-green-400' : 'text-red-400'}`}>
            {acceptingRequests ? "Line Open" : "Line Paused"}
          </p>
          <p className="text-xs text-zinc-500">
            {acceptingRequests ? "Receiving messages" : "Auto-reply active"}
          </p>
        </div>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
           acceptingRequests ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        }`}>
           <Power size={16} />
        </div>
      </button>

      {/* 2. The Number Card (Visual Anchor) */}
      <div className="p-5 rounded-xl bg-gradient-to-br from-surface to-surfaceHighlight border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 opacity-10">
          <Phone size={48} />
        </div>
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Text to Request</p>
        
        {isHeadliner ? (
           <div className="text-2xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">
             {djProfile.twilio_number}
           </div>
        ) : (
           <div>
             <div className="text-lg font-bold text-white mb-1">{universalNumber}</div>
             <div className="text-xs text-zinc-500 bg-black/20 p-2 rounded inline-block">
                Msg: <span className="text-primary font-bold">"{djProfile?.tag || "..."}"</span> + Song
             </div>
           </div>
        )}
      </div>

      {/* 3. Platform Quick Switch */}
      <div className="grid grid-cols-4 gap-2">
        {Object.entries(platformsConfig).map(([key, config]) => {
           const isActive = platform === key;
           return (
            <button 
              key={key} 
              onClick={() => setPlatform(key)} 
              title={`Open in ${config.name}`}
              className={`aspect-square flex flex-col items-center justify-center rounded-lg border transition-all ${
                isActive 
                  ? `${config.bgColor} ${config.borderColor} scale-105 shadow-lg` 
                  : "bg-surface border-transparent opacity-50 hover:opacity-100 hover:bg-white/5"
              }`}
            >
              <span className="text-xl mb-1">{config.icon}</span>
            </button>
           )
        })}
      </div>

      {/* 4. Mini Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Pending" value={stats.pending} color="text-yellow-400" />
        <StatCard label="Played" value={stats.played} color="text-green-400" />
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-surface border border-white/5 p-3 rounded-xl flex flex-col items-center justify-center">
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      <span className="text-xs text-zinc-500">{label}</span>
    </div>
  )
}