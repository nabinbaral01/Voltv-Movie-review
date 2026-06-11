"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { toast } from "@/components/ui/Toast";

interface Props {
  // 0–10 scale (TMDB) or 0–5 if scale={5}
  value:    number;
  scale?:   5 | 10;
  size?:    number;
  showText?: boolean;
  count?:   number | null;

  // Interactive mode — when set, user can click stars to rate
  interactive?: boolean;
  tmdbId?:    number;
  mediaKind?: "movie" | "tv";
}

const FULL_COLOR    = "#22C55E";
const PARTIAL_COLOR = "#F5A623";
const USER_COLOR    = "#F5A623";
const EMPTY_COLOR   = "#3A3A4A";

export default function StarRating({
  value, scale = 10, size = 16, showText = true, count = null,
  interactive = false, tmdbId, mediaKind = "movie",
}: Props) {
  const [userScore, setUserScore] = useState<number | null>(null); // 1-10
  const [hoverScore, setHoverScore] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  // Fetch user's current rating once
  useEffect(() => {
    if (!interactive || !tmdbId) return;
    const ctrl = new AbortController();
    fetch(`/api/ratings/quick?tmdb_id=${tmdbId}&media_kind=${mediaKind}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j) => { if (j.data?.overall_score) setUserScore(j.data.overall_score); })
      .catch(() => {});
    return () => ctrl.abort();
  }, [interactive, tmdbId, mediaKind]);

  async function submit(score10: number) {
    if (!tmdbId || busy) return;
    const prev = userScore;
    setUserScore(score10);
    setBusy(true);
    try {
      const res = await fetch("/api/ratings/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdb_id: tmdbId, score: score10, media_kind: mediaKind }),
      });
      if (res.status === 401) {
        setUserScore(prev);
        toast.error("Login to rate");
        return;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed");
      }
      toast.success(`Rated ${(score10 / 2).toFixed(1)} / 5`);
    } catch (e) {
      setUserScore(prev);
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  // Decide what value (in 0–5) to render visually + which palette
  let displayOut5: number;
  let isUserScore = false;
  if (interactive) {
    if (hoverScore != null)        { displayOut5 = hoverScore / 2; isUserScore = true; }
    else if (userScore != null)    { displayOut5 = userScore / 2;  isUserScore = true; }
    else                           { displayOut5 = scale === 10 ? value / 2 : value; }
  } else {
    displayOut5 = scale === 10 ? value / 2 : value;
  }

  const clamped  = Math.max(0, Math.min(5, displayOut5));
  const full     = Math.floor(clamped);
  const fraction = clamped - full;
  const hasPartial = fraction > 0.05;

  const fullColor = isUserScore ? USER_COLOR : FULL_COLOR;

  const stars = Array.from({ length: 5 }).map((_, i) => {
    if (i < full) {
      return <Star key={i} size={size} className="" style={{ color: fullColor, fill: fullColor }} />;
    }
    if (i === full && hasPartial) {
      return <PartialStar key={i} size={size} fraction={fraction} color={isUserScore ? USER_COLOR : PARTIAL_COLOR} />;
    }
    return <Star key={i} size={size} style={{ color: EMPTY_COLOR }} />;
  });

  if (!interactive) {
    return (
      <div className="inline-flex items-center gap-1.5">
        <div className="inline-flex items-center gap-0.5">{stars}</div>
        {showText && (
          <span className="text-xs font-semibold text-white">
            {clamped.toFixed(1)}
            {count != null && count > 0 && (
              <span className="text-[#6B6B80] font-normal ml-1">
                ({formatCount(count)})
              </span>
            )}
          </span>
        )}
      </div>
    );
  }

  // Interactive mode — buttons for each half-star segment
  return (
    <div className="inline-flex items-center gap-2">
      <div
        className="inline-flex items-center gap-0.5 relative"
        onMouseLeave={() => setHoverScore(null)}
      >
        {/* Visual stars */}
        <div className="inline-flex items-center gap-0.5 pointer-events-none">
          {stars}
        </div>
        {/* Click overlay — 10 segments (half-star precision) */}
        <div className="absolute inset-0 flex">
          {Array.from({ length: 10 }).map((_, i) => {
            const score10 = i + 1;
            return (
              <button
                key={i}
                type="button"
                disabled={busy}
                onMouseEnter={() => setHoverScore(score10)}
                onClick={() => submit(score10)}
                className="flex-1 cursor-pointer disabled:cursor-default"
                aria-label={`Rate ${(score10 / 2).toFixed(1)} stars`}
                title={`${(score10 / 2).toFixed(1)} / 5`}
              />
            );
          })}
        </div>
      </div>
      <span className="text-xs font-semibold text-white tabular-nums">
        {userScore == null && hoverScore == null ? (
          <span className="text-[#6B6B80] font-normal">Tap to rate</span>
        ) : (
          <>
            {clamped.toFixed(1)}
            <span className="text-[#6B6B80] font-normal">/5</span>
          </>
        )}
      </span>
    </div>
  );
}

function PartialStar({ size, fraction, color }: { size: number; fraction: number; color: string }) {
  const pct = Math.round(fraction * 100);
  return (
    <span className="relative inline-flex" style={{ width: size, height: size }}>
      <Star size={size} style={{ color: EMPTY_COLOR }} className="absolute inset-0" />
      <span
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${pct}%` }}
      >
        <Star size={size} style={{ color, fill: color }} />
      </span>
    </span>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
