"use client";

import { useEffect, useState } from "react";
import { statsFor, type MovieComment } from "@/lib/comment-stats";

interface ScoreGaugeProps {
  tmdbId: number;
  initialComments: MovieComment[];
  size?: number;
}

export default function ScoreGauge({ tmdbId, initialComments, size = 140 }: ScoreGaugeProps) {
  const [comments, setComments] = useState(initialComments);
  const { score_pct: score, count } = statsFor(comments);

  useEffect(() => {
    function refetch() {
      fetch(`/api/movie-comments?tmdb_id=${tmdbId}`)
        .then((r) => r.json())
        .then((d) => setComments(d.comments ?? []))
        .catch(() => {});
    }
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<number>).detail;
      if (detail === tmdbId) refetch();
    };
    window.addEventListener("voltv-comments-updated", handler);
    return () => window.removeEventListener("voltv-comments-updated", handler);
  }, [tmdbId]);

  const radius = (size - 16) / 2;
  const circ   = 2 * Math.PI * radius;
  const dash   = (score / 100) * circ;
  const color  = score >= 75 ? "#22C55E" : score >= 50 ? "#F5A623" : score >= 25 ? "#F97316" : "#E50914";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="#1A1A28" strokeWidth={10} fill="none" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={10}
            fill="none"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-3xl font-extrabold text-white leading-none">{score}%</div>
          <div className="text-[10px] uppercase tracking-wider text-[#A0A0B0] mt-1">
            VoltV Score
          </div>
        </div>
      </div>
      <div className="text-xs text-[#505060]">
        {count === 0 ? "No reviews yet" : `${count} review${count === 1 ? "" : "s"}`}
      </div>
    </div>
  );
}
