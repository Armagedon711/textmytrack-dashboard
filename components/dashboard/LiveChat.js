"use client";

import { useEffect, useState, useRef } from "react";
import { supabaseBrowserClient } from "@/lib/supabaseClient";
import { MessageSquare, User, Bot, Loader2, Ban, Trash2 } from "lucide-react";

// --- 1. USER COLOR GENERATOR ---
const USER_COLORS = [
  { bg: "bg-blue-500/20", text: "text-blue-400" },
  { bg: "bg-green-500/20", text: "text-green-400" },
  { bg: "bg-orange-500/20", text: "text-orange-400" },
  { bg: "bg-cyan-500/20", text: "text-cyan-400" },
  { bg: "bg-pink-500/20", text: "text-pink-400" },
  { bg: "bg-yellow-500/20", text: "text-yellow-400" },
  { bg: "bg-indigo-500/20", text: "text-indigo-400" },
  { bg: "bg-rose-500/20", text: "text-rose-400" },
];

const getUserColor = (phone) => {
  if (!phone) return USER_COLORS[0];
  let hash = 0;
  for (let i = 0; i < phone.length; i++) {
    hash = phone.charCodeAt(i) + ((hash << 5) - hash);
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
};

export default function LiveChat({ 
  djId, 
  showHeader = true, 
  className = "h-[400px]" 
}) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const supabase = supabaseBrowserClient();
  const scrollRef = useRef(null);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (!djId) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("dj_id", djId)
        .order("created_at", { ascending: true }) 
        .limit(50); 

      if (data) {
        setMessages(data);
        setTimeout(scrollToBottom, 100);
      }
      setLoading(false);
    };

    fetchMessages();

    const channel = supabase
      .channel("live-chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `dj_id=eq.${djId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          setTimeout(scrollToBottom, 100);
        }
      )
      // Listen for updates (like when we manually insert a retraction)
      .on(
        "postgres_changes", 
        { event: "UPDATE", schema: "public", table: "messages", filter: `dj_id=eq.${djId}` },
        (payload) => {
           setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
           setTimeout(scrollToBottom, 100);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [djId]);

  const handleBan = async (phoneNumber) => {
     if (!confirm(`Ban ${phoneNumber}?`)) return;
     await fetch("/api/blacklist", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dj_id: djId, phone_number: phoneNumber })
     });
     alert("User banned.");
  };

  return (
    <div className={`flex flex-col bg-[#12121a] border border-white/5 rounded-2xl overflow-hidden mt-6 ${className}`}>
      
      {showHeader && (
        <div className="p-4 border-b border-white/5 flex items-center gap-2 bg-[#16161f]">
          <div className="p-1.5 rounded-lg bg-green-500/20 text-green-400">
            <MessageSquare size={16} />
          </div>
          <h3 className="text-sm font-bold text-white">Live Text Feed</h3>
        </div>
      )}

      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto px-4 pt-4 pb-8 space-y-4 pr-2 scrollbar-hide"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-600 text-xs mt-10">
            <p>No messages yet.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const userColor = getUserColor(msg.sender_number);
            // CHECK FOR RETRACTION PHRASE
            const isRetraction = msg.reply_body && (msg.reply_body.includes("I've removed") || msg.reply_body.includes("removed"));

            return (
              <div key={msg.id} className="space-y-2">
                
                {/* Incoming Message */}
                <div className="flex justify-start animate-in fade-in slide-in-from-left-2 duration-300">
                  <div className="max-w-[85%]">
                    <div className="flex items-end gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${userColor.bg}`}>
                        <User size={12} className={userColor.text} />
                      </div>
                      <div className="bg-[#1e1e2d] border border-white/5 rounded-2xl rounded-bl-none px-3 py-2">
                        <p className="text-xs sm:text-sm text-gray-200 break-words leading-relaxed">{msg.message_body}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1 ml-8 group">
                        <p className="text-[10px] text-gray-600">
                          {msg.sender_number.replace(/^\+1/, '')} • {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                        <button 
                          onClick={() => handleBan(msg.sender_number)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-500/20 rounded text-gray-600 hover:text-red-400 transition-all"
                          title="Ban User"
                        >
                           <Ban size={10} />
                        </button>
                    </div>
                  </div>
                </div>

                {/* Bot Reply */}
                {msg.reply_body && (
                  <div className="flex justify-end animate-in fade-in slide-in-from-right-2 duration-300">
                     <div className="max-w-[85%]">
                      <div className="flex items-end gap-2 flex-row-reverse">
                        <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                          <Bot size={12} className="text-purple-400" />
                        </div>
                        
                        {/* RETRACTION HIGHLIGHT */}
                        <div className={`rounded-2xl rounded-br-none px-3 py-2 border ${
                          isRetraction 
                            ? "bg-red-500/10 border-red-500/20" 
                            : "bg-purple-500/10 border-purple-500/20"
                        }`}>
                          <p className={`text-xs sm:text-sm break-words leading-relaxed flex items-center gap-2 ${
                            isRetraction ? "text-red-200" : "text-purple-100"
                          }`}>
                            {isRetraction && <Trash2 size={12} className="text-red-400 shrink-0" />}
                            {msg.reply_body}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}