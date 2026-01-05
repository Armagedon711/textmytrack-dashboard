import { useState } from "react";
import { X, Search, Plus, Disc3, Loader2 } from "lucide-react";

export default function AddSongModal({ isOpen, onClose, djId }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);

    try {
      // REPLACE THIS URL with the "Production URL" from the new n8n workflow below
      const N8N_WEBHOOK_URL = "https://n8n.theprotoforge.com/webhook/manual-add"; 

      await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            query: query, 
            dj_id: djId,
            source: "dashboard"
        }),
      });
      
      setQuery("");
      onClose();
    } catch (error) {
      alert("Failed to add song. Check console.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
              <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Song / Artist</label>
              <div className="relative">
                  <input 
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g. Bohemian Rhapsody..."
                    className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-600 outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all"
                  />
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              </div>
           </div>

           <button 
             type="disabled" 
             disabled={loading || !query.trim()}
             className="w-full py-3 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
           >
             {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
             {loading ? "Searching & Adding..." : "Add to Queue"}
           </button>
        </form>
      </div>
    </div>
  );
}