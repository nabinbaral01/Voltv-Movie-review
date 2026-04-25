"use client";

import { useEffect, useState } from "react";
import { Eye, Plus, Check } from "lucide-react";
import { toast } from "@/components/ui/Toast";

type Status = "watched" | "want_to_watch" | null;

export default function TVWatchActions({ tmdbId }: { tmdbId: number }) {
  const [status, setStatus] = useState<Status>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/watchlist/quick?tmdb_id=${tmdbId}&media_kind=tv`, { signal: ctrl.signal })
      .then((r) => r.ok ? r.json() : { data: null })
      .then((j) => setStatus(j.data?.status ?? null))
      .catch(() => {});
    return () => ctrl.abort();
  }, [tmdbId]);

  function toggle(kind: "watched" | "want_to_watch") {
    const prev = status;
    setStatus(status === kind ? null : kind);

    fetch("/api/watchlist/quick", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ tmdb_id: tmdbId, kind, media_kind: "tv" }),
      keepalive: true,
    })
      .then(async (res) => {
        if (res.status === 401) { setStatus(prev); toast.error("Login required"); return; }
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || "Failed");
        }
        const j = await res.json();
        setStatus(j.data.status);
      })
      .catch((e) => {
        setStatus(prev);
        toast.error(e instanceof Error ? e.message : "Failed");
      });
  }

  const watched = status === "watched";
  const wanted  = status === "want_to_watch";

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => toggle("watched")}
        title={watched ? "Watched" : "Mark as watched"}
        className={`h-9 w-9 rounded-full flex items-center justify-center border transition-all ${
          watched
            ? "bg-[#22C55E] border-[#22C55E] text-black"
            : "bg-[#12121A] border-white/15 text-white hover:border-[#22C55E]/50 hover:text-[#22C55E]"
        }`}
        aria-label="Mark as watched"
      >
        {watched ? <Check size={16} /> : <Eye size={16} />}
      </button>
      <button
        onClick={() => toggle("want_to_watch")}
        title={wanted ? "In watchlist" : "Add to watchlist"}
        className={`h-9 w-9 rounded-full flex items-center justify-center border transition-all ${
          wanted
            ? "bg-[#3B82F6] border-[#3B82F6] text-white"
            : "bg-[#12121A] border-white/15 text-white hover:border-[#3B82F6]/50 hover:text-[#3B82F6]"
        }`}
        aria-label="Add to watchlist"
      >
        {wanted ? <Check size={16} /> : <Plus size={16} />}
      </button>
    </div>
  );
}
