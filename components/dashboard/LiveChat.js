import { useEffect, useState, useRef } from "react";
import { supabaseBrowserClient } from "@/lib/supabaseClient";
import { MessageSquare, User, Bot } from "lucide-react";

export default function LiveChat({ djId }) {
  const [messages, setMessages] = useState([]);
  const supabase = supabaseBrowserClient();
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!djId) return;

    // Initial Fetch (Last 50 messages)
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("dj_id", djId)
        .order("created_at", { ascending: true }) 
        .limit(50); 

      if (data) setMessages(data);
    };

    fetchMessages();

    // Realtime Subscription
    const channel = supabase
      .channel("live-chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `dj_id=eq.${djId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .on(
        "postgres_changes", 
        { event: "UPDATE", schema: "public", table: "messages", filter: `dj_id=eq.${djId}` },
        (payload) => {
           // Update the message if the bot reply is added later
           setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [djId]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-[400px] bg-[#12121a] border border-white/5 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center gap-2 bg-[#16161f]">
        <div className="p-1.5 rounded-lg bg-green-500/20 text-green-400">
          <MessageSquare size={16} />
        </div>
        <h3 className="text-sm font-bold text-white">Live Text Feed</h3>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
        {messages.length === 0 ? (
          <p className="text-center text-gray-600 text-xs mt-10">Waiting for texts...</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="space-y-2">
              
              {/* User Message (Left) */}
              <div className="flex justify-start">
                <div className="max-w-[85%]">
                  <div className="flex items-end gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                      <User size={12} className="text-blue-400" />
                    </div>
                    <div className="bg-[#1e1e2d] border border-white/5 rounded-2xl rounded-bl-none px-3 py-2">
                      <p className="text-sm text-gray-200 break-words">{msg.message_body}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-600 ml-8 mt-1">
                    {msg.sender_number.slice(-4).padStart(msg.sender_number.length, '*')} • {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>
              </div>

              {/* Bot Reply (Right) */}
              {msg.reply_body && (
                <div className="flex justify-end animate-in fade-in slide-in-from-bottom-2">
                   <div className="max-w-[85%]">
                    <div className="flex items-end gap-2 flex-row-reverse">
                      <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                        <Bot size={12} className="text-purple-400" />
                      </div>
                      <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl rounded-br-none px-3 py-2">
                        <p className="text-sm text-purple-100 break-words">{msg.reply_body}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}