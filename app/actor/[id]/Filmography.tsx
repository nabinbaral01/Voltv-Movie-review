"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Film, Tv } from "lucide-react";
import { posterUrl } from "@/lib/tmdb";
import PosterActions from "@/components/movie/PosterActions";
import { isUnreleased } from "@/lib/release";

export interface FilmoItem {
  kind:        "movie" | "tv";
  id:          number;
  title:       string;
  poster_path: string | null;
  date:        string | null; // YYYY-MM-DD
  character:   string | null;
  vote_average: number;
}

type FilterKey = "all" | "movie" | "tv";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all",   label: "All"    },
  { key: "movie", label: "Movies" },
  { key: "tv",    label: "Shows"  },
];

export default function Filmography({ items }: { items: FilmoItem[] }) {
  const [filter, setFilter] = useState<FilterKey>("all");

  const counts = useMemo(() => ({
    all:   items.length,
    movie: items.filter((x) => x.kind === "movie").length,
    tv:    items.filter((x) => x.kind === "tv").length,
  }), [items]);

  const visible = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => i.kind === filter);
  }, [items, filter]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h2 className="text-sm font-semibold text-[#A0A0B0] uppercase tracking-wide">
          Filmography
          <span className="ml-2 text-[#505060] font-normal">
            ({filter === "all" ? items.length : `${visible.length}/${items.length}`})
          </span>
        </h2>

        {/* Filter segmented control */}
        <div className="inline-flex bg-[#12121A] rounded-full p-0.5 border border-[#1E1E2E]">
          {FILTERS.map((f) => {
            const count = counts[f.key];
            const active = filter === f.key;
            const disabled = count === 0 && f.key !== "all";
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                disabled={disabled}
                className={`inline-flex items-center gap-1.5 px-3 h-7 rounded-full text-[11.5px] font-medium transition-colors ${
                  active
                    ? "bg-white text-black"
                    : "text-[#A0A0B0] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                }`}
              >
                {f.key === "movie" && <Film size={11} />}
                {f.key === "tv"    && <Tv size={11} />}
                {f.label}
                <span className={`text-[10px] ${active ? "text-black/60" : "text-[#6B6B80]"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="card p-6 text-center text-sm text-[#505060]">
          Nothing to show with this filter.
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4">
          {visible.map((m) => {
            const href = m.kind === "tv" ? `/tv/${m.id}` : `/movie/${m.id}`;
            const fullPosterUrl = m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null;
            return (
              <div key={`${m.kind}-${m.id}-${m.character ?? ""}`} className="group">
                <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-[#1A1A28] border border-[#1E1E2E] group-hover:border-[#E50914]/40 transition-colors">
                  <Link href={href} className="absolute inset-0">
                    {m.poster_path ? (
                      <Image
                        src={posterUrl(m.poster_path, "w342")}
                        alt={m.title}
                        fill
                        sizes="(max-width:640px) 33vw, (max-width:1024px) 20vw, 14vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#2A2A3A] flex items-center justify-center">
                        <svg viewBox="0 0 100 100" className="w-1/2 h-1/2 text-[#3A3A4A]">
                          <circle cx="50" cy="38" r="18" fill="currentColor" />
                          <ellipse cx="50" cy="80" rx="30" ry="22" fill="currentColor" />
                        </svg>
                      </div>
                    )}
                  </Link>
                  {m.kind === "tv" && (
                    <span className="absolute top-1.5 left-1.5 text-[9px] font-bold text-white bg-[#3B82F6] px-1.5 py-0.5 rounded uppercase tracking-wider z-10">
                      TV
                    </span>
                  )}
                  {m.vote_average > 0 && (
                    <div className="absolute bottom-1.5 left-1.5 text-[9px] font-bold bg-black/70 text-white px-1.5 py-0.5 rounded z-10">
                      {m.vote_average.toFixed(1)}
                    </div>
                  )}
                  <PosterActions
                    tmdbId={m.id}
                    kind={m.kind}
                    title={m.title}
                    posterUrl={fullPosterUrl}
                    unreleased={isUnreleased(m.date)}
                  />
                </div>
                <Link href={href} className="block mt-1.5">
                  <h3 className="text-xs font-semibold text-white truncate group-hover:text-[#E50914] transition-colors">
                    {m.title}
                  </h3>
                  {m.character && (
                    <p className="text-[10px] text-[#505060] truncate mt-0.5">
                      {m.character}
                    </p>
                  )}
                  {m.date && (
                    <p className="text-[10px] text-[#505060]">{m.date.slice(0, 4)}</p>
                  )}
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
