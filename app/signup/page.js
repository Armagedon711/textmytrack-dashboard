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
  const [loading, setLoading] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setSuccessMsg("Check your email to confirm your account!");

    // Redirect after 2 seconds
    setTimeout(() => router.push("/login"), 2000);
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-[#141420cc] backdrop-blur-xl p-8 rounded-2xl border border-[#1e1e2d] shadow-glow">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <UserPlus size={40} className="text-[#4da3ff] drop-shadow-glow" />
          <h1 className="text-3xl font-bold text-white mt-3 tracking-wide">
            Create DJ Account
          </h1>
        </div>

        {/* Error Box */}
        {errorMsg && (
          <div className="mb-4 bg-red-500/20 text-red-400 p-3 rounded-lg text-sm border border-red-500/30">
            {errorMsg}
          </div>
        )}

        {/* Success Box */}
        {successMsg && (
          <div className="mb-4 bg-green-500/20 text-green-400 p-3 rounded-lg text-sm border border-green-500/30">
            {successMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSignup} className="space-y-4">
          <input
            type="email"
            className="w-full px-4 py-3 rounded-lg bg-[#1b1b2e] border border-[#2a2a40] text-white placeholder-gray-400 focus:outline-none focus:border-[#4da3ff] focus:shadow-glow transition"
            placeholder="DJ Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            className="w-full px-4 py-3 rounded-lg bg-[#1b1b2e] border border-[#2a2a40] text-white placeholder-gray-400 focus:outline-none focus:border-[#4da3ff] focus:shadow-glow transition"
            placeholder="Password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: loading ? '#4da3ff80' : '#4da3ff',
            }}
            className={`w-full py-3 rounded-lg text-white font-semibold 
              hover:brightness-110 hover:shadow-glow transition 
              ${loading ? "cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        {/* Login Link */}
        <p className="text-center text-sm text-gray-400 mt-5">
          Already have an account?{" "}
          <a
            href="/login"
            className="text-[#ff4da3] hover:underline hover:brightness-90 transition"
          >
            Log in
          </a>
        </p>
      </div>
    </main>
  );
}