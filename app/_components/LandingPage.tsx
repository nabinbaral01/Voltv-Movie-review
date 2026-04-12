"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSignIn } from "@/hooks/useAuth";
import { toast } from "@/components/ui/Toast";

interface Poster {
  id: number;
  title: string;
  poster_path: string | null;
}

interface LandingPageProps {
  posters: Poster[];
}

// ── Floating poster columns ──────────────────────────────────
function FloatingPosters({ posters }: { posters: Poster[] }) {
  // Split posters into 4 columns
  const cols = [0, 1, 2, 3].map((i) =>
    posters.filter((_, idx) => idx % 4 === i)
  );

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Dark overlay so text stays readable */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#0A0A0F] z-10" />
      <div className="absolute inset-0 bg-black/40 z-[5]" />

      <div className="flex gap-4 h-full p-4">
        {cols.map((col, ci) => (
          <div
            key={ci}
            className="flex-1 flex flex-col gap-4 animate-float-col"
            style={{
              animationDuration: `${20 + ci * 5}s`,
              animationDelay: `${ci * -3}s`,
            }}
          >
            {/* Duplicate for seamless loop */}
            {[...col, ...col].map((p, pi) =>
              p.poster_path ? (
                <img
                  key={`${p.id}-${pi}`}
                  src={`https://image.tmdb.org/t/p/w342${p.poster_path}`}
                  alt={p.title}
                  className="w-full rounded-lg object-cover flex-shrink-0"
                  loading="lazy"
                />
              ) : null
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Auth mode toggle ─────────────────────────────────────────
type AuthMode = "login" | "signup" | "phone" | "otp" | "admin";

export default function LandingPage({ posters }: LandingPageProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [adminId, setAdminId] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { signInWithGoogle, signInWithPhone, verifyOTP } = useSignIn();

  // Check for admin redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("admin") === "1") setMode("admin");
  }, []);

  async function handleGoogle() {
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) throw error;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
      setLoading(false);
    }
  }

  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    try {
      const { error } = await signInWithPhone(phone.trim());
      if (error) throw error;
      setMode("otp");
      toast.info("OTP sent!", "Check your phone for the code.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      const { error } = await verifyOTP(phone.trim(), otp.trim());
      if (error) throw error;
      toast.success("Welcome to VOLTV!", "Your cinematic universe awaits.");
      router.push("/");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Invalid OTP");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: adminId, password: adminPass }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Invalid credentials");
      }
      toast.success("Admin access granted");
      router.push("/admin");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex">
      {/* Left — Floating movie posters */}
      <div className="hidden lg:block relative w-[55%] flex-shrink-0">
        <FloatingPosters posters={posters} />
      </div>

      {/* Right — Auth form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative z-20">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-10">
            <h1 className="font-display text-6xl text-white tracking-wider mb-2">
              VOLTV
            </h1>
            <p className="text-[#A0A0B0] text-sm">Your Cinematic Universe</p>
          </div>

          {/* Auth Card */}
          <div className="glass-strong rounded-2xl p-8">
            {/* Mode tabs (Login / Sign Up) */}
            {(mode === "login" || mode === "signup") && (
              <>
                <div className="flex mb-6 border-b border-[#2A2A40]">
                  <button
                    onClick={() => setMode("login")}
                    className={`flex-1 pb-3 text-sm font-medium transition-colors ${
                      mode === "login"
                        ? "text-white border-b-2 border-[#E50914]"
                        : "text-[#505060] hover:text-[#A0A0B0]"
                    }`}
                  >
                    Login
                  </button>
                  <button
                    onClick={() => setMode("signup")}
                    className={`flex-1 pb-3 text-sm font-medium transition-colors ${
                      mode === "signup"
                        ? "text-white border-b-2 border-[#E50914]"
                        : "text-[#505060] hover:text-[#A0A0B0]"
                    }`}
                  >
                    Sign Up
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Google */}
                  <button
                    onClick={handleGoogle}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-white text-gray-900 font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                    </svg>
                    {mode === "login" ? "Sign in with Google" : "Sign up with Google"}
                  </button>

                  {/* Divider */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-[#2A2A40]" />
                    <span className="text-xs text-[#505060]">or</span>
                    <div className="flex-1 h-px bg-[#2A2A40]" />
                  </div>

                  {/* Phone */}
                  <button
                    onClick={() => setMode("phone")}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-[#1A1A28] border border-[#2A2A40] text-white hover:border-[#E50914]/40 transition-colors"
                  >
                    Continue with Phone
                  </button>

                  <p className="text-xs text-[#505060] text-center pt-2">
                    By joining, you agree to our Terms and Privacy Policy.
                  </p>
                </div>
              </>
            )}

            {/* Phone input */}
            {mode === "phone" && (
              <form onSubmit={handlePhoneSubmit} className="space-y-4">
                <h3 className="text-lg font-semibold text-white text-center mb-2">
                  Enter Phone Number
                </h3>
                <div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full bg-[#1A1A28] border border-[#2A2A40] rounded-lg px-4 py-3 text-white placeholder-[#505060] focus:outline-none focus:border-[#E50914]/50"
                    required
                    autoFocus
                  />
                  <p className="text-xs text-[#505060] mt-1">
                    Include country code (e.g., +91 for India)
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="btn-secondary px-4 py-3 rounded-lg flex-1 text-sm"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !phone.trim()}
                    className="btn-primary px-4 py-3 rounded-lg flex-1 text-sm disabled:opacity-50"
                  >
                    {loading ? "Sending..." : "Send OTP"}
                  </button>
                </div>
              </form>
            )}

            {/* OTP verification */}
            {mode === "otp" && (
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div className="text-center mb-2">
                  <h3 className="text-lg font-semibold text-white mb-1">Verify OTP</h3>
                  <p className="text-sm text-[#A0A0B0]">
                    Code sent to <span className="text-white">{phone}</span>
                  </p>
                </div>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="w-full bg-[#1A1A28] border border-[#2A2A40] rounded-lg px-4 py-3 text-white placeholder-[#505060] focus:outline-none focus:border-[#E50914]/50 text-center text-2xl font-mono tracking-[0.5em]"
                  maxLength={6}
                  autoFocus
                  required
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setMode("phone"); setOtp(""); }}
                    className="btn-secondary px-4 py-3 rounded-lg flex-1 text-sm"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="btn-primary px-4 py-3 rounded-lg flex-1 text-sm disabled:opacity-50"
                  >
                    {loading ? "Verifying..." : "Verify"}
                  </button>
                </div>
              </form>
            )}

            {/* Admin login */}
            {mode === "admin" && (
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <h3 className="text-lg font-semibold text-white text-center mb-2">
                  Admin Access
                </h3>
                <div>
                  <label className="block text-sm font-medium text-[#A0A0B0] mb-1">
                    Admin ID
                  </label>
                  <input
                    type="text"
                    value={adminId}
                    onChange={(e) => setAdminId(e.target.value)}
                    placeholder="Enter admin ID"
                    className="w-full bg-[#1A1A28] border border-[#2A2A40] rounded-lg px-4 py-3 text-white placeholder-[#505060] focus:outline-none focus:border-[#E50914]/50"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#A0A0B0] mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={adminPass}
                    onChange={(e) => setAdminPass(e.target.value)}
                    placeholder="Enter password"
                    className="w-full bg-[#1A1A28] border border-[#2A2A40] rounded-lg px-4 py-3 text-white placeholder-[#505060] focus:outline-none focus:border-[#E50914]/50"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !adminId || !adminPass}
                  className="btn-primary w-full px-4 py-3 rounded-lg text-sm disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Access Dashboard"}
                </button>
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="w-full text-xs text-[#505060] hover:text-white transition-colors py-1"
                >
                  Back to login
                </button>
              </form>
            )}
          </div>

          {/* Footer links */}
          {(mode === "login" || mode === "signup") && (
            <p className="text-center text-xs text-[#505060] mt-6">
              {mode === "login" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button onClick={() => setMode("signup")} className="text-[#E50914] hover:underline">
                    Sign Up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button onClick={() => setMode("login")} className="text-[#E50914] hover:underline">
                    Login
                  </button>
                </>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
