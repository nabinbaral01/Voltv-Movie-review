"use client";

import { useEffect, useState } from "react";
import { statsFor, type MovieComment } from "@/lib/comment-stats";

interface ScoreMeterProps {
  tmdbId: number;
  initialComments: MovieComment[];
}

const SEGMENTS = [
  { key: "skip",        color: "#E11D2E", label: "Skip"       },
  { key: "timepass",    color: "#F97316", label: "Timepass"   },
  { key: "watchit",     color: "#EAB308", label: "Go for it"  },
  { key: "masterpiece", color: "#22C55E", label: "Perfection" },
] as const;

export default function ScoreMeter({ tmdbId, initialComments }: ScoreMeterProps) {
  const [comments, setComments] = useState(initialComments);
  const { score_pct, count, buckets } = statsFor(comments);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<number>).detail;
      if (detail !== tmdbId) return;
      fetch(`/api/movie-comments?tmdb_id=${tmdbId}`)
        .then((r) => r.json())
        .then((d) => setComments(d.comments ?? []))
        .catch(() => {});
    };
    window.addEventListener("voltv-comments-updated", handler);
    return () => window.removeEventListener("voltv-comments-updated", handler);
  }, [tmdbId]);

  const size = 320;
  const r    = 130;
  const cx   = size / 2;
  const cy   = size / 2 + 10;
  const sw   = 36;

  const gap    = 0.05;
  const total  = Math.PI - gap * 3;
  const span   = total / 4;
  const arcs = SEGMENTS.map((seg, i) => {
    const startAngle = Math.PI - i * (span + gap);
    const endAngle   = startAngle - span;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy - r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy - r * Math.sin(endAngle);
    return {
      ...seg,
      d: `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`,
    };
  });

  const frac         = Math.min(1, Math.max(0, score_pct / 100));
  const needleAngle  = Math.PI * (1 - frac);
  const needleLen    = r + sw / 2 - 6;
  const tipX = cx + needleLen * Math.cos(needleAngle);
  const tipY = cy - needleLen * Math.sin(needleAngle);
  const baseW = 10;
  const bx1 = cx + baseW * Math.cos(needleAngle + Math.PI / 2);
  const by1 = cy - baseW * Math.sin(needleAngle + Math.PI / 2);
  const bx2 = cx + baseW * Math.cos(needleAngle - Math.PI / 2);
  const by2 = cy - baseW * Math.sin(needleAngle - Math.PI / 2);

  return (
    <div className="card p-6">
      <h3 className="text-sm font-semibold text-[#A0A0B0] uppercase tracking-wide mb-4">Score Meter</h3>

      <div className="flex flex-col items-center">
        <svg width={size} height={size / 2 + 40} viewBox={`0 0 ${size} ${size / 2 + 40}`}>
          {arcs.map((a) => (
            <path key={a.key} d={a.d} stroke={a.color} strokeWidth={sw} fill="none" strokeLinecap="butt" />
          ))}
          {count > 0 && (
            <g style={{ transition: "transform 0.6s ease" }}>
              <polygon points={`${bx1},${by1} ${bx2},${by2} ${tipX},${tipY}`} fill="#0f0f14" />
              <circle cx={cx} cy={cy} r={12} fill="#0f0f14" />
              <circle cx={cx} cy={cy} r={5}  fill="#ffffff" />
            </g>
          )}
        </svg>

        <div className="-mt-4 text-center">
          <div className="text-4xl font-extrabold text-white">{score_pct}%</div>
          <div className="text-xs text-[#505060] mt-1">
            {count === 0 ? "No reviews yet" : `${count} total`}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mt-6 w-full text-center">
        {SEGMENTS.map((s) => (
          <div key={s.key}>
            <div className="text-lg font-bold" style={{ color: s.color }}>
              {buckets[s.key]}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-[#505060]">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
