"use client";

// VOLTV uses `sonner` for toasts — this file wraps it with VOLTV styles
import { Toaster, toast as sonnerToast } from "sonner";

export function VoltVToaster() {
  return (
    <Toaster
      position="bottom-right"
      expand={false}
      richColors={false}
      toastOptions={{
        style: {
          background: "#1A1A28",
          border: "1px solid #2A2A40",
          color: "#FFFFFF",
          borderRadius: "10px",
          fontSize: "14px",
        },
        className: "font-body",
      }}
    />
  );
}

// Typed toast helpers
export const toast = {
  success: (message: string, description?: string) =>
    sonnerToast.success(message, {
      description,
      icon: "✅",
      style: { background: "#0F2A1A", border: "1px solid #22C55E33" },
    }),

  error: (message: string, description?: string) =>
    sonnerToast.error(message, {
      description,
      icon: "❌",
      style: { background: "#2A0A0A", border: "1px solid #E5091433" },
    }),

  xp: (amount: number, action: string) =>
    sonnerToast(`+${amount} XP`, {
      description: action,
      icon: "⚡",
      duration: 3000,
      style: { background: "#1A1A28", border: "1px solid #F5A62333" },
    }),

  badge: (name: string, icon: string) =>
    sonnerToast(`${icon} Badge Unlocked!`, {
      description: name,
      duration: 5000,
      style: { background: "#1A1228", border: "1px solid #8B5CF633" },
    }),

  streak: (count: number) =>
    sonnerToast(`🔥 ${count} Week Streak!`, {
      description: "Keep it going!",
      duration: 4000,
      style: { background: "#1A1200", border: "1px solid #F5A62333" },
    }),

  info: (message: string, description?: string) =>
    sonnerToast(message, { description, icon: "ℹ️" }),
};
