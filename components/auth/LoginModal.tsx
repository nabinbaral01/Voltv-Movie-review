"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { useSignIn } from "@/hooks/useAuth";
import { toast } from "@/components/ui/Toast";

type Step = "choose" | "phone" | "otp" | "password";

interface LoginModalProps {
  isOpen:   boolean;
  onClose:  () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [step,     setStep]     = useState<Step>("choose");
  const [phone,    setPhone]    = useState("");
  const [otp,      setOtp]      = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);

  const { signInWithGoogle, signInWithPhone, verifyOTP } = useSignIn();

  function handleClose() {
    setStep("choose");
    setPhone("");
    setOtp("");
    setUsername("");
    setPassword("");
    onClose();
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/simple-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) throw new Error("Invalid username or password");
      toast.success("Welcome to VOLTV!");
      window.location.href = "/";
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) throw error;
      handleClose();
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
      setStep("otp");
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
      handleClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Invalid OTP");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={isOpen} onClose={handleClose} title="">
      <div className="p-2">
        {/* Logo */}
        <div className="text-center mb-8">
          <h2 className="font-display text-4xl text-white tracking-wider mb-1">VOLTV</h2>
          <p className="text-sm text-[#A0A0B0]">Your Cinematic Universe awaits</p>
        </div>

        {step === "choose" && (
          <div className="space-y-3">
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
              Continue with Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#2A2A40]" />
              <span className="text-xs text-[#505060]">or</span>
              <div className="flex-1 h-px bg-[#2A2A40]" />
            </div>

            {/* Phone */}
            <button
              onClick={() => setStep("phone")}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-[#1A1A28] border border-[#2A2A40] text-white hover:border-[#E50914]/40 transition-colors"
            >
              📱 Continue with Phone
            </button>

            {/* Username / Password */}
            <button
              onClick={() => setStep("password")}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-[#1A1A28] border border-[#2A2A40] text-white hover:border-[#E50914]/40 transition-colors"
            >
              🔑 Continue with Username
            </button>

            <p className="text-xs text-[#505060] text-center pt-2">
              By joining, you agree to our Terms and Privacy Policy.
            </p>
          </div>
        )}

        {step === "phone" && (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#A0A0B0] mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full bg-[#1A1A28] border border-[#2A2A40] rounded-lg px-4 py-3 text-white placeholder-[#505060] focus:outline-none focus:border-[#E50914]/50"
                required
                autoFocus
              />
              <p className="text-xs text-[#505060] mt-1">Include country code (e.g., +1 for US)</p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep("choose")}
                className="btn-secondary px-4 py-3 rounded-lg flex-1 text-sm"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || !phone.trim()}
                className="btn-primary px-4 py-3 rounded-lg flex-1 text-sm disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send OTP"}
              </button>
            </div>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#A0A0B0] mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full bg-[#1A1A28] border border-[#2A2A40] rounded-lg px-4 py-3 text-white placeholder-[#505060] focus:outline-none focus:border-[#E50914]/50"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#A0A0B0] mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#1A1A28] border border-[#2A2A40] rounded-lg px-4 py-3 text-white placeholder-[#505060] focus:outline-none focus:border-[#E50914]/50"
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep("choose")}
                className="btn-secondary px-4 py-3 rounded-lg flex-1 text-sm"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || !username || !password}
                className="btn-primary px-4 py-3 rounded-lg flex-1 text-sm disabled:opacity-50"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </div>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div className="text-center mb-2">
              <p className="text-sm text-[#A0A0B0]">
                Code sent to <span className="text-white">{phone}</span>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#A0A0B0] mb-2">
                Verification Code
              </label>
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
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setStep("phone"); setOtp(""); }}
                className="btn-secondary px-4 py-3 rounded-lg flex-1 text-sm"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="btn-primary px-4 py-3 rounded-lg flex-1 text-sm disabled:opacity-50"
              >
                {loading ? "Verifying…" : "Verify"}
              </button>
            </div>
            <button
              type="button"
              onClick={handlePhoneSubmit as unknown as React.MouseEventHandler}
              disabled={loading}
              className="w-full text-xs text-[#505060] hover:text-white transition-colors py-1"
            >
              Resend code
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
}
