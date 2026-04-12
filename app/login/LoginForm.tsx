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
              <label className="block text-xs text-[#A0A0B0] mb-1">Password</label>
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
    </div>
  );
}
