import { useState } from "react";
import { Settings, X, Save, AlertCircle, CheckCircle2, DollarSign, Mail, Lock } from "lucide-react";
import { supabaseBrowserClient } from "@/lib/supabaseClient";

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
  const [resetLoading, setResetLoading] = useState(false);
  
  const supabase = supabaseBrowserClient();

  if (!isOpen) return null;

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
      } else {
        setStatus({ type: "error", msg: result.error || "Failed to update" });
      }
    } catch (e) {
      setStatus({ type: "error", msg: "Server error" });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
      if (!user?.email) return;
      setResetLoading(true);
      setStatus({ type: "", msg: "" });
      
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
          redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) {
          setStatus({ type: "error", msg: error.message });
      } else {
          setStatus({ type: "success", msg: "Password reset email sent!" });
      }
      setResetLoading(false);
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

         <div className="p-6 space-y-8">
            {/* Status Messages (Global) */}
            {status.msg && (
                <div className={`p-3 rounded-lg border flex items-center gap-2 text-sm ${
                    status.type === 'error' 
                    ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                    : 'bg-green-500/10 border-green-500/20 text-green-400'
                }`}>
                    {status.type === 'error' ? <AlertCircle size={16}/> : <CheckCircle2 size={16}/>}
                    {status.msg}
                </div>
            )}

            {/* Plan Info and Subscription */}
            <div className="space-y-3">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Subscription</label>
                <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                    <div>
                        <span className="block font-semibold text-lg text-white capitalize">
                           {djProfile?.plan || "Trial"} Plan
                        </span>
                        <span className="text-xs text-gray-400">Active until next billing cycle</span>
                    </div>
                    <button 
                       onClick={() => alert("Manage Subscription functionality coming soon!")}
                       className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#2a2a40] hover:bg-[#34344d] text-white font-medium transition-colors text-sm border border-white/5"
                    >
                       <DollarSign size={16} className="text-green-400" />
                       Manage
                    </button>
                </div>
            </div>

            {/* Tag Input */}
            <div className="space-y-3">
               <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">DJ Profile</label>
               <div className="flex gap-2">
                 <input 
                   value={tag}
                   onChange={(e) => setTag(e.target.value)}
                   className="flex-1 bg-[#1b1b2e] border border-[#2a2a40] rounded-lg px-4 py-2 text-white focus:border-pink-500 outline-none placeholder-gray-600"
                   placeholder="Enter your DJ Tag..."
                 />
                 <button 
                   onClick={handleSaveTag}
                   disabled={loading}
                   className="bg-pink-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-pink-700 disabled:opacity-50 transition-colors"
                 >
                   {loading ? "..." : <Save size={18} />}
                 </button>
               </div>
               
               <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex gap-2 items-start">
                 <AlertCircle size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
                 <div className="text-sm">
                    <p className="text-blue-200 text-xs mb-1">How guests request songs:</p>
                    <p className="text-white">Text <span className="text-pink-400 font-bold">{tag || "YOUR-TAG"}</span> to <span className="text-gray-300 font-mono">{formattedUniversalNumber}</span></p>
                 </div>
               </div>
            </div>

            {/* Account Settings */}
            <div className="space-y-3">
               <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Account Settings</label>
               
               <div className="bg-[#0e0e14] border border-white/10 rounded-xl overflow-hidden divide-y divide-white/5">
                   {/* Email Row */}
                   <div className="p-4 flex items-center justify-between">
                       <div className="flex items-center gap-3 text-gray-400">
                           <Mail size={18} />
                           <span className="text-sm">Email Address</span>
                       </div>
                       <span className="text-sm text-white font-medium">{user?.email}</span>
                   </div>

                   {/* Password Row */}
                   <div className="p-4 flex items-center justify-between">
                       <div className="flex items-center gap-3 text-gray-400">
                           <Lock size={18} />
                           <span className="text-sm">Password</span>
                       </div>
                       <button 
                           onClick={handleResetPassword}
                           disabled={resetLoading}
                           className="text-xs bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded-lg border border-white/5 transition-colors"
                       >
                           {resetLoading ? "Sending..." : "Send Reset Email"}
                       </button>
                   </div>
               </div>
            </div>
         </div>
       </div>
    </div>
  );
}