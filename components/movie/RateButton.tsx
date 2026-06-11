"use client";

import { useEffect, useState } from "react";
import { Star, X } from "lucide-react";
import { toast } from "@/components/ui/Toast";

interface Props {
  tmdbId:    number;
  mediaKind?: "movie" | "tv";
  title:     string;
  posterUrl?: string | null;
}

const ACTIVE   = "#F5A623"; // single accent — yellow/orange
const EMPTY    = "#3A3A4A";

export default function RateButton({ tmdbId, mediaKind = "movie" }: Props) {
  const [score, setScore] = useState<number | null>(null); // 1–10
  const [hover, setHover] = useState<number | null>(null);
  const [busy,  setBusy]  = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/ratings/quick?tmdb_id=${tmdbId}&media_kind=${mediaKind}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j) => { if (j.data?.overall_score) setScore(j.data.overall_score); })
      .catch(() => {});
    return () => ctrl.abort();
  }, [tmdbId, mediaKind]);

  async function rate(score10: number) {
    if (busy) return;
    const prev = score;
    setScore(score10);
    setBusy(true);
    try {
      const res = await fetch("/api/ratings/quick", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ tmdb_id: tmdbId, score: score10, media_kind: mediaKind }),
      });
      if (res.status === 401) { setScore(prev); toast.error("Login to rate"); return; }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed");
      }
      toast.rated(score10);
    } catch (e) {
      setScore(prev);
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function clearRating() {
    if (busy || score == null) return;
    const prev = score;
    setScore(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/ratings/quick?tmdb_id=${tmdbId}&media_kind=${mediaKind}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Rating removed");
    } catch {
      setScore(prev);
      toast.error("Failed to remove rating");
    } finally {
      setBusy(false);
    }
  }

  const visual = hover ?? score ?? 0;
  const out5   = visual / 2;
  const full   = Math.floor(out5);
  const fraction = out5 - full;
  const hasPartial = fraction > 0.05;

  return (
    <div className="inline-flex items-center gap-2.5">
      <span className="text-[11px] uppercase tracking-wider text-[#6B6B80] font-bold">Rate</span>

      <div
        className="relative inline-flex items-center"
        onMouseLeave={() => setHover(null)}
      >
        {/* Stars */}
        <div className="inline-flex items-center gap-0.5 pointer-events-none">
          {Array.from({ length: 5 }).map((_, i) => {
            if (i < full) {
              return <Star key={i} size={20} style={{ color: ACTIVE, fill: ACTIVE }} />;
            }
            if (i === full && hasPartial) {
              const pct = Math.round(fraction * 100);
              return (
                <span key={i} className="relative inline-flex" style={{ width: 20, height: 20 }}>
                  <Star size={20} className="absolute inset-0" style={{ color: EMPTY }} />
                  <span className="absolute inset-0 overflow-hidden" style={{ width: `${pct}%` }}>
                    <Star size={20} style={{ color: ACTIVE, fill: ACTIVE }} />
                  </span>
                </span>
              );
            }
            return <Star key={i} size={20} style={{ color: EMPTY }} />;
          })}
        </div>

        {/* Click overlay — 10 segments */}
        <div className="absolute inset-0 flex">
          {Array.from({ length: 10 }).map((_, i) => {
            const n = i + 1;
            return (
              <button
                key={n}
                type="button"
                disabled={busy}
                onMouseEnter={() => setHover(n)}
                onClick={() => rate(n)}
                className="flex-1 cursor-pointer disabled:cursor-default"
                aria-label={`Rate ${(n / 2).toFixed(1)} stars`}
                title={`${(n / 2).toFixed(1)} / 5`}
              />
            );
          })}
        </div>
      </div>

      {/* Numeric score */}
      <span className="text-xs font-bold text-white tabular-nums w-9">
        {visual > 0 ? `${out5.toFixed(1)}` : "—"}
      </span>

      {/* Remove rating */}
      {score != null && (
        <button
          type="button"
          onClick={clearRating}
          disabled={busy}
          aria-label="Remove rating"
          title="Remove rating"
          className="w-5 h-5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-[#A0A0B0] hover:text-white transition-colors flex items-center justify-center disabled:opacity-40"
        >
          <X size={11} />
        </button>
      )}
    </div>
  );
}
