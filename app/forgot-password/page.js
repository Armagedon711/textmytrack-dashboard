"use client";

import { useState } from "react";
import { supabaseBrowserClient } from "@/lib/supabaseClient";
import { Mail, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const supabase = supabaseBrowserClient();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", msg: "" });

  const handleSend = async (e) => {
    e.preventDefault();
    setStatus({ type: "", msg: "" });
    if (!email.trim()) {
      setStatus({ type: "error", msg: "Please enter your email." });
      return;
    }

    setLoading(true);
    try {
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL || "https://dashboard.textmytrack.com";

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${siteUrl}/update-password`,
      });

      if (error) throw error;

      setStatus({
        type: "success",
        msg: "Check your email for a reset link.",
      });
    } catch (err) {
      setStatus({
        type: "error",
        msg: err.message || "Failed to send reset email.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[100dvh] min-h-screen flex items-center justify-center px-6 py-6 overflow-y-auto">
      <div className="w-full max-w-md flex-shrink-0 bg-[#141420cc] backdrop-blur-xl p-8 rounded-2xl border border-[#1e1e2d] shadow-glow">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Mail size={22} className="text-[#4da3ff] drop-shadow-glow" />
          </div>
          <h1 className="text-3xl font-bold text-white mt-3 tracking-wide">
            Reset Password
          </h1>
          <p className="text-sm text-gray-500 mt-2 text-center">
            Enter your email and we’ll send a reset link.
          </p>
        </div>

        {status.msg && (
          <div
            className={`mb-6 rounded-xl p-4 border text-sm flex items-start gap-3 ${
              status.type === "success"
                ? "bg-green-500/10 border-green-500/20 text-green-300"
                : "bg-red-500/10 border-red-500/20 text-red-300"
            }`}
          >
            {status.type === "success" ? (
              <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
            )}
            <p>{status.msg}</p>
          </div>
        )}

        <form onSubmit={handleSend} className="space-y-4">
          <input
            type="email"
            className="w-full px-4 py-3 rounded-lg bg-[#1b1b2e] border border-[#2a2a40] text-white placeholder-gray-500 focus:outline-none focus:border-[#4da3ff] focus:shadow-glow transition"
            placeholder="Email address"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: loading ? "#4da3ff80" : "#4da3ff",
            }}
            className={`w-full py-3 rounded-lg text-white font-semibold shadow-lg 
              transition hover:brightness-110 hover:shadow-glow 
              ${loading ? "cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            {loading ? "Sending..." : "Send reset email"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          <a
            href="/login"
            className="text-[#ff4da3] hover:underline hover:brightness-90 transition inline-flex items-center gap-2"
          >
            <ArrowLeft size={14} /> Back to login
          </a>
        </p>
      </div>
    </main>
  );
}

