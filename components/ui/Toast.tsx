"use client";

// VOLTV uses `sonner` for toasts — this file wraps it with VOLTV styles
import { Toaster, toast as sonnerToast } from "sonner";
import { Star, Check, X, Zap, Award, Flame, Info } from "lucide-react";
import type { ReactNode } from "react";

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

// ── Toast card primitives ───────────────────────────────────────
function Card({
  accent, label, title, sub, icon,
}: {
  accent: string; label: string; title: string; sub?: string; icon: ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0f0f14] shadow-[0_8px_32px_rgba(0,0,0,0.6)] min-w-[260px]"
      style={{ border: `1px solid ${accent}33` }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={{ background: `${accent}1F`, color: accent }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="text-[10px] uppercase tracking-wider font-bold"
          style={{ color: accent }}
        >
          {label}
        </div>
        <div className="text-sm font-semibold text-white truncate leading-tight mt-0.5">
          {title}
        </div>
        {sub && <div className="text-[11px] text-[#A0A0B0] truncate mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// Typed toast helpers
export const toast = {
  success: (message: string, description?: string) =>
    sonnerToast.custom((id) => (
      <div onClick={() => sonnerToast.dismiss(id)} className="cursor-pointer">
        <Card
          accent="#22C55E"
          label="Done"
          title={message}
          sub={description}
          icon={<Check size={16} strokeWidth={2.5} />}
        />
      </div>
    )),

  error: (message: string, description?: string) =>
    sonnerToast.custom((id) => (
      <div onClick={() => sonnerToast.dismiss(id)} className="cursor-pointer">
        <Card
          accent="#E50914"
          label="Error"
          title={message}
          sub={description}
          icon={<X size={16} strokeWidth={2.5} />}
        />
      </div>
    )),

  xp: (amount: number, action: string) =>
    sonnerToast.custom((id) => (
      <div onClick={() => sonnerToast.dismiss(id)} className="cursor-pointer">
        <Card
          accent="#F5A623"
          label={`+${amount} XP`}
          title={action}
          icon={<Zap size={16} className="fill-current" />}
        />
      </div>
    ), { duration: 3000 }),

  badge: (name: string, _icon?: string) =>
    sonnerToast.custom((id) => (
      <div onClick={() => sonnerToast.dismiss(id)} className="cursor-pointer">
        <Card
          accent="#8B5CF6"
          label="Badge unlocked"
          title={name}
          icon={<Award size={16} />}
        />
      </div>
    ), { duration: 5000 }),

  streak: (count: number) =>
    sonnerToast.custom((id) => (
      <div onClick={() => sonnerToast.dismiss(id)} className="cursor-pointer">
        <Card
          accent="#F97316"
          label={`${count} week streak`}
          title="Keep it going!"
          icon={<Flame size={16} className="fill-current" />}
        />
      </div>
    ), { duration: 4000 }),

  info: (message: string, description?: string) =>
    sonnerToast.custom((id) => (
      <div onClick={() => sonnerToast.dismiss(id)} className="cursor-pointer">
        <Card
          accent="#3B82F6"
          label="Info"
          title={message}
          sub={description}
          icon={<Info size={16} />}
        />
      </div>
    )),

  rated: (score10: number) => {
    const out5 = score10 / 2;
    const full = Math.floor(out5);
    const fraction = out5 - full;
    const hasPartial = fraction > 0.05;
    const stars = (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => {
          if (i < full) {
            return <Star key={i} size={11} style={{ color: "#F5A623", fill: "#F5A623" }} />;
          }
          if (i === full && hasPartial) {
            const pct = Math.round(fraction * 100);
            return (
              <span key={i} className="relative inline-flex" style={{ width: 11, height: 11 }}>
                <Star size={11} className="absolute inset-0" style={{ color: "#3A3A4A" }} />
                <span className="absolute inset-0 overflow-hidden" style={{ width: `${pct}%` }}>
                  <Star size={11} style={{ color: "#F5A623", fill: "#F5A623" }} />
                </span>
              </span>
            );
          }
          return <Star key={i} size={11} style={{ color: "#3A3A4A" }} />;
        })}
      </div>
    );
    sonnerToast.custom((id) => (
      <div onClick={() => sonnerToast.dismiss(id)} className="cursor-pointer">
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0f0f14] shadow-[0_8px_32px_rgba(0,0,0,0.6)] min-w-[260px]"
          style={{ border: `1px solid #F5A62333` }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "#F5A6231F", color: "#F5A623" }}
          >
            <Star size={16} className="fill-current" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: "#F5A623" }}>
              Your rating
            </div>
            <div className="text-sm font-semibold text-white tabular-nums leading-tight mt-0.5">
              {out5.toFixed(1)}
              <span className="text-[#6B6B80] font-normal ml-1">/ 5</span>
            </div>
          </div>
          {stars}
        </div>
      </div>
    ), { duration: 2500 });
  },
};
