import { useState } from "react";
import { X, Search, Plus, Disc3, Loader2, ListMusic } from "lucide-react";

export default function AddSongModal({ isOpen, onClose, djId }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setStatusMsg("");

    try {
      const res = await fetch("/api/add-song", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), dj_id: djId }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatusMsg(data.error || "Failed to add. Try again.");
        return;
      }

      if (data.mode === "playlist" && data.added) {
        setStatusMsg(`Added ${data.added} songs from playlist.`);
        setQuery("");
        setTimeout(() => { onClose(); setStatusMsg(""); }, 1500);
      } else {
        setQuery("");
        onClose();
      }
    } catch (error) {
      setStatusMsg("Something went wrong. Try again.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    // FIX: Changed 'items-center' to 'items-start pt-20' for mobile
    // This keeps the modal at the top so the keyboard doesn't cover it.
    // 'md:items-center' restores the centered look on desktop.
    <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4 pt-20 md:pt-4">
      
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-[#12121a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#16161f]">
          <div className="flex items-center gap-2">
             <div className="p-1.5 bg-pink-500/20 rounded-lg">
                <Disc3 size={18} className="text-pink-400" />
             </div>
             <h3 className="font-bold text-white">Add Song Manually</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg text-gray-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
           <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Song, artist, or playlist</label>
              <div className="relative">
                  <input 
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g. Bohemian Rhapsody or a YouTube playlist URL"
                    className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-600 outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all"
                  />
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              </div>
              <p className="text-[11px] text-gray-500 mt-1.5 flex items-center gap-1">
                <ListMusic size={12} /> Paste a YouTube playlist link to add all songs.
              </p>
           </div>

           {statusMsg && (
             <div className={`text-sm rounded-xl px-3 py-2 ${statusMsg.startsWith("Added") ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
               {statusMsg}
             </div>
           )}

           <button 
             type="submit" 
             disabled={loading || !query.trim()}
             className="w-full py-3 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
           >
             {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
             {loading ? "Adding..." : "Add to Queue"}
           </button>
        </form>
      </div>
    </div>
  );
}