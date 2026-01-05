"use client";

import { useEffect, useState, useRef } from "react";
import { supabaseBrowserClient } from "@/lib/supabaseClient";
import { MessageSquare, User, Mic, Bot, Loader2, Ban, Trash2, Reply, Send, X } from "lucide-react";

// REPLACE WITH YOUR NEW WORKFLOW URL
const N8N_REPLY_WEBHOOK = "/api/reply";

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

const formatPhoneNumber = (phone) => {
    if (!phone) return "Unknown";
    const cleaned = phone.replace(/^\+1/, '').replace(/\D/g, '');
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone.replace(/^\+1/, '');
};

export default function LiveChat({ 
  djId, 
  showHeader = true, 
  className = "h-[400px]" 
}) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null); 
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  
  const supabase = supabaseBrowserClient();
  const scrollRef = useRef(null);

  // Reliable Auto-Scroll
  const scrollToBottom = () => {
    if (scrollRef.current) {
      setTimeout(() => {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 50); 
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
           // Prevent duplicates if we already added it locally
           setMessages((prev) => {
             if (prev.some(m => m.id === payload.new.id)) return prev;
             return [...prev, payload.new];
           });
        }
      )
      .on(
        "postgres_changes", 
        { event: "UPDATE", schema: "public", table: "messages", filter: `dj_id=eq.${djId}` },
        (payload) => {
           setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
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

  const canReply = (timestamp) => {
      const msgTime = new Date(timestamp).getTime();
      const now = new Date().getTime();
      const hoursDiff = (now - msgTime) / (1000 * 60 * 60);
      return hoursDiff < 12;
  };

  const sendReply = async (phoneNumber) => {
      if (!replyText.trim()) return;
      setSendingReply(true);
      const textToSend = replyText;
      setReplyText(""); // Clear input immediately
      setReplyingTo(null);

      try {
          // 1. SAVE TO DB FIRST (Guarantees it persists on refresh)
          const { error: dbError } = await supabase.from('messages').insert({
              dj_id: djId,
              sender_number: phoneNumber,
              message_body: "(Reply)",
              reply_body: textToSend
          });

          if (dbError) throw dbError;

          // 2. SEND SMS via n8n
          const res = await fetch(N8N_REPLY_WEBHOOK, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  dj_id: djId,
                  phone: phoneNumber,
                  message: textToSend
              })
          });
          
          const result = await res.json();
          if (!result.success) {
              alert("Message Blocked by Safety Filter: " + (result.error || "Unknown"));
          } 

      } catch (e) {
          console.error(e);
          alert("Failed to send reply. Please try again.");
      } finally {
          setSendingReply(false);
      }
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
        className="flex-1 overflow-y-auto overflow-x-hidden px-4 pt-4 pb-20 lg:pb-4 space-y-4 scroll-smooth
          [&::-webkit-scrollbar]:w-1.5
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:bg-white/10
          [&::-webkit-scrollbar-thumb]:rounded-full
          hover:[&::-webkit-scrollbar-thumb]:bg-white/20"
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
            const isRetraction = msg.reply_body && (msg.reply_body.includes("I've removed") || msg.reply_body.includes("removed"));
            const showReplyBtn = canReply(msg.created_at);
            
            // LOGIC: If message_body is "(Reply)", it's a manual DJ reply.
            // Otherwise, it's an automated bot message (referencing a user request).
            const isManualReply = msg.message_body === "(Reply)";

            return (
              <div key={msg.id} className="space-y-2">
                
                {/* 1. USER MESSAGE (Hide if it's just a placeholder for a manual DJ reply) */}
                {!isManualReply && (
                  <div className="flex justify-start animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className="max-w-[90%] sm:max-w-[85%]">
                      <div className="flex items-end gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${userColor.bg}`}>
                          <User size={12} className={userColor.text} />
                        </div>
                        
                        <div className="group relative">
                          <div className="bg-[#1e1e2d] border border-white/5 rounded-2xl rounded-bl-none px-3 py-2">
                            <p className="text-xs sm:text-sm text-gray-200 break-words leading-relaxed">{msg.message_body}</p>
                          </div>

                          {/* Desktop Reply Button */}
                          {showReplyBtn && (
                              <button 
                                  onClick={() => { setReplyingTo(msg.id); setReplyText(""); }}
                                  className="hidden sm:flex absolute -right-10 top-1/2 -translate-y-1/2 w-8 h-8 items-center justify-center bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-full transition-all opacity-50 hover:opacity-100"
                                  title="Reply"
                              >
                                  <Reply size={14} />
                              </button>
                          )}
                        </div>
                      </div>
                      
                      {/* User Info Row */}
                      <div className="flex items-center gap-3 mt-1.5 ml-8">
                          <p className="text-[10px] text-gray-600">
                            {formatPhoneNumber(msg.sender_number)} • {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </p>
                          
                          <div className="flex items-center gap-2">
                              {/* Mobile Reply Button */}
                              {showReplyBtn && (
                                  <button 
                                      onClick={() => { setReplyingTo(msg.id); setReplyText(""); }}
                                      className="sm:hidden flex items-center gap-1 px-2 py-0.5 bg-white/5 rounded-md text-[10px] font-medium text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                                  >
                                      <Reply size={10} /> Reply
                                  </button>
                              )}
                              <button 
                                onClick={() => handleBan(msg.sender_number)}
                                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium text-gray-600 hover:bg-red-500/10 hover:text-red-400 transition-colors opacity-60 hover:opacity-100"
                              >
                                 <Ban size={10} /> <span className="hidden sm:inline">Ban</span>
                              </button>
                          </div>
                      </div>

                      {/* Reply Input */}
                      {replyingTo === msg.id && (
                          <div className="mt-2 ml-8 flex items-center gap-2 animate-in slide-in-from-top-2 bg-[#16161f] p-2 rounded-lg border border-white/10">
                              <input 
                                  autoFocus
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  placeholder="Type a reply..."
                                  className="bg-transparent border-none text-xs text-white w-full focus:ring-0 outline-none"
                                  onKeyDown={(e) => e.key === 'Enter' && sendReply(msg.sender_number)}
                              />
                              <div className="flex items-center gap-1 border-l border-white/10 pl-2">
                                  <button 
                                      onClick={() => sendReply(msg.sender_number)} 
                                      disabled={sendingReply}
                                      className="p-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-400 disabled:opacity-50 transition-colors"
                                  >
                                      {sendingReply ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                                  </button>
                                  <button onClick={() => setReplyingTo(null)} className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded-md transition-colors">
                                      <X size={12} />
                                  </button>
                              </div>
                          </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. SYSTEM REPLY (Bot or DJ) */}
                {msg.reply_body && (
                  <div className="flex justify-end animate-in fade-in slide-in-from-right-2 duration-300">
                     <div className="max-w-[90%] sm:max-w-[85%]">
                      <div className="flex items-end gap-2 flex-row-reverse">
                        
                        {/* ICON: Mic if Manual, Bot if Auto */}
                        <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                          {isManualReply ? (
                             <Mic size={12} className="text-purple-400" />
                          ) : (
                             <Bot size={12} className="text-purple-400" />
                          )}
                        </div>
                        
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
                      
                      {/* LABEL: Only show "DJ -> Number" if it was a manual reply */}
                      {isManualReply && (
                        <div className="flex justify-end mt-1 mr-8">
                           <p className="text-[10px] text-gray-500">
                              DJ ➝ <span className="text-gray-400">{formatPhoneNumber(msg.sender_number)}</span> • {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                           </p>
                        </div>
                      )}
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