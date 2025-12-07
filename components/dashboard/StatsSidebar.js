import { Phone, Power, Circle, CheckCircle2 } from "lucide-react";

// Utility function to format phone number
const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return "...";
  // Remove all non-digit characters
  const cleaned = ('' + phoneNumber).replace(/\D/g, '');
  // Match a pattern for 10 digits
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return '(' + match[1] + ') ' + match[2] + '-' + match[3];
  }
  return phoneNumber;
};

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
  
  // Apply formatting to both numbers
  const formattedUniversalNumber = formatPhoneNumber(universalNumber);
  const formattedTwilioNumber = formatPhoneNumber(djProfile?.twilio_number);

  return (
    <div className="space-y-6">
      {/* Request Line Card */}
      <div className="p-5 rounded-2xl bg-[#12121a] border border-white/5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Phone size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
             <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Request Line</p>
             {isHeadliner ? (
               // Use formatted Twilio number for Headliner
               <p className="text-lg font-bold text-white">{formattedTwilioNumber}</p>
             ) : (
               <div className="text-sm text-gray-300">
                 Text <span className="font-bold text-pink-400">{djProfile?.tag || "..."}</span> to <span className="text-white font-semibold">{formattedUniversalNumber}</span>
               </div>
             )}
          </div>
        </div>
        
        <button 
          onClick={toggleAccepting}
          className={`w-full px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-2 border ${
            acceptingRequests 
              ? "bg-green-500/10 border-green-500/20 text-green-400" 
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}
        >
          <Power size={14} />
          <span className="text-xs font-medium">
            {acceptingRequests ? "Accepting Requests" : "Requests Paused"}
          </span>
        </button>
      </div>

      {/* Platform Selector */}
      <div className="p-5 rounded-2xl bg-[#12121a] border border-white/5">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">Open Songs In</p>
        <div className="space-y-2">
          {Object.entries(platformsConfig).map(([key, config]) => (
            <button 
              key={key} 
              onClick={() => setPlatform(key)} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all border ${
                platform === key ? `${config.bgColor} ${config.borderColor} border-2` : "bg-white/5 border-transparent hover:bg-white/10"
              }`}
            >
              <span className="text-xl">{config.icon}</span>
              <span className={`font-medium ${platform === key ? config.textColor : "text-gray-300"}`}>{config.name}</span>
              {platform === key && <CheckCircle2 size={16} className={`ml-auto ${config.textColor}`} />}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="p-5 rounded-2xl bg-[#12121a] border border-white/5">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-4">Tonight's Stats</p>
        <div className="space-y-3">
           <StatRow label="Total" count={stats.total} color="text-white" />
           <div className="h-px bg-white/5" />
           <StatRow label="Pending" count={stats.pending} color="text-yellow-400" dot />
           <StatRow label="Approved" count={stats.approved} color="text-blue-400" dot />
           <StatRow label="Rejected" count={stats.rejected} color="text-red-400" dot />
           <StatRow label="Played" count={stats.played} color="text-green-400" dot />
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, count, color, dot }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {dot && <Circle size={8} className={`fill-current ${color}`} />}
        <span className="text-gray-400 text-sm">{label}</span>
      </div>
      <span className={`${color} font-semibold`}>{count}</span>
    </div>
  );
}