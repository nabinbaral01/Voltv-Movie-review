"use client";

import { cn } from "@/utils/formatters";

interface VoltVMeterProps {
  skip_pct: number;
  timepass_pct: number;
  watchit_pct: number;
  masterpiece_pct: number;
  total_votes: number;
  size?: "sm" | "md" | "lg";
  userVerdict?: "skip" | "timepass" | "watchit" | "masterpiece" | null;
}

const VERDICTS = [
  {
    key:   "skip"        as const,
    label: "Skip It",
    emoji: "💀",
    bar:   "meter-skip",
    text:  "text-gray-400",
    pctKey: "skip_pct",
  },
  {
    key:   "timepass"   as const,
    label: "Timepass",
    emoji: "😐",
    bar:   "meter-timepass",
    text:  "text-amber-500",
    pctKey: "timepass_pct",
  },
  {
    key:   "watchit"    as const,
    label: "Watch It",
    emoji: "✅",
    bar:   "meter-watchit",
    text:  "text-blue-400",
    pctKey: "watchit_pct",
  },
  {
    key:   "masterpiece"as const,
    label: "Masterpiece",
    emoji: "🔥",
    bar:   "meter-masterpiece",
    text:  "text-[#E50914]",
    pctKey: "masterpiece_pct",
  },
] as const;

export default function VoltVMeter({
  skip_pct,
  timepass_pct,
  watchit_pct,
  masterpiece_pct,
  total_votes,
  size = "md",
  userVerdict,
}: VoltVMeterProps) {
  const data = { skip_pct, timepass_pct, watchit_pct, masterpiece_pct };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#A0A0B0] uppercase tracking-wide">
          VOLTV Verdict
        </h3>
        {total_votes > 0 && (
          <span className="text-xs text-[#505060]">
            {total_votes.toLocaleString()} votes
          </span>
        )}
      </div>

      {total_votes === 0 ? (
        <p className="text-sm text-[#505060] italic">No ratings yet — be the first!</p>
      ) : (
        <div className="space-y-2">
          {VERDICTS.map((v) => {
            const pct = data[v.pctKey as keyof typeof data];
            const isUser = userVerdict === v.key;

            return (
              <div key={v.key} className={cn("group", isUser && "opacity-100")}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    size === "sm" ? "text-sm" : "text-base"
                  )}>
                    {v.emoji}
                  </span>
                  <span className={cn(
                    "flex-1 text-sm font-medium",
                    isUser ? v.text : "text-[#A0A0B0]"
                  )}>
                    {v.label}
                    {isUser && (
                      <span className="ml-2 text-xs font-normal text-[#505060]">
                        (your vote)
                      </span>
                    )}
                  </span>
                  <span className={cn(
                    "font-mono font-bold text-sm",
                    isUser ? v.text : "text-[#A0A0B0]"
                  )}>
                    {pct}%
                  </span>
                </div>
                <div className="h-2 bg-[#1A1A28] rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700 ease-out",
                      v.bar,
                      isUser && "ring-1 ring-offset-0 ring-white/20"
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
