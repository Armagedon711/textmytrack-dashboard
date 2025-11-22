"use client";

import { useState } from "react";
import { supabaseBrowserClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";

export default function SignupPage() {
  const supabase = supabaseBrowserClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  async function handleSignup(e) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setSuccessMsg("Check your email to confirm your account!");
    setTimeout(() => router.push("/login"), 2000);
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#141420cc] backdrop-blur-xl p-8 rounded-2xl border border-[#1e1e2d] shadow-2xl">
        
        <div className="flex flex-col items-center mb-6">
          <UserPlus size={40} className="text-brand-blue drop-shadow-glow" />
          <h1 className="text-3xl font-bold text-white mt-2">
            Create DJ Account
          </h1>
        </div>

        {errorMsg && (
          <div className="mb-4 bg-red-500/20 text-red-400 p-3 rounded-lg text-sm">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 bg-green-500/20 text-green-400 p-3 rounded-lg text-sm">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <input
            type="email"
            className="w-full px-4 py-3 rounded-lg bg-[#1b1b2e] border border-[#2a2a40] text-white placeholder-gray-400 focus:outline-none focus:border-brand-blue transition"
            placeholder="DJ Email"
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            className="w-full px-4 py-3 rounded-lg bg-[#1b1b2e] border border-[#2a2a40] text-white placeholder-gray-400 focus:outline-none focus:border-brand-blue transition"
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-brand-blue text-white font-semibold hover:bg-blue-600 transition shadow-lg"
          >
            Sign Up
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-4">
          Already have an account?{" "}
          <a
            href="/login"
            className="text-brand-pink hover:underline"
          >
            Log in
          </a>
        </p>
      </div>
    </main>
  );
}
