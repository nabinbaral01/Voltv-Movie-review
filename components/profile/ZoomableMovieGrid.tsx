"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Film, Search, X } from "lucide-react";
import { decodeStorageId } from "@/lib/media-kind";

interface Movie {
  id: string;
  tmdb_id: number;
  title: string;
  poster_url: string | null;
  release_date: Date | string | null;
  languages?: string[];
  genres?: string[];
}

interface Props {
  title: string;
  emptyText: string;
  items: Movie[];
}

const MIN_COLS = 3;
const MAX_COLS = 30;

type TypeKey = "all" | "movie" | "tv" | "anime";

const TYPES: { key: TypeKey; label: string }[] = [
  { key: "all",   label: "All"    },
  { key: "movie", label: "Movies" },
  { key: "tv",    label: "Shows"  },
  { key: "anime", label: "Anime"  },
];

function isTVShow(m: Movie): boolean {
  return decodeStorageId(m.tmdb_id).kind === "tv";
}

function isAnime(m: Movie): boolean {
  const genres = m.genres ?? [];
  const langs  = m.languages ?? [];
  return genres.includes("Animation") && langs.some((l) => /japanese/i.test(l));
}

export default function ZoomableMovieGrid({ title, emptyText, items }: Props) {
  const [cols, setCols] = useState(6);
  const [type, setType] = useState<TypeKey>("all");
  const [lang, setLang] = useState<string>("all");
  const [query, setQuery] = useState("");

  // Build language options with counts (sorted by frequency)
  const languageOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of items) {
      for (const l of m.languages ?? []) {
        if (!l) continue;
        counts.set(l, (counts.get(l) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [items]);

  // Type counts
  const typeCounts = useMemo(() => {
    let tv = 0, anime = 0;
    for (const m of items) {
      if (isTVShow(m)) tv += 1;
      else if (isAnime(m)) anime += 1;
    }
    return { all: items.length, movie: items.length - tv - anime, tv, anime };
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((m) => {
      const tv    = isTVShow(m);
      const anime = !tv && isAnime(m);
      if (type === "tv"    && !tv)     return false;
      if (type === "anime" && !anime)  return false;
      if (type === "movie" && (tv || anime)) return false;
      if (lang !== "all" && !(m.languages ?? []).includes(lang)) return false;
      if (q && !m.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, type, lang, query]);

  const showTitle = cols <= 8;
  const gap = cols <= 6 ? "6px" : cols <= 12 ? "3px" : "2px";
  const hasFilters = type !== "all" || lang !== "all" || query.trim().length > 0;

  return (
    <div className="mb-6">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3 gap-3">
        <h2 className="text-sm font-semibold text-[#A0A0B0] uppercase tracking-wide flex items-center gap-2">
          <Film size={14} />
          {title}
          <span className="text-white bg-[#E50914] text-[10px] font-bold px-2 py-0.5 rounded-full ml-1">
            {hasFilters ? `${filtered.length}/${items.length}` : items.length}
          </span>
        </h2>

        {items.length > 0 && (
          <div className="flex items-center gap-2 bg-[#1A1A28] rounded-full px-2 py-1 border border-[#1E1E2E] shrink-0">
            <button
              onClick={() => setCols((c) => Math.max(c - 1, MIN_COLS))}
              disabled={cols <= MIN_COLS}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[#A0A0B0] hover:text-white hover:bg-white/[0.06] disabled:opacity-30 transition-colors"
            >
              <Plus size={12} />
            </button>
            <input
              type="range"
              min={MIN_COLS}
              max={MAX_COLS}
              value={MAX_COLS + MIN_COLS - cols}
              onChange={(e) => setCols(MAX_COLS + MIN_COLS - Number(e.target.value))}
              className="w-20 sm:w-28 h-1 accent-[#E50914] cursor-pointer"
            />
            <button
              onClick={() => setCols((c) => Math.min(c + 1, MAX_COLS))}
              disabled={cols >= MAX_COLS}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[#A0A0B0] hover:text-white hover:bg-white/[0.06] disabled:opacity-30 transition-colors"
            >
              <Minus size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Filter bar */}
      {items.length > 0 && (
        <div className="mb-3 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Type segmented control */}
            <div className="inline-flex bg-[#12121A] rounded-full p-0.5 border border-[#1E1E2E]">
              {TYPES.map((t) => {
                const count = typeCounts[t.key];
                const active = type === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setType(t.key)}
                    disabled={count === 0 && t.key !== "all"}
                    className={`px-3 h-7 rounded-full text-[11.5px] font-medium transition-colors inline-flex items-center gap-1.5 ${
                      active
                        ? "bg-white text-black"
                        : "text-[#A0A0B0] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    }`}
                  >
                    {t.label}
                    <span className={`text-[10px] ${active ? "text-black/60" : "text-[#6B6B80]"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search (compact) */}
            <div className="relative flex-1 min-w-[160px] max-w-[260px]">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B6B80]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title"
                className="w-full h-7 pl-7 pr-7 bg-[#12121A] border border-[#1E1E2E] rounded-full text-[12px] text-white placeholder:text-[#6B6B80] focus:outline-none focus:border-white/20"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6B6B80] hover:text-white"
                  aria-label="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {hasFilters && (
              <button
                onClick={() => { setType("all"); setLang("all"); setQuery(""); }}
                className="text-[11px] text-[#A0A0B0] hover:text-white transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {/* Language chips (horizontal scroll) */}
          {languageOptions.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
              <LangChip label="All"   count={items.length} active={lang === "all"} onClick={() => setLang("all")} />
              {languageOptions.slice(0, 12).map((l) => (
                <LangChip
                  key={l.name}
                  label={l.name}
                  count={l.count}
                  active={lang === l.name}
                  onClick={() => setLang(l.name)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <div className="card p-4 text-sm text-[#505060]">{emptyText}</div>
      ) : filtered.length === 0 ? (
        <div className="card p-4 text-sm text-[#505060] text-center">
          No matches — try clearing filters.
        </div>
      ) : (
        <div
          className="grid transition-all duration-150"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gap,
          }}
        >
          {filtered.map((m) => {
            const { tmdbId, kind } = decodeStorageId(m.tmdb_id);
            const href = kind === "tv" ? `/tv/${tmdbId}` : `/movie/${tmdbId}`;
            return (
            <Link
              key={m.id}
              href={href}
              className="group relative"
              title={m.title}
            >
              <div className="w-full aspect-[2/3] rounded-lg overflow-hidden bg-[#1A1A28] border border-[#1E1E2E] group-hover:border-[#E50914]/50 transition-colors">
                {m.poster_url ? (
                  <Image
                    src={m.poster_url}
                    alt={m.title}
                    fill
                    sizes={`${Math.round(100 / cols)}vw`}
                    className="object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <div className="w-full h-full bg-[#2A2A3A] flex items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-1/2 h-1/2 text-[#3A3A4A]">
                      <circle cx="50" cy="38" r="18" fill="currentColor" />
                      <ellipse cx="50" cy="80" rx="30" ry="22" fill="currentColor" />
                    </svg>
                  </div>
                )}
              </div>
              {showTitle && (
                <p className="mt-1 text-[10px] text-white leading-tight line-clamp-1 group-hover:text-[#E50914] transition-colors">
                  {m.title}
                </p>
              )}
              {kind === "tv" && (
                <span className="absolute top-1 left-1 text-[9px] font-bold text-white bg-[#3B82F6] px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                  TV
                </span>
              )}
            </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LangChip({
  label, count, active, onClick,
}: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 h-7 px-3 rounded-full text-[11.5px] font-medium border transition-colors inline-flex items-center gap-1.5 ${
        active
          ? "bg-gradient-to-r from-[#E50914] to-[#8B5CF6] border-transparent text-white"
          : "bg-[#12121A] border-[#1E1E2E] text-[#A0A0B0] hover:border-white/20 hover:text-white"
      }`}
    >
      {label}
      <span className={`text-[10px] ${active ? "text-white/70" : "text-[#6B6B80]"}`}>
        {count}
      </span>
    </button>
  );
}
