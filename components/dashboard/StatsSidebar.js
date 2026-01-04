import { Phone, Power, ExternalLink } from "lucide-react";
import LiveChat from "./LiveChat"; 

const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return "...";
  let cleaned = ('' + phoneNumber).replace(/\D/g, '');
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
      cleaned = cleaned.substring(1);
  }
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return '(' + match[1] + ') ' + match[2] + '-' + match[3];
  }
  return phoneNumber;
};

export default function StatsSidebar({ 
  djProfile, 
  universalNumber, 
  acceptingRequests, 
  toggleAccepting, 
  platform,
  setPlatform,
  platformsConfig 
}) {
  const isHeadliner = djProfile?.plan?.toLowerCase() === "headliner";
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

      {/* Platform Selector (Compact Dropdown) */}
      <div className="p-4 rounded-2xl bg-[#12121a] border border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-400">
           <ExternalLink size={16} />
           <span className="text-sm font-medium">Open Songs In</span>
        </div>
        
        <select 
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="bg-[#1e1e2d] text-white text-sm border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-pink-500 cursor-pointer"
        >
          {Object.entries(platformsConfig).map(([key, config]) => (
            <option key={key} value={key}>
               {config.name}
            </option>
          ))}
        </select>
      </div>

      {/* Live Chat Feed */}
      {djProfile?.id && <LiveChat djId={djProfile.id} />}
    </div>
  );
}