"use client";

import { useState } from "react";

interface Poster {
  id: number;
  title: string;
  poster_path: string;
}

type Mode = "login" | "signup";

export default function LoginForm({ posters }: { posters: Poster[] }) {
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Forgot-password panel
  const [forgotOpen, setForgotOpen]       = useState(false);
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotError, setForgotError]     = useState<string | null>(null);
  const [forgotSent, setForgotSent]       = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setForgotError(null);
    if (!forgotUsername.trim()) { setForgotError("Enter your username"); return; }
    setForgotLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ username: forgotUsername.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setForgotError(json.error || "Something went wrong"); return; }
      setForgotSent(true);
    } catch {
      setForgotError("Network error — check your connection");
    } finally {
      setForgotLoading(false);
    }
  }

  function closeForgot() {
    setForgotOpen(false);
    setForgotSent(false);
    setForgotError(null);
    setForgotUsername("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError("Fill in all fields");
      return;
    }

    if (mode === "signup" && password !== confirmPw) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/simple-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: username.trim(), password, mode }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(json.error || "Something went wrong");
        return;
      }

      window.location.href = "/";
    } catch {
      setError("Network error — check your connection");
    } finally {
      setLoading(false);
    }
  }

  const cols = [0, 1, 2, 3].map((i) => posters.filter((_, idx) => idx % 4 === i));

  return (
    <div className="h-screen overflow-hidden bg-black flex">
      {/* Left — sliding poster columns */}
      <div className="hidden md:flex relative flex-1 overflow-hidden">
        <div className="flex gap-2 p-2 w-full">
          {cols.map((col, ci) => (
            <div
              key={ci}
              className="flex-1 flex flex-col gap-2 animate-float-col"
              style={{
                animationDuration: `${22 + ci * 4}s`,
                animationDelay: `${ci * -2}s`,
                animationDirection: ci % 2 === 0 ? "normal" : "reverse",
              }}
            >
              {[...col, ...col].map((p, pi) => (
                <img
                  key={`${p.id}-${pi}`}
                  src={`https://image.tmdb.org/t/p/w342${p.poster_path}`}
                  alt={p.title}
                  className="w-full rounded-lg object-cover"
                  loading="lazy"
                />
              ))}
            </div>
          ))}
        </div>
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-black to-transparent pointer-events-none" />
      </div>

      {/* Right — auth panel */}
      <div className="w-full md:w-[440px] h-full flex flex-col items-center justify-center px-8 py-6 bg-black overflow-y-auto">
        {/* Brand */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-black" />
          </div>
          <span className="text-white text-2xl font-bold tracking-wide">VOLTV</span>
        </div>

        {/* Card */}
        <div className="w-full max-w-sm bg-[#121216] border border-white/5 rounded-2xl p-6 space-y-4">
          <h2 className="text-center text-white text-lg font-semibold">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h2>

          {/* Tabs */}
          <div className="flex bg-[#0A0A0F] rounded-lg p-1">
            <button
              type="button"
              onClick={() => { setMode("login"); setError(null); }}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
                mode === "login" ? "bg-white text-black" : "text-[#A0A0B0]"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => { setMode("signup"); setError(null); }}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
                mode === "signup" ? "bg-white text-black" : "text-[#A0A0B0]"
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs text-[#A0A0B0] mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. moviefan42"
                className="w-full bg-[#1A1A22] border border-white/5 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-[#E50914]"
                required
                autoFocus
                autoComplete="username"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-[#A0A0B0]">Password</label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => { setForgotOpen(true); setForgotUsername(username); }}
                    className="text-xs text-[#A0A0B0] hover:text-[#E50914] transition-colors"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 4 characters"
                className="w-full bg-[#1A1A22] border border-white/5 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-[#E50914]"
                required
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>

            {mode === "signup" && (
              <div>
                <label className="block text-xs text-[#A0A0B0] mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full bg-[#1A1A22] border border-white/5 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-[#E50914]"
                  required
                  autoComplete="new-password"
                />
              </div>
            )}

            {error && <p className="text-xs text-[#E50914] text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#E50914] hover:bg-[#C50812] disabled:opacity-50 text-white font-semibold py-2.5 rounded-full transition-colors"
            >
              {loading ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-xs text-[#A0A0B0]">
          {mode === "login" ? (
            <>
              Don&apos;t have an account?{" "}
              <button onClick={() => setMode("signup")} className="text-white hover:underline">
                Sign Up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button onClick={() => setMode("login")} className="text-white hover:underline">
                Login
              </button>
            </>
          )}
        </p>
      </div>

      {/* Forgot password modal */}
      {forgotOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={closeForgot}
        >
          <div
            className="w-full max-w-sm bg-[#121216] border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {forgotSent ? (
              <>
                <div className="flex flex-col items-center gap-3 text-center pt-2">
                  <div className="w-12 h-12 rounded-full bg-[#22C55E]/10 flex items-center justify-center text-[#22C55E] text-2xl">
                    ✓
                  </div>
                  <h3 className="text-white text-lg font-semibold">Request sent</h3>
                  <p className="text-sm text-[#A0A0B0] leading-relaxed">
                    If an account with that username exists, an admin will reach out shortly. For faster help, contact support.
                  </p>
                </div>
                <button
                  onClick={closeForgot}
                  className="w-full bg-[#E50914] hover:bg-[#C50812] text-white font-semibold py-2.5 rounded-full transition-colors"
                >
                  Back to login
                </button>
              </>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-white text-lg font-semibold">Reset password</h3>
                    <p className="text-xs text-[#A0A0B0] mt-1">
                      Enter your username and we&apos;ll get an admin to help you.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeForgot}
                    aria-label="Close"
                    className="text-[#A0A0B0] hover:text-white transition-colors text-xl leading-none"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleForgot} className="space-y-3">
                  <div>
                    <label className="block text-xs text-[#A0A0B0] mb-1">Username</label>
                    <input
                      type="text"
                      value={forgotUsername}
                      onChange={(e) => setForgotUsername(e.target.value)}
                      placeholder="your_username"
                      className="w-full bg-[#1A1A22] border border-white/5 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-[#E50914]"
                      autoFocus
                    />
                  </div>

                  {forgotError && <p className="text-xs text-[#E50914]">{forgotError}</p>}

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full bg-[#E50914] hover:bg-[#C50812] disabled:opacity-50 text-white font-semibold py-2.5 rounded-full transition-colors"
                  >
                    {forgotLoading ? "Sending…" : "Send reset request"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
