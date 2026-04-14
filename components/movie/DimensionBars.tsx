"use client";

import { cn } from "@/utils/formatters";

interface DimensionBarsProps {
  story:     number;
  direction: number;
  acting:    number;
  visuals:   number;
  rewatch:   number;
  userScores?: {
    story: number; direction: number; acting: number;
    visuals: number; rewatch: number;
  } | null;
}

const DIMS = [
  { key: "story"     as const, label: "Story",     emoji: "📖" },
  { key: "direction" as const, label: "Direction",  emoji: "🎬" },
  { key: "acting"    as const, label: "Acting",     emoji: "🎭" },
  { key: "visuals"   as const, label: "Visuals",    emoji: "🎨" },
  { key: "rewatch"   as const, label: "Rewatch",    emoji: "🔄" },
];

export default function DimensionBars({
  story, direction, acting, visuals, rewatch,
  userScores,
}: DimensionBarsProps) {
  const community = { story, direction, acting, visuals, rewatch };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-[#A0A0B0] uppercase tracking-wide">
        Rating Breakdown
      </h3>
      {DIMS.map((dim) => {
        const score  = community[dim.key] ?? 0;
        const uScore = userScores?.[dim.key];

        return (
          <div key={dim.key} className="group">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-white flex items-center gap-1.5">
                <span>{dim.emoji}</span>
                <span>{dim.label}</span>
              </span>
              <div className="flex items-center gap-2">
                {uScore !== undefined && (
                  <span className="text-xs text-[#505060]">
                    You: <span className="text-[#F5A623] font-mono font-bold">{uScore}</span>
                  </span>
                )}
                <span className="font-mono font-bold text-sm text-white">{score.toFixed(1)}</span>
              </div>
            </div>
            <div className="relative h-2 bg-[#1A1A28] rounded-full overflow-hidden">
              {/* Community bar */}
              <div
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#E50914]/70 to-[#E50914] rounded-full transition-all duration-700 ease-out"
                style={{ width: `${score * 10}%` }}
              />
              {/* User score indicator */}
              {uScore !== undefined && (
                <div
                  className={cn(
                    "absolute top-0 h-full w-0.5 bg-[#F5A623] transition-all duration-700"
                  )}
                  style={{ left: `${uScore * 10}%` }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
