"use client";

import { useState } from "react";
import { supabaseBrowserClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Music, AlertCircle, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const supabase = supabaseBrowserClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    router.push("/");
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-[#141420cc] backdrop-blur-xl p-8 rounded-2xl border border-[#1e1e2d] shadow-glow">

        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <Music size={40} className="text-[#ff4da3] drop-shadow-glow" />
          <h1 className="text-3xl font-bold text-white mt-3 tracking-wide">
            DJ Login
          </h1>
        </div>

        {/* Error Display with Reset Option */}
        {errorMsg && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                    <h4 className="text-red-400 font-medium text-sm mb-1">Login Failed</h4>
                    <p className="text-red-300/80 text-xs mb-3">{errorMsg}</p>
                    
                    {/* Reset Password Prompt */}
                    <div className="flex items-center gap-2 pt-2 border-t border-red-500/10">
                        <span className="text-xs text-red-300/60">Trouble logging in?</span>
                        <a 
                           href="/forgot-password" 
                           className="text-xs font-semibold text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                        >
                            Reset Password <ArrowRight size={12} />
                        </a>
                    </div>
                </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-4">
              <input
                type="email"
                className="w-full px-4 py-3 rounded-lg bg-[#1b1b2e] border border-[#2a2a40] text-white placeholder-gray-500 focus:outline-none focus:border-[#ff4da3] focus:shadow-glow transition"
                placeholder="Email address"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <input
                type="password"
                className="w-full px-4 py-3 rounded-lg bg-[#1b1b2e] border border-[#2a2a40] text-white placeholder-gray-500 focus:outline-none focus:border-[#ff4da3] focus:shadow-glow transition"
                placeholder="Password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: loading ? '#ff4da380' : '#ff4da3',
            }}
            className={`w-full py-3 rounded-lg text-white font-semibold shadow-lg 
              transition hover:brightness-110 hover:shadow-glow 
              ${loading ? "cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>

        {/* Signup Link */}
        <p className="text-center text-sm text-gray-400 mt-6">
          Don't have an account?{" "}
          <a
            href="/signup"
            className="text-[#4da3ff] hover:text-[#7abaff] font-medium transition"
          >
            Create one
          </a>
        </p>

      </div>
    </main>
  );
}