"use client";

import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { toast } from "@/components/ui/Toast";

type Kind = "movie" | "tv";

interface Props {
  tmdbId:     number;
  kind?:      Kind;
  title:      string;
  posterUrl?: string | null;
  variant?:   "overlay" | "inline";
}

export default function FireButton({
  tmdbId, kind = "movie", title, posterUrl = null, variant = "overlay",
}: Props) {
  const [count, setCount] = useState<number | null>(null);
  const [fired, setFired] = useState(false);
  const [busy,  setBusy]  = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/fires?tmdb_id=${tmdbId}&kind=${kind}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j) => { setCount(j.count ?? 0); setFired(!!j.fired); })
      .catch(() => {});
    return () => ctrl.abort();
  }, [tmdbId, kind]);

  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);

    const prevCount = count ?? 0;
    const prevFired = fired;
    // Optimistic
    setFired(!prevFired);
    setCount(prevFired ? Math.max(0, prevCount - 1) : prevCount + 1);

    try {
      const res = await fetch("/api/fires", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ tmdb_id: tmdbId, kind, title, poster_url: posterUrl }),
        keepalive: true,
      });
      if (res.status === 401) {
        setFired(prevFired);
        setCount(prevCount);
        toast.error("Login to fire");
        return;
      }
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Failed");
      setCount(j.count);
      setFired(j.fired);
      window.dispatchEvent(new CustomEvent("voltv-fires-updated"));
    } catch (err) {
      setFired(prevFired);
      setCount(prevCount);
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        title={fired ? "Remove fire" : "Fire up · boost in Most Discussed"}
        className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-xs font-semibold transition-all ${
          fired
            ? "bg-[#E50914] border-[#E50914] text-white shadow-[0_0_16px_rgba(229,9,20,0.5)]"
            : "bg-[#12121A] border-white/15 text-[#A0A0B0] hover:border-[#E50914]/60 hover:text-white"
        }`}
      >
        <Flame size={14} className={fired ? "fill-white" : ""} />
        <span>{count ?? "—"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      title={fired ? "Remove fire" : "Fire up"}
      aria-label="Fire"
      className="inline-flex items-center gap-1 h-7 px-2 rounded-full backdrop-blur text-white shadow-md transition-all hover:scale-105 disabled:opacity-60"
      style={{
        background: fired ? "#E50914" : "rgba(0,0,0,0.65)",
        border: fired ? "1px solid #E50914" : "1px solid rgba(255,255,255,0.15)",
        boxShadow: fired ? "0 0 10px #E50914, 0 0 18px rgba(229,9,20,0.5)" : undefined,
      }}
    >
      <Flame size={12} className={fired ? "fill-white" : ""} />
      {count !== null && count > 0 && (
        <span className="text-[10px] font-bold leading-none">{count}</span>
      )}
    </button>
  );
}
