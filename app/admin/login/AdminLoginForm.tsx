"use client";

import { useState } from "react";
import { Lock, User, Shield, Eye, EyeOff } from "lucide-react";

export default function AdminLoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ username, password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Invalid credentials");
      // Hard navigation: forces the browser to send the freshly-set admin cookie
      // and bypasses the router cache that may still hold the pre-auth redirect.
      window.location.assign("/admin");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="relative w-full max-w-sm rounded-2xl border border-[#1E1E2E] bg-[#0E0E15]/90 backdrop-blur p-6 shadow-2xl"
    >
      {/* Header */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#E50914] to-[#8B5CF6] flex items-center justify-center shadow-lg shadow-[#E50914]/30 mb-3">
          <Shield size={26} className="text-white" />
        </div>
        <h1 className="text-xl font-bold text-white">Admin Access</h1>
        <p className="text-xs text-[#505060] mt-1">Main admin or granted staff account</p>
      </div>

      {/* Username */}
      <label className="block mb-3">
        <span className="text-xs font-semibold text-[#A0A0B0] uppercase tracking-wider">Username</span>
        <div className="relative mt-1.5">
          <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#505060]" />
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
            className="w-full pl-9 pr-3 h-11 bg-[#0A0A0F] border border-[#1E1E2E] rounded-[10px] text-sm text-white focus:outline-none focus:border-[#E50914]/60 transition-colors"
          />
        </div>
      </label>

      {/* Password */}
      <label className="block mb-4">
        <span className="text-xs font-semibold text-[#A0A0B0] uppercase tracking-wider">Password</span>
        <div className="relative mt-1.5">
          <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#505060]" />
          <input
            type={showPass ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="w-full pl-9 pr-10 h-11 bg-[#0A0A0F] border border-[#1E1E2E] rounded-[10px] text-sm text-white focus:outline-none focus:border-[#E50914]/60 transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[#505060] hover:text-white"
            aria-label={showPass ? "Hide password" : "Show password"}
          >
            {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </label>

      {error && (
        <div className="mb-4 px-3 py-2 rounded-[8px] border border-red-500/30 bg-red-500/10 text-xs text-red-400">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full h-11 rounded-[10px] bg-gradient-to-r from-[#E50914] to-[#C50812] hover:brightness-110 text-white text-sm font-semibold disabled:opacity-60 transition-all"
      >
        {loading ? "Authenticating…" : "Enter admin panel"}
      </button>

      <p className="text-[10px] text-[#505060] text-center mt-4">
        This session expires after 8 hours of inactivity.
      </p>
    </form>
  );
}
