"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowserClient } from "@/lib/supabaseClient";
import { Lock, AlertCircle, CheckCircle2 } from "lucide-react";

export default function UpdatePasswordPage() {
  const supabase = supabaseBrowserClient();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState({ type: "", msg: "" });
  const [loading, setLoading] = useState(false);
  const [tokenChecked, setTokenChecked] = useState(false);

  // Basic check: ensure this page is only used when Supabase redirected here
  useEffect(() => {
    const url = new URL(window.location.href);
    const type = url.searchParams.get("type");
    const code = url.searchParams.get("code");

    // Accept either:
    // - ?type=recovery&code=...
    // - ?code=...  (older / misconfigured links)
    if (!code) {
      setStatus({
        type: "error",
        msg: "This reset link is invalid or has expired. Please request a new password reset email.",
      });
    }
    setTokenChecked(true);
  }, []);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setStatus({ type: "", msg: "" });

    if (!password || !confirmPassword) {
      return setStatus({ type: "error", msg: "Please fill out both password fields." });
    }
    if (password !== confirmPassword) {
      return setStatus({ type: "error", msg: "Passwords do not match." });
    }
    if (password.length < 8) {
      return setStatus({ type: "error", msg: "Password must be at least 8 characters." });
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      return setStatus({ type: "error", msg: error.message || "Failed to update password." });
    }

    setStatus({
      type: "success",
      msg: "Password updated successfully. You can now log in with your new password.",
    });

    setTimeout(() => router.push("/login"), 2000);
  };

  return (
    <main className="min-h-[100dvh] min-h-screen flex items-center justify-center px-6 py-6 overflow-y-auto">
      <div className="w-full max-w-md flex-shrink-0 bg-[#141420cc] backdrop-blur-xl p-8 rounded-2xl border border-[#1e1e2d] shadow-glow">
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <Lock size={40} className="text-[#4da3ff] drop-shadow-glow" />
          <h1 className="text-3xl font-bold text-white mt-3 tracking-wide">
            Reset Password
          </h1>
        </div>

        {/* Status message */}
        {status.msg && (
          <div
            className={`mb-6 p-4 rounded-xl border text-sm flex items-start gap-3 ${
              status.type === "error"
                ? "bg-red-500/10 border-red-500/20 text-red-300"
                : "bg-green-500/10 border-green-500/20 text-green-300"
            }`}
          >
            {status.type === "error" ? (
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
            )}
            <p>{status.msg}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <input
            type="password"
            className="w-full px-4 py-3 rounded-lg bg-[#1b1b2e] border border-[#2a2a40] text-white placeholder-gray-400 focus:outline-none focus:border-[#4da3ff] focus:shadow-glow transition"
            placeholder="New password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={!tokenChecked || loading}
          />

          <input
            type="password"
            className="w-full px-4 py-3 rounded-lg bg-[#1b1b2e] border border-[#2a2a40] text-white placeholder-gray-400 focus:outline-none focus:border-[#4da3ff] focus:shadow-glow transition"
            placeholder="Confirm new password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={!tokenChecked || loading}
          />

          <button
            type="submit"
            disabled={loading || !tokenChecked}
            style={{
              backgroundColor: loading ? "#4da3ff80" : "#4da3ff",
            }}
            className={`w-full py-3 rounded-lg text-white font-semibold 
              hover:brightness-110 hover:shadow-glow transition 
              ${loading || !tokenChecked ? "cursor-not-allowed opacity-70" : "cursor-pointer"}
            `}
          >
            {loading ? "Updating password..." : "Update Password"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-5">
          Remembered your password?{" "}
          <a
            href="/login"
            className="text-[#ff4da3] hover:underline hover:brightness-90 transition"
          >
            Back to login
          </a>
        </p>
      </div>
    </main>
  );
}

