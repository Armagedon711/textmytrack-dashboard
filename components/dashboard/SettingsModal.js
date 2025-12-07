import { useState } from "react";
import { Settings, X, Save, AlertCircle, CheckCircle2, Phone, Tag, DollarSign } from "lucide-react";

export default function SettingsModal({ 
  isOpen, 
  onClose, 
  djProfile, 
  user, 
  universalNumber 
}) {
  const [tag, setTag] = useState(djProfile?.tag || "");
  const [status, setStatus] = useState({ type: "", msg: "" });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Utility function to format phone number (copied from StatsSidebar for consistency)
  const formatPhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return "...";
    const cleaned = ('' + phoneNumber).replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return '(' + match[1] + ') ' + match[2] + '-' + match[3];
    }
    return phoneNumber;
  };
  
  const formattedUniversalNumber = formatPhoneNumber(universalNumber);

  const handleSaveTag = async () => {
    setStatus({ type: "", msg: "" });
    if (!tag.trim()) return setStatus({ type: "error", msg: "Tag cannot be empty" });
    
    setLoading(true);
    try {
      const res = await fetch("/api/dj-tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dj_id: user.id, tag: tag.trim() }),
      });
      const result = await res.json();
      
      if (result.success) {
        setStatus({ type: "success", msg: "Tag updated!" });
        // In a real app, update global context or trigger refetch
      } else {
        setStatus({ type: "error", msg: result.error || "Failed to update" });
      }
    } catch (e) {
      setStatus({ type: "error", msg: "Server error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
       <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
       
       <div className="relative w-full max-w-md bg-[#16161f] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
         {/* Header */}
         <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#12121a]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-pink-500/20">
                <Settings size={20} className="text-pink-400" />
              </div>
              <h2 className="text-lg font-bold text-white">Settings</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-gray-400">
              <X size={18} />
            </button>
         </div>

         <div className="p-6 space-y-6">
            {/* Plan Info and Upgrade Button */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Your Plan</label>
                <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg">
                    <span className="font-semibold text-lg text-pink-400 capitalize">
                       {djProfile?.plan || "Trial"}
                    </span>
                    <button 
                       onClick={() => alert("Upgrade functionality coming soon!")}
                       className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-pink-600 text-white font-medium hover:bg-pink-700 transition-colors text-sm"
                    >
                       <DollarSign size={16} />
                       Upgrade Plan
                    </button>
                </div>
            </div>

            {/* Tag Input */}
            <div className="space-y-3">
               <label className="text-sm font-medium text-gray-300">Your DJ Tag</label>
               <div className="flex gap-2">
                 <input 
                   value={tag}
                   onChange={(e) => setTag(e.target.value)}
                   className="flex-1 bg-[#1b1b2e] border border-[#2a2a40] rounded-lg px-4 py-2 text-white focus:border-pink-500 outline-none"
                   placeholder="e.g. DJ Cool"
                 />
                 <button 
                   onClick={handleSaveTag}
                   disabled={loading}
                   className="bg-pink-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-pink-600 disabled:opacity-50"
                 >
                   {loading ? "..." : <Save size={18} />}
                 </button>
               </div>
               
               {/* Status Messages */}
               {status.msg && (
                 <div className={`text-sm flex items-center gap-2 ${status.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                   {status.type === 'error' ? <AlertCircle size={14}/> : <CheckCircle2 size={14}/>}
                   {status.msg}
                 </div>
               )}

               <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                 <p className="text-xs text-blue-400">Preview:</p>
                 {/* FIX: Use formatted universal number */}
                 <p className="text-sm text-white">Text <span className="text-pink-400 font-bold">{tag || "..."}</span> to {formattedUniversalNumber}</p>
               </div>
            </div>

            {/* Read Only Info */}
            <div className="space-y-2">
               <label className="text-sm font-medium text-gray-400">Email</label>
               <div className="p-3 bg-white/5 border border-white/10 rounded-lg text-gray-400 text-sm">
                 {user?.email}
               </div>
            </div>
         </div>
       </div>
    </div>
  );
}