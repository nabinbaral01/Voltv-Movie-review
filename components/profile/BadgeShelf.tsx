"use client";

import { useState } from "react";
import { cn } from "@/utils/formatters";
import { ALL_BADGES, type Badge } from "@/types";

interface BadgeShelfProps {
  earnedBadgeIds: string[];
}

const TYPE_ORDER = ["legendary", "epic", "rare", "common"] as const;

export default function BadgeShelf({ earnedBadgeIds }: BadgeShelfProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "earned" | "locked">("all");

  const earnedSet = new Set(earnedBadgeIds);

  const badges: Badge[] = ALL_BADGES.map((b) => ({
    ...b,
    earned: earnedSet.has(b.id),
  })).sort((a, b) => {
    const ao = TYPE_ORDER.indexOf(a.type as typeof TYPE_ORDER[number]);
    const bo = TYPE_ORDER.indexOf(b.type as typeof TYPE_ORDER[number]);
    if (ao !== bo) return ao - bo;
    // Earned first within same type
    return (b.earned ? 1 : 0) - (a.earned ? 1 : 0);
  });

  const filtered = badges.filter((b) => {
    if (filter === "earned") return b.earned;
    if (filter === "locked") return !b.earned;
    return true;
  });

  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#A0A0B0] uppercase tracking-wide">
          Badges
          <span className="ml-2 text-[#F5A623] font-mono">{earnedCount}/{badges.length}</span>
        </h3>
        <div className="flex gap-1">
          {(["all", "earned", "locked"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "text-xs px-2.5 py-1 rounded-[6px] capitalize transition-all",
                filter === f
                  ? "bg-[#E50914]/20 text-[#E50914] border border-[#E50914]/30"
                  : "text-[#505060] hover:text-white"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-5 sm:grid-cols-7 gap-2">
        {filtered.map((badge) => (
          <div
            key={badge.id}
            className="relative"
            onMouseEnter={() => setHoveredId(badge.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <div
              className={cn(
                "w-full aspect-square flex items-center justify-center rounded-[10px] text-2xl",
                "border transition-all duration-200 cursor-default",
                badge.earned
                  ? [
                      "border-transparent",
                      badge.type === "legendary" && "bg-gradient-to-br from-[#F5A623]/20 to-[#E50914]/20 border-[#F5A623]/30 shadow-[0_0_12px_rgba(245,166,35,0.2)]",
                      badge.type === "epic"      && "bg-[#8B5CF6]/20 border-[#8B5CF6]/30",
                      badge.type === "rare"      && "bg-[#3B82F6]/20 border-[#3B82F6]/30",
                      badge.type === "common"    && "bg-[#1A1A28] border-white/[0.08]",
                    ]
                  : "bg-[#12121A] border-[#1E1E2E] filter grayscale opacity-40"
              )}
            >
              {badge.icon}
            </div>

            {/* Tooltip */}
            {hoveredId === badge.id && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50
                              glass-strong rounded-[8px] p-2.5 w-36 shadow-xl pointer-events-none">
                <div className="text-xs font-bold text-white truncate">{badge.name}</div>
                <div className="text-[10px] text-[#505060] mt-0.5 leading-tight">{badge.description}</div>
                {!badge.earned && badge.requirement && (
                  <div className="text-[10px] text-[#A0A0B0] mt-1 leading-tight">
                    🔒 {badge.requirement}
                  </div>
                )}
                {badge.earned && (
                  <div className="text-[10px] text-[#22C55E] mt-1">✓ Earned</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
