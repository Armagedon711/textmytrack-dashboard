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

  async function handleLogin(e) {
    e.preventDefault();
    setErrorMsg("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    router.push("/");
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#141420cc] backdrop-blur-xl p-8 rounded-2xl border border-[#1e1e2d] shadow-2xl">
        
        <div className="flex flex-col items-center mb-6">
          <Music size={40} className="text-brand-pink drop-shadow-glow" />
          <h1 className="text-3xl font-bold text-white mt-2">DJ Login</h1>
        </div>

        {errorMsg && (
          <div className="mb-4 bg-red-500/20 text-red-400 p-3 rounded-lg text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            className="w-full px-4 py-3 rounded-lg bg-[#1b1b2e] border border-[#2a2a40] text-white placeholder-gray-400 focus:outline-none focus:border-brand-pink transition"
            placeholder="Email"
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            className="w-full px-4 py-3 rounded-lg bg-[#1b1b2e] border border-[#2a2a40] text-white placeholder-gray-400 focus:outline-none focus:border-brand-pink transition"
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-brand-pink text-white font-semibold hover:bg-pink-600 transition shadow-lg"
          >
            Log In
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-4">
          Don’t have an account?{" "}
          <a
            href="/signup"
            className="text-brand-blue hover:underline"
          >
            Create one
          </a>
        </p>
      </div>
    </main>
  );
}
