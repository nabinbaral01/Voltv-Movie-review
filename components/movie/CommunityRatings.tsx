"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Star, Users, ChevronDown } from "lucide-react";

interface RatingItem {
  username:   string;
  avatar_url: string | null;
  blue_tick:  boolean;
  score:      number; // 1-10
  verdict:    "skip" | "timepass" | "watchit" | "masterpiece";
  updated_at: string;
}

interface Props {
  tmdbId:    number;
  mediaKind?: "movie" | "tv";
}

const VERDICT_COLOR: Record<RatingItem["verdict"], { bg: string; text: string; label: string }> = {
  skip:        { bg: "bg-[#9CA3AF]/15", text: "text-[#9CA3AF]", label: "Skip"       },
  timepass:    { bg: "bg-[#F5A623]/15", text: "text-[#F5A623]", label: "Timepass"   },
  watchit:     { bg: "bg-[#3B82F6]/15", text: "text-[#3B82F6]", label: "Go for it"  },
  masterpiece: { bg: "bg-[#E50914]/15", text: "text-[#E50914]", label: "Perfection" },
};

export default function CommunityRatings({ tmdbId, mediaKind = "movie" }: Props) {
  const [items, setItems] = useState<RatingItem[]>([]);
  const [count, setCount] = useState(0);
  const [average, setAverage] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/ratings/community?tmdb_id=${tmdbId}&media_kind=${mediaKind}&limit=30`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j) => {
        setItems(j.items ?? []);
        setCount(j.count ?? 0);
        setAverage(j.average ?? null);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => ctrl.abort();
  }, [tmdbId, mediaKind]);

  if (!loaded) {
    return (
      <div className="card p-4 animate-pulse">
        <div className="h-4 w-40 bg-white/5 rounded" />
      </div>
    );
  }

  if (count === 0) {
    return (
      <section className="card p-4">
        <div className="flex items-center gap-2.5 text-sm text-[#A0A0B0]">
          <Users size={14} />
          <span>No community ratings yet — be the first to rate above.</span>
        </div>
      </section>
    );
  }

  const avgOut5 = average != null ? average / 2 : null;
  const visible = open ? items : items.slice(0, 6);

  return (
    <section className="card overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#22C55E] to-[#16A34A] flex items-center justify-center shrink-0 shadow-[0_0_14px_rgba(34,197,94,0.3)]">
            <Users size={15} className="text-white" />
          </div>
          <div className="text-left min-w-0">
            <h3 className="text-sm font-bold text-white">Community Ratings</h3>
            <p className="text-[11px] text-[#A0A0B0] mt-0.5">
              {count} {count === 1 ? "person" : "people"} rated this
              {avgOut5 != null && (
                <span className="ml-1.5 inline-flex items-center gap-1">
                  · avg
                  <Star size={10} className="fill-[#22C55E] text-[#22C55E]" />
                  <span className="font-semibold text-white">{avgOut5.toFixed(1)}</span>
                </span>
              )}
            </p>
          </div>
        </div>
        <ChevronDown
          size={16}
          className={`text-[#6B6B80] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* List */}
      <ul className="divide-y divide-[#1E1E2E]/60">
        {visible.map((r, i) => (
          <RatingRow key={`${r.username}-${i}`} item={r} />
        ))}
      </ul>

      {!open && items.length > 6 && (
        <button
          onClick={() => setOpen(true)}
          className="w-full text-center text-xs font-semibold text-[#A0A0B0] hover:text-white py-3 border-t border-[#1E1E2E]/60 transition-colors"
        >
          Show all {items.length} ratings →
        </button>
      )}
    </section>
  );
}

function RatingRow({ item }: { item: RatingItem }) {
  const out5 = item.score / 2;
  const full = Math.floor(out5);
  const fraction = out5 - full;
  const hasPartial = fraction > 0.05;
  const v = VERDICT_COLOR[item.verdict];
  const initial = item.username[0]?.toUpperCase() ?? "?";

  return (
    <li>
      <Link
        href={`/profile/${item.username}`}
        className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors group"
      >
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-[#E50914] to-[#8B5CF6] flex items-center justify-center shrink-0">
          {item.avatar_url ? (
            <Image src={item.avatar_url} alt={item.username} width={36} height={36} className="object-cover w-full h-full" />
          ) : (
            <span className="text-xs font-bold text-white">{initial}</span>
          )}
        </div>

        {/* Name + verdict */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm font-semibold text-white truncate group-hover:text-[#E50914] transition-colors">
              @{item.username}
            </span>
            {item.blue_tick && <BlueTick />}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${v.bg} ${v.text}`}>
              {v.label}
            </span>
            <span className="text-[10px] text-[#6B6B80]">{timeAgo(item.updated_at)}</span>
          </div>
        </div>

        {/* Stars + score */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => {
              if (i < full) {
                return <Star key={i} size={12} className="fill-[#22C55E] text-[#22C55E]" />;
              }
              if (i === full && hasPartial) {
                const pct = Math.round(fraction * 100);
                return (
                  <span key={i} className="relative inline-flex" style={{ width: 12, height: 12 }}>
                    <Star size={12} className="text-[#3A3A4A] absolute inset-0" />
                    <span className="absolute inset-0 overflow-hidden" style={{ width: `${pct}%` }}>
                      <Star size={12} className="fill-[#F5A623] text-[#F5A623]" />
                    </span>
                  </span>
                );
              }
              return <Star key={i} size={12} className="text-[#3A3A4A]" />;
            })}
          </div>
          <span className="text-xs font-bold text-white tabular-nums w-8 text-right">
            {out5.toFixed(1)}
          </span>
        </div>
      </Link>
    </li>
  );
}

function BlueTick() {
  return (
    <svg viewBox="0 0 22 22" className="w-3.5 h-3.5 shrink-0" aria-label="verified">
      <path
        fill="#1D9BF0"
        d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.575 1.817.02.647.219 1.276.575 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.014 1.276-.21 1.817-.567.54-.356.972-.854 1.245-1.44.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"
      />
    </svg>
  );
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return `${Math.floor(diff / 604800)}w`;
}
