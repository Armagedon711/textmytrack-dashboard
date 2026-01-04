import { useState, useEffect } from "react";
import { 
  X, Save, AlertCircle, CheckCircle2, DollarSign, Mail, 
  Lock, Ban, Trash2, Plus, ShieldAlert, User, Music, Settings 
} from "lucide-react";
import { supabaseBrowserClient } from "@/lib/supabaseClient";

// --- FIX 1: Moved NavItem OUTSIDE to prevent re-rendering/scroll jumping ---
const NavItem = ({ id, label, icon: Icon, activeSection, setActiveSection }) => (
  <button 
    onClick={() => setActiveSection(id)}
    className={`flex-shrink-0 md:w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all rounded-xl whitespace-nowrap ${
      activeSection === id 
        ? "bg-pink-500/10 text-pink-400 border border-pink-500/20" 
        : "text-gray-400 hover:text-white hover:bg-white/5"
    }`}
  >
    <Icon size={18} />
    {label}
  </button>
);

export default function SettingsModal({ 
  isOpen, 
  onClose, 
  djProfile, 
  user, 
  universalNumber 
}) {
  const [activeSection, setActiveSection] = useState("profile"); 
  
  // -- Data State --
  const [tag, setTag] = useState(djProfile?.tag || "");
  const [limitCount, setLimitCount] = useState(djProfile?.request_limit_count || 5);
  const [limitHours, setLimitHours] = useState(djProfile?.request_limit_hours || 1);

  // -- UI State --
  const [status, setStatus] = useState({ type: "", msg: "" });
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  
  // -- Blacklist State --
  const [blacklist, setBlacklist] = useState([]);
  const [newBanNumber, setNewBanNumber] = useState("");
  
  const supabase = supabaseBrowserClient();

  useEffect(() => {
    if (isOpen && activeSection === 'blacklist' && user?.id) {
       fetch(`/api/blacklist?dj_id=${user.id}`)
         .then(res => res.json())
         .then(data => setBlacklist(data.blacklist || []));
    }
  }, [isOpen, activeSection, user]);

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
    if (!tag.trim()) return setStatus({ type: "error", msg: "Tag cannot be empty" });
    if (limitCount < 1 || limitCount > 100) return setStatus({ type: "error", msg: "Max requests must be between 1 and 100" });
    if (limitHours < 1 || limitHours > 24) return setStatus({ type: "error", msg: "Time limit must be between 1 and 24 hours" });

    setLoading(true);
    try {
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
      if (!res.ok) throw new Error(result.error || "Failed to update settings");
      
      setStatus({ type: "success", msg: "Settings saved successfully!" });
      setTimeout(() => setStatus({ type: "", msg: "" }), 3000);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
       <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
       
       <div className="relative w-full max-w-4xl bg-[#12121a] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-[600px] max-h-[90vh]">
         
         {/* LEFT SIDEBAR (Desktop) / TOP NAV (Mobile) */}
         <div className="w-full md:w-64 bg-[#16161f] border-b md:border-b-0 md:border-r border-white/5 flex flex-col shrink-0">
            <div className="flex items-center justify-between p-4 md:mb-4">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-lg bg-pink-600 flex items-center justify-center">
                     <Settings size={18} className="text-white" />
                   </div>
                   <h2 className="text-lg font-bold text-white">Settings</h2>
                </div>
                <button onClick={onClose} className="md:hidden p-2 hover:bg-white/10 rounded-lg text-gray-400">
                  <X size={20} />
                </button>
            </div>

            <div className="flex md:flex-col overflow-x-auto md:overflow-visible px-4 md:px-2 space-x-2 md:space-x-0 md:space-y-1 pb-4 md:pb-0 scrollbar-hide">
              <NavItem id="profile" label="General Profile" icon={User} activeSection={activeSection} setActiveSection={setActiveSection} />
              <NavItem id="controls" label="Guest Controls" icon={ShieldAlert} activeSection={activeSection} setActiveSection={setActiveSection} />
              <NavItem id="blacklist" label="Blacklist" icon={Ban} activeSection={activeSection} setActiveSection={setActiveSection} />
              <NavItem id="account" label="Account" icon={Lock} activeSection={activeSection} setActiveSection={setActiveSection} />
            </div>

            {/* Desktop Plan Info */}
            <div className="hidden md:block mt-auto p-4 border-t border-white/5">
                <div className="px-4 py-3 bg-[#0e0e14] rounded-xl border border-white/5">
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Current Plan</p>
                    <div className="flex items-center justify-between">
                        <span className="text-white font-medium capitalize">{djProfile?.plan || "Trial"}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/20">Active</span>
                    </div>
                </div>
            </div>
         </div>

         {/* RIGHT CONTENT AREA */}
         <div className="flex-1 flex flex-col relative bg-[#12121a] min-h-0">
            <button onClick={onClose} className="hidden md:block absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg text-gray-400 z-10">
              <X size={20} />
            </button>

            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8">
                
                {status.msg && (
                    <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 text-sm ${
                        status.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-green-500/10 border-green-500/20 text-green-400'
                    }`}>
                        {status.type === 'error' ? <AlertCircle size={18}/> : <CheckCircle2 size={18}/>}
                        {status.msg}
                    </div>
                )}

                {/* 1. GENERAL PROFILE */}
                {activeSection === 'profile' && (
                    <div className="space-y-8 max-w-lg">
                        
                        {/* --- FIX 2: MOBILE PLAN INFO --- */}
                        <div className="block md:hidden mb-6">
                            <div className="px-4 py-3 bg-[#16161f] rounded-xl border border-white/5 flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold">Current Plan</p>
                                    <p className="text-white font-medium capitalize">{djProfile?.plan || "Trial"}</p>
                                </div>
                                <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/20">Active</span>
                            </div>
                        </div>
                        {/* ------------------------------- */}

                        <div>
                            <h3 className="text-xl font-bold text-white mb-1">General Profile</h3>
                            <p className="text-gray-500 text-sm">Manage your public DJ identity and keywords.</p>
                        </div>

                        <div className="space-y-4">
                             <div className="space-y-2">
                                 <label className="text-sm font-medium text-gray-300">DJ Tag</label>
                                 <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Music size={16} className="text-gray-500" />
                                    </div>
                                    <input 
                                        value={tag} 
                                        onChange={(e) => setTag(e.target.value)} 
                                        className="w-full bg-[#1b1b2e] border border-[#2a2a40] rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all" 
                                        placeholder="e.g. DJ Joey" 
                                    />
                                 </div>
                                 <p className="text-xs text-gray-500">Guests text this tag to join your session.</p>
                            </div>

                            <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl flex gap-3">
                                <div className="mt-0.5"><CheckCircle2 size={16} className="text-blue-400" /></div>
                                <div className="space-y-1">
                                    <p className="text-sm text-gray-300 font-medium">Texting Instructions</p>
                                    <p className="text-xs text-gray-500">Tell your guests to text <span className="text-pink-400 font-bold">{tag || "TAG"}</span> to <span className="text-white font-mono">{formatPhoneNumber(universalNumber)}</span></p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. GUEST CONTROLS */}
                {activeSection === 'controls' && (
                    <div className="space-y-8 max-w-lg">
                        <div>
                            <h3 className="text-xl font-bold text-white mb-1">Guest Controls</h3>
                            <p className="text-gray-500 text-sm">Set limits to prevent spam and fair usage.</p>
                        </div>

                        <div className="p-6 bg-[#1b1b2e]/50 border border-white/5 rounded-2xl space-y-6">
                            <div className="flex items-center gap-2 text-white font-medium pb-4 border-b border-white/5">
                                <ShieldAlert size={18} className="text-pink-400" />
                                <span>Rate Limiting</span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Max Songs</label>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max="100"
                                        value={limitCount} 
                                        onChange={(e) => setLimitCount(e.target.value)} 
                                        className="w-full bg-[#0e0e14] border border-[#2a2a40] rounded-xl px-4 py-3 text-white text-lg font-mono outline-none focus:border-pink-500 transition-colors" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Time Window (Hours)</label>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max="24"
                                        value={limitHours} 
                                        onChange={(e) => setLimitHours(e.target.value)} 
                                        className="w-full bg-[#0e0e14] border border-[#2a2a40] rounded-xl px-4 py-3 text-white text-lg font-mono outline-none focus:border-pink-500 transition-colors" 
                                    />
                                </div>
                            </div>
                            <p className="text-sm text-gray-400 bg-black/20 p-3 rounded-lg border border-white/5">
                                Logic: A single phone number can make <strong>{limitCount}</strong> requests every <strong>{limitHours}</strong> hour{limitHours > 1 ? 's' : ''}.
                            </p>
                        </div>
                    </div>
                )}

                {/* 3. BLACKLIST */}
                {activeSection === 'blacklist' && (
                    <div className="space-y-6 h-full flex flex-col">
                        <div>
                            <h3 className="text-xl font-bold text-white mb-1">Blacklist</h3>
                            <p className="text-gray-500 text-sm">Block specific phone numbers from making requests.</p>
                        </div>

                        <div className="flex gap-2">
                             <input 
                               value={newBanNumber}
                               onChange={(e) => setNewBanNumber(e.target.value)}
                               className="flex-1 min-w-0 bg-[#1b1b2e] border border-[#2a2a40] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-red-500 outline-none transition-all"
                               placeholder="Enter phone number..."
                             />
                             <button onClick={handleBan} className="bg-red-500/10 text-red-400 border border-red-500/20 px-4 md:px-6 py-2 rounded-xl hover:bg-red-500/20 font-medium transition-colors flex items-center gap-2 flex-shrink-0">
                                 <Ban size={18} /> <span className="hidden sm:inline">Block</span> <span className="sm:hidden">Block</span>
                             </button>
                        </div>

                        <div className="flex-1 bg-[#0e0e14] border border-white/5 rounded-2xl overflow-hidden flex flex-col">
                            <div className="p-3 border-b border-white/5 bg-white/5 text-xs font-bold text-gray-400 uppercase tracking-wider flex justify-between">
                                <span>Blocked Number</span>
                                <span>Action</span>
                            </div>
                            <div className="overflow-y-auto flex-1 p-2 space-y-1">
                                {blacklist.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-2">
                                        <CheckCircle2 size={32} className="opacity-20" />
                                        <span className="text-sm">No blocked numbers</span>
                                    </div>
                                ) : (
                                    blacklist.map((item) => (
                                        <div key={item.id} className="p-3 flex items-center justify-between group hover:bg-white/5 rounded-lg transition-colors">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                                                    <Ban size={14} className="text-red-500" />
                                                </div>
                                                <span className="text-gray-300 font-mono truncate">{formatPhoneNumber(item.phone_number)}</span>
                                            </div>
                                            <button 
                                              onClick={() => handleUnban(item.phone_number)}
                                              className="p-2 hover:bg-white/10 rounded-lg text-gray-500 hover:text-green-400 transition-colors flex-shrink-0"
                                              title="Unban"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. ACCOUNT */}
                {activeSection === 'account' && (
                    <div className="space-y-8 max-w-lg">
                        <div>
                            <h3 className="text-xl font-bold text-white mb-1">Account Settings</h3>
                            <p className="text-gray-500 text-sm">Manage your login credentials.</p>
                        </div>

                        <div className="bg-[#1b1b2e]/50 border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
                            <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div className="flex items-center gap-4 text-gray-400">
                                    <div className="p-2 bg-white/5 rounded-lg"><Mail size={20} /></div>
                                    <div>
                                        <p className="text-sm font-medium text-white">Email Address</p>
                                        <p className="text-xs text-gray-500">{user?.email}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div className="flex items-center gap-4 text-gray-400">
                                    <div className="p-2 bg-white/5 rounded-lg"><Lock size={20} /></div>
                                    <div>
                                        <p className="text-sm font-medium text-white">Password</p>
                                        <p className="text-xs text-gray-500">Last changed recently</p>
                                    </div>
                                </div>
                                <button onClick={handleResetPassword} disabled={resetLoading} className="text-xs bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg border border-white/5 font-medium transition-colors w-full md:w-auto">
                                    {resetLoading ? "Sending..." : "Reset Password"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* SAVE FOOTER (Only for sections that need saving) */}
            {(activeSection === 'profile' || activeSection === 'controls') && (
                <div className="p-4 border-t border-white/5 bg-[#16161f] flex justify-end">
                    <button 
                        onClick={handleSaveSettings} 
                        disabled={loading} 
                        className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-pink-900/20 transition-all flex items-center gap-2 w-full md:w-auto justify-center"
                    >
                        {loading ? (
                            <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Saving...</span>
                        ) : (
                            <><Save size={18} /> Save Changes</>
                        )}
                    </button>
                </div>
            )}
         </div>
       </div>
    </div>
  );
}