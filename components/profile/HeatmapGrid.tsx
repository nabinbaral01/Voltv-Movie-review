"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/utils/formatters";
import type { HeatmapDay } from "@/types";

interface HeatmapGridProps {
  days: HeatmapDay[];
  total_movies: number;
  current_streak: number;
  longest_streak: number;
  customizable?: boolean;
  storageKey?: string;
}

type HeatmapTheme = "green" | "red" | "purple" | "blue" | "gold";
const THEMES: { id: HeatmapTheme; label: string; swatch: string }[] = [
  { id: "green",  label: "Green",  swatch: "#22c55e" },
  { id: "red",    label: "Red",    swatch: "#E50914" },
  { id: "purple", label: "Purple", swatch: "#8B5CF6" },
  { id: "blue",   label: "Blue",   swatch: "#3B82F6" },
  { id: "gold",   label: "Gold",   swatch: "#F5A623" },
];

const INTENSITY_CLASSES = [
  "heatmap-cell-0",
  "heatmap-cell-1",
  "heatmap-cell-2",
  "heatmap-cell-3",
  "heatmap-cell-4",
];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS   = ["", "Mon", "", "Wed", "", "Fri", ""];

export default function HeatmapGrid({
  days,
  total_movies,
  current_streak,
  longest_streak,
  customizable = false,
  storageKey = "voltv:heatmap-theme",
}: HeatmapGridProps) {
  const [tooltip, setTooltip] = useState<{
    day: HeatmapDay;
    x: number;
    y: number;
  } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Scroll to show the most recent weeks (right edge) on mount
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [days]);

  const [theme, setTheme] = useState<HeatmapTheme>("green");
  useEffect(() => {
    const saved = typeof window !== "undefined"
      ? (localStorage.getItem(storageKey) as HeatmapTheme | null)
      : null;
    if (saved && THEMES.some((t) => t.id === saved)) setTheme(saved);
  }, [storageKey]);

  function pickTheme(t: HeatmapTheme) {
    setTheme(t);
    try { localStorage.setItem(storageKey, t); } catch {}
  }

  // Group into 52 weeks
  const weeks: HeatmapDay[][] = [];
  let week: HeatmapDay[] = [];

  // Pad to start on Sunday
  const firstDay = new Date(days[0]?.date ?? new Date());
  const startPad = firstDay.getDay();
  for (let i = 0; i < startPad; i++) week.push({ date: "", count: 0, movies: [], intensity: 0 });

  for (const day of days) {
    week.push(day);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push({ date: "", count: 0, movies: [], intensity: 0 });
    weeks.push(week);
  }

  // Month labels
  const monthLabels: { label: string; col: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((wk, i) => {
    const firstValid = wk.find((d) => d.date);
    if (firstValid) {
      const m = new Date(firstValid.date).getMonth();
      if (m !== lastMonth) {
        monthLabels.push({ label: MONTHS[m], col: i });
        lastMonth = m;
      }
    }
  });

  return (
    <div className="space-y-3" data-heatmap-theme={theme}>
      {/* Stats row */}
      <div className="flex items-center gap-6 text-sm">
        <div>
          <span className="font-mono font-bold text-white">{total_movies}</span>
          <span className="text-[#505060] ml-1">movies this year</span>
        </div>
        {current_streak > 0 && (
          <div>
            <span className="streak-active font-bold">🔥 {current_streak}</span>
            <span className="text-[#505060] ml-1">week streak</span>
          </div>
        )}
        {longest_streak > 0 && (
          <div className="hidden sm:block">
            <span className="font-mono font-bold text-[#F5A623]">{longest_streak}</span>
            <span className="text-[#505060] ml-1">best streak</span>
          </div>
        )}
      </div>

      {/* Grid */}
      <div ref={scrollRef} className="relative overflow-x-auto no-scrollbar">
        <div className="inline-block">
          {/* Month labels */}
          <div className="flex mb-1 ml-7">
            {weeks.map((_, i) => {
              const label = monthLabels.find((m) => m.col === i);
              return (
                <div key={i} className="w-3 mr-0.5 text-[10px] text-[#505060] select-none">
                  {label?.label ?? ""}
                </div>
              );
            })}
          </div>

          <div className="flex gap-0.5">
            {/* Day labels */}
            <div className="flex flex-col gap-0.5 mr-1">
              {DAYS.map((d, i) => (
                <div key={i} className="h-3 text-[10px] text-[#505060] leading-3 select-none">
                  {d}
                </div>
              ))}
            </div>

            {/* Weeks */}
            {weeks.map((wk, wi) => (
              <div key={wi} className="flex flex-col gap-0.5">
                {wk.map((day, di) => (
                  <div
                    key={di}
                    className={cn(
                      "w-3 h-3 rounded-[2px] cursor-default transition-all duration-150",
                      day.date
                        ? INTENSITY_CLASSES[day.intensity]
                        : "opacity-0 pointer-events-none",
                      day.count > 0 && "hover:ring-1 hover:ring-white/30 hover:scale-125"
                    )}
                    onMouseEnter={(e) => {
                      if (!day.date || day.count === 0) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltip({ day, x: rect.left, y: rect.top });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Tooltip */}
        {tooltip && (
          <HeatmapTooltip
            day={tooltip.day}
            x={tooltip.x}
            y={tooltip.y}
          />
        )}
      </div>

      {/* Legend + theme picker */}
      <div className="flex items-center justify-between gap-2 text-xs text-[#505060] flex-wrap">
        <div className="flex items-center gap-2">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={cn("w-3 h-3 rounded-[2px]", INTENSITY_CLASSES[i])} />
          ))}
          <span>More</span>
        </div>
        {customizable && (
          <div className="flex items-center gap-1.5">
            <span className="text-[#505060] mr-1">Theme:</span>
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => pickTheme(t.id)}
                title={t.label}
                aria-label={`Heatmap theme: ${t.label}`}
                className={cn(
                  "w-4 h-4 rounded-full border transition-all",
                  theme === t.id
                    ? "border-white scale-110"
                    : "border-white/20 hover:border-white/50"
                )}
                style={{ background: t.swatch }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HeatmapTooltip({ day, x, y }: { day: HeatmapDay; x: number; y: number }) {
  const date = new Date(day.date);
  const label = date.toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  return (
    <div
      className="fixed z-50 glass-strong rounded-[8px] p-2.5 shadow-xl pointer-events-none text-xs max-w-[200px]"
      style={{ left: x + 16, top: y - 8 }}
    >
      <div className="font-semibold text-white mb-1">
        {day.count} movie{day.count !== 1 ? "s" : ""} · {label}
      </div>
      {day.movies.slice(0, 4).map((m, i) => (
        <div key={i} className="text-[#A0A0B0] truncate">
          · {m.title}
        </div>
      ))}
      {day.movies.length > 4 && (
        <div className="text-[#505060]">+{day.movies.length - 4} more</div>
      )}
    </div>
  );
}
