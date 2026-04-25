"use client";

import { useEffect, useState } from "react";
import { Eye, Plus, Check } from "lucide-react";

type Status = "watched" | "want_to_watch" | null;

const WATCHED_KEY  = "voltv-tv-watched";
const WANTED_KEY   = "voltv-tv-watchlist";

function readSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    return new Set(Array.isArray(arr) ? arr.filter((v) => typeof v === "string") : []);
  } catch {
    return new Set();
  }
}

function writeSet(key: string, set: Set<string>) {
  try {
    window.localStorage.setItem(key, JSON.stringify([...set]));
    window.dispatchEvent(new CustomEvent("voltv-tv-watch-updated", { detail: key }));
  } catch {}
}

export default function SeriesWatchActions({ scope, size = "md" }: { scope: string; size?: "sm" | "md" }) {
  const [status, setStatus] = useState<Status>(null);

  useEffect(() => {
    const sync = () => {
      const watched = readSet(WATCHED_KEY).has(scope);
      const wanted  = readSet(WANTED_KEY).has(scope);
      setStatus(watched ? "watched" : wanted ? "want_to_watch" : null);
    };
    sync();
    window.addEventListener("voltv-tv-watch-updated", sync);
    return () => window.removeEventListener("voltv-tv-watch-updated", sync);
  }, [scope]);

  function toggle(kind: "watched" | "want_to_watch") {
    const watched = readSet(WATCHED_KEY);
    const wanted  = readSet(WANTED_KEY);
    const already = (kind === "watched" ? watched : wanted).has(scope);

    if (kind === "watched") {
      if (already) { watched.delete(scope); }
      else { watched.add(scope); wanted.delete(scope); }
    } else {
      if (already) { wanted.delete(scope); }
      else { wanted.add(scope); watched.delete(scope); }
    }

    writeSet(WATCHED_KEY, watched);
    writeSet(WANTED_KEY,  wanted);
  }

  const watched = status === "watched";
  const wanted  = status === "want_to_watch";
  const dim = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const ic  = size === "sm" ? 14 : 16;

  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); toggle("watched"); }}
        title={watched ? "Watched" : "Mark as watched"}
        className={`${dim} rounded-full flex items-center justify-center border transition-all ${
          watched
            ? "bg-[#22C55E] border-[#22C55E] text-black"
            : "bg-[#12121A] border-white/15 text-white hover:border-[#22C55E]/50 hover:text-[#22C55E]"
        }`}
        aria-label="Mark as watched"
      >
        {watched ? <Check size={ic} /> : <Eye size={ic} />}
      </button>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); toggle("want_to_watch"); }}
        title={wanted ? "In watchlist" : "Add to watchlist"}
        className={`${dim} rounded-full flex items-center justify-center border transition-all ${
          wanted
            ? "bg-[#3B82F6] border-[#3B82F6] text-white"
            : "bg-[#12121A] border-white/15 text-white hover:border-[#3B82F6]/50 hover:text-[#3B82F6]"
        }`}
        aria-label="Add to watchlist"
      >
        {wanted ? <Check size={ic} /> : <Plus size={ic} />}
      </button>
    </div>
  );
}
