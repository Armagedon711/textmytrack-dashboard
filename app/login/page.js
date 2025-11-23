"use client";

import { useState } from "react";
import { supabaseBrowserClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Music } from "lucide-react";

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

        {/* Error */}
        {errorMsg && (
          <div className="mb-4 bg-red-500/20 text-red-400 p-3 rounded-lg text-sm border border-red-500/30">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            className="w-full px-4 py-3 rounded-lg bg-[#1b1b2e] border border-[#2a2a40] text-white placeholder-gray-400 focus:outline-none focus:border-[#ff4da3] focus:shadow-glow transition"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            className="w-full px-4 py-3 rounded-lg bg-[#1b1b2e] border border-[#2a2a40] text-white placeholder-gray-400 focus:outline-none focus:border-[#ff4da3] focus:shadow-glow transition"
            placeholder="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

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
        <p className="text-center text-sm text-gray-400 mt-5">
          Don't have an account?{" "}
          <a
            href="/signup"
            className="text-[#4da3ff] hover:underline hover:brightness-90 transition"
          >
            Create one
          </a>
        </p>

      </div>
    </main>
  );
}