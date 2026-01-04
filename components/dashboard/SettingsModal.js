import { useState, useEffect } from "react";
import { Settings, X, Save, AlertCircle, CheckCircle2, DollarSign, Mail, Lock, Ban, Trash2, Plus, Clock, ShieldAlert } from "lucide-react";
import { supabaseBrowserClient } from "@/lib/supabaseClient";

export default function SettingsModal({ 
  isOpen, 
  onClose, 
  djProfile, 
  user, 
  universalNumber 
}) {
  const [activeTab, setActiveTab] = useState("profile"); // profile | blacklist
  
  // -- General Settings State --
  const [tag, setTag] = useState(djProfile?.tag || "");
  const [limitCount, setLimitCount] = useState(djProfile?.request_limit_count || 5);
  const [limitHours, setLimitHours] = useState(djProfile?.request_limit_hours || 1);

  const [status, setStatus] = useState({ type: "", msg: "" });
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  
  // -- Blacklist State --
  const [blacklist, setBlacklist] = useState([]);
  const [newBanNumber, setNewBanNumber] = useState("");
  
  const supabase = supabaseBrowserClient();

  // Load Blacklist when tab changes
  useEffect(() => {
    if (isOpen && activeTab === 'blacklist' && user?.id) {
       fetch(`/api/blacklist?dj_id=${user.id}`)
         .then(res => res.json())
         .then(data => setBlacklist(data.blacklist || []));
    }
  }, [isOpen, activeTab, user]);

  // Sync state if djProfile updates from parent
  useEffect(() => {
    if (djProfile) {
        setTag(djProfile.tag || "");
        setLimitCount(djProfile.request_limit_count || 5);
        setLimitHours(djProfile.request_limit_hours || 1);
    }
  }, [djProfile]);

  if (!isOpen) return null;

  const formatPhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return "...";
    const cleaned = ('' + phoneNumber).replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) return '(' + match[1] + ') ' + match[2] + '-' + match[3];
    return phoneNumber;
  };

  const handleSaveSettings = async () => {
    setStatus({ type: "", msg: "" });
    
    // Validation
    if (!tag.trim()) return setStatus({ type: "error", msg: "Tag cannot be empty" });
    if (limitCount < 1 || limitCount > 100) return setStatus({ type: "error", msg: "Max requests must be between 1 and 100" });
    if (limitHours < 1 || limitHours > 24) return setStatus({ type: "error", msg: "Time limit must be between 1 and 24 hours" });

    setLoading(true);
    try {
      // FIX: Use the API route instead of direct Supabase update to avoid RLS/Permission errors
      const res = await fetch("/api/dj-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            dj_id: user.id, 
            tag: tag.trim(),
            request_limit_count: parseInt(limitCount),
            request_limit_hours: parseInt(limitHours)
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to update settings");
      }
      
      setStatus({ type: "success", msg: "Settings saved successfully!" });
      
      // Optional: Refresh parent data or user context here if needed

    } catch (e) { 
        console.error(e);
        setStatus({ type: "error", msg: e.message || "Failed to update settings" }); 
    } 
    finally { setLoading(false); }
  };

  const handleResetPassword = async () => {
      if (!user?.email) return;
      setResetLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: `${window.location.origin}/update-password` });
      if (error) setStatus({ type: "error", msg: error.message });
      else setStatus({ type: "success", msg: "Password reset email sent!" });
      setResetLoading(false);
  };

  // Blacklist Actions
  const handleBan = async () => {
      if(!newBanNumber) return;
      const res = await fetch("/api/blacklist", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dj_id: user.id, phone_number: newBanNumber })
      });
      if(res.ok) {
          setBlacklist(prev => [{ phone_number: newBanNumber, added_at: new Date() }, ...prev]);
          setNewBanNumber("");
      }
  };

  const handleUnban = async (phone) => {
      await fetch("/api/blacklist", {
          method: "DELETE", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dj_id: user.id, phone_number: phone })
      });
      setBlacklist(prev => prev.filter(item => item.phone_number !== phone));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
       <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
       
       <div className="relative w-full max-w-md bg-[#16161f] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
         {/* Header */}
         <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#12121a]">
            <div className="flex items-center gap-3">
               <h2 className="text-lg font-bold text-white">Settings</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-gray-400">
              <X size={18} />
            </button>
         </div>

         {/* Tabs */}
         <div className="flex border-b border-white/5">
             <button 
                onClick={() => setActiveTab('profile')} 
                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'profile' ? 'text-pink-400 border-b-2 border-pink-400 bg-white/5' : 'text-gray-400 hover:text-white'}`}
             >
                 General
             </button>
             <button 
                onClick={() => setActiveTab('blacklist')} 
                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'blacklist' ? 'text-red-400 border-b-2 border-red-400 bg-white/5' : 'text-gray-400 hover:text-white'}`}
             >
                 Blacklist
             </button>
         </div>

         <div className="p-6 overflow-y-auto">
            {activeTab === 'profile' ? (
                /* GENERAL SETTINGS CONTENT */
                <div className="space-y-8">
                    {status.msg && (
                        <div className={`p-3 rounded-lg border flex items-center gap-2 text-sm ${status.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-green-500/10 border-green-500/20 text-green-400'}`}>
                            {status.type === 'error' ? <AlertCircle size={16}/> : <CheckCircle2 size={16}/>}
                            {status.msg}
                        </div>
                    )}
                    
                    {/* Subscription - Read Only */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Subscription</label>
                        <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                            <div><span className="block font-semibold text-lg text-white capitalize">{djProfile?.plan || "Trial"} Plan</span></div>
                            <button onClick={() => alert("Coming soon")} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#2a2a40] text-white font-medium border border-white/5"><DollarSign size={16} className="text-green-400" />Manage</button>
                        </div>
                    </div>

                    {/* DJ Profile Settings */}
                    <div className="space-y-5">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">DJ Profile</label>
                            <button onClick={handleSaveSettings} disabled={loading} className="text-xs bg-pink-600 hover:bg-pink-700 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2">
                                {loading ? "Saving..." : <><Save size={14} /> Save Changes</>}
                            </button>
                        </div>
                        
                        {/* Tag Input */}
                        <div className="space-y-2">
                             <label className="text-xs text-gray-400">DJ Tag</label>
                             <input value={tag} onChange={(e) => setTag(e.target.value)} className="w-full bg-[#1b1b2e] border border-[#2a2a40] rounded-lg px-4 py-2.5 text-white outline-none focus:border-pink-500 transition-colors" placeholder="Enter DJ Tag..." />
                             <p className="text-xs text-gray-500">Guests text this tag to join your session.</p>
                        </div>

                        {/* Rate Limiting Section */}
                        <div className="p-4 bg-[#1b1b2e]/50 border border-white/5 rounded-xl space-y-4">
                            <div className="flex items-center gap-2 text-white font-medium">
                                <ShieldAlert size={16} className="text-pink-400" />
                                <span>Guest Limits</span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs text-gray-400">Max Requests</label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            min="1" 
                                            max="100"
                                            value={limitCount} 
                                            onChange={(e) => setLimitCount(e.target.value)} 
                                            className="w-full bg-[#0e0e14] border border-[#2a2a40] rounded-lg px-3 py-2 text-white outline-none focus:border-pink-500 text-center" 
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-gray-400">Per Time (Hours)</label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            min="1" 
                                            max="24"
                                            value={limitHours} 
                                            onChange={(e) => setLimitHours(e.target.value)} 
                                            className="w-full bg-[#0e0e14] border border-[#2a2a40] rounded-lg px-3 py-2 text-white outline-none focus:border-pink-500 text-center" 
                                        />
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 text-center">
                                Guests can make <strong>{limitCount}</strong> requests every <strong>{limitHours}</strong> hour{limitHours > 1 ? 's' : ''}.
                            </p>
                        </div>

                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm"><p className="text-white">Text <span className="text-pink-400 font-bold">{tag || "TAG"}</span> to <span className="text-gray-300 font-mono">{formatPhoneNumber(universalNumber)}</span></p></div>
                    </div>

                    {/* Account Settings */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Account</label>
                        <div className="bg-[#0e0e14] border border-white/10 rounded-xl overflow-hidden divide-y divide-white/5">
                            <div className="p-4 flex items-center justify-between"><div className="flex items-center gap-3 text-gray-400"><Mail size={18} /><span className="text-sm">Email</span></div><span className="text-sm text-white">{user?.email}</span></div>
                            <div className="p-4 flex items-center justify-between"><div className="flex items-center gap-3 text-gray-400"><Lock size={18} /><span className="text-sm">Password</span></div><button onClick={handleResetPassword} disabled={resetLoading} className="text-xs bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded-lg border border-white/5">{resetLoading ? "Sending..." : "Send Reset Email"}</button></div>
                        </div>
                    </div>
                </div>
            ) : (
                /* BLACKLIST CONTENT (Unchanged) */
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Add to Blacklist</label>
                        <div className="flex gap-2">
                             <input 
                               value={newBanNumber}
                               onChange={(e) => setNewBanNumber(e.target.value)}
                               className="flex-1 bg-[#1b1b2e] border border-[#2a2a40] rounded-lg px-4 py-2 text-white placeholder-gray-600 focus:border-red-500 outline-none"
                               placeholder="Enter phone number..."
                             />
                             <button onClick={handleBan} className="bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-2 rounded-lg hover:bg-red-500/30">
                                 <Plus size={18} />
                             </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Blocked Numbers ({blacklist.length})</label>
                        <div className="bg-[#0e0e14] border border-white/10 rounded-xl overflow-hidden divide-y divide-white/5 max-h-[300px] overflow-y-auto">
                            {blacklist.length === 0 ? (
                                <div className="p-8 text-center text-gray-600 text-sm">No blocked numbers</div>
                            ) : (
                                blacklist.map((item) => (
                                    <div key={item.id} className="p-3 flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <Ban size={16} className="text-red-500" />
                                            <span className="text-gray-300 font-mono text-sm">{formatPhoneNumber(item.phone_number)}</span>
                                        </div>
                                        <button 
                                          onClick={() => handleUnban(item.phone_number)}
                                          className="p-1.5 hover:bg-white/10 rounded text-gray-500 hover:text-green-400 transition-colors"
                                          title="Unban"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
         </div>
       </div>
    </div>
  );
}