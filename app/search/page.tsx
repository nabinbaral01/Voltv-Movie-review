"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Film, Clock, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import Topbar from "@/components/layout/Topbar";
import Sidebar, { BottomNav } from "@/components/layout/Sidebar";
import { Skeleton } from "@/components/ui/Skeleton";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import { posterUrl } from "@/lib/tmdb";
import { extractYear, scoreColor, formatScore } from "@/utils/formatters";
import type { TMDBMovieBasic } from "@/lib/tmdb";

interface UserResult {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  level: number;
  xp_points: number;
  is_blue_tick: boolean;
  subscription_tier: string;
  _count: { followers: number };
}

const RECENT_KEY = "voltv_recent_searches";

function getRecent(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"); } catch { return []; }
}

function saveRecent(q: string) {
  const prev = getRecent().filter((r) => r !== q).slice(0, 9);
  localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...prev]));
}

const COUNTRY_OPTS: { code: string; label: string; flag: string }[] = [
  { code: "",   label: "Any country",  flag: "🌐" },
  { code: "US", label: "USA",          flag: "🇺🇸" },
  { code: "IN", label: "India",        flag: "🇮🇳" },
  { code: "GB", label: "UK",           flag: "🇬🇧" },
  { code: "KR", label: "Korea",        flag: "🇰🇷" },
  { code: "JP", label: "Japan",        flag: "🇯🇵" },
  { code: "FR", label: "France",       flag: "🇫🇷" },
  { code: "ES", label: "Spain",        flag: "🇪🇸" },
  { code: "IT", label: "Italy",        flag: "🇮🇹" },
  { code: "DE", label: "Germany",      flag: "🇩🇪" },
  { code: "CN", label: "China",        flag: "🇨🇳" },
  { code: "HK", label: "Hong Kong",    flag: "🇭🇰" },
  { code: "BR", label: "Brazil",       flag: "🇧🇷" },
  { code: "MX", label: "Mexico",       flag: "🇲🇽" },
  { code: "CA", label: "Canada",       flag: "🇨🇦" },
  { code: "AU", label: "Australia",    flag: "🇦🇺" },
  { code: "RU", label: "Russia",       flag: "🇷🇺" },
  { code: "NP", label: "Nepal",        flag: "🇳🇵" },
];

type SearchType = "movie" | "tv" | "anime" | "user";

export default function SearchPage() {
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState<TMDBMovieBasic[]>([]);
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recent,  setRecent]  = useState<string[]>([]);
  const [type,    setType]    = useState<SearchType>("movie");
  const [country, setCountry] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRecent(getRecent());
    inputRef.current?.focus();
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      setUserResults([]);
      return;
    }
    const timer = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, type, country]);

  async function doSearch(q: string) {
    setLoading(true);
    try {
      if (type === "user") {
        const res  = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setUserResults(data.data?.results ?? []);
        setResults([]);
      } else {
        const qs = new URLSearchParams({ q });
        if (type !== "movie") qs.set("type", type);
        if (country)          qs.set("country", country);
        const res  = await fetch(`/api/movies/search?${qs.toString()}`);
        const data = await res.json();
        setResults(data.data?.results ?? []);
        setUserResults([]);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(q: string) {
    saveRecent(q);
    setRecent(getRecent());
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Topbar />
      <div className="flex pt-14">
        <div className="hidden lg:block w-[240px] shrink-0"><Sidebar /></div>

        <main className="flex-1 min-w-0 max-w-2xl mx-auto px-4 py-6 pb-24 lg:pb-8">
          {/* Search input */}
          <div className="relative mb-6">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#505060]" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search movies, directors, actors..."
              className="w-full h-12 pl-10 pr-10 rounded-[10px] bg-[#12121A] border border-[#1E1E2E] text-white placeholder:text-[#505060] focus:outline-none focus:border-[#E50914]/50 transition-colors text-sm"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#505060] hover:text-white"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="flex items-center gap-1 p-1 bg-[#12121A] border border-[#1E1E2E] rounded-lg">
              {([
                { id: "movie", label: "Movies" },
                { id: "tv",    label: "TV Shows" },
                { id: "anime", label: "Anime" },
                { id: "user",  label: "Users" },
              ] as const).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all
                    ${type === t.id
                      ? "bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white"
                      : "text-[#A0A0B0] hover:text-white hover:bg-white/[0.04]"
                    }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {type !== "user" && (
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="bg-[#12121A] border border-[#1E1E2E] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#3B82F6]/50"
              >
                {COUNTRY_OPTS.map((c) => (
                  <option key={c.code} value={c.code}>{c.flag} {c.label}</option>
                ))}
              </select>
            )}
          </div>

          {/* Recent searches */}
          {!query && recent.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-[#505060] uppercase tracking-wide">Recent</h3>
                <button
                  onClick={() => { localStorage.removeItem(RECENT_KEY); setRecent([]); }}
                  className="text-xs text-[#505060] hover:text-white"
                >
                  Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recent.map((r) => (
                  <button
                    key={r}
                    onClick={() => setQuery(r)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1A1A28] text-sm text-[#A0A0B0] hover:text-white hover:bg-[#252535] transition-all"
                  >
                    <Clock size={12} />
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!query && recent.length === 0 && (
            <div className="text-center py-16 text-[#505060]">
              <Film size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-lg font-semibold text-[#A0A0B0] mb-1">Search VOLTV</p>
              <p className="text-sm">Find movies, rate them, debate them.</p>
            </div>
          )}

          {/* Loading skeletons */}
          {loading && (
            <div className="space-y-3">
              {[1,2,3,4,5].map((i) => (
                <div key={i} className="flex gap-3 p-3 card">
                  <Skeleton className="w-12 h-[72px] rounded-[6px] shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* User results */}
          {!loading && type === "user" && userResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-[#505060] mb-3">{userResults.length} users for "{query}"</p>
              {userResults.map((u) => (
                <Link
                  key={u.id}
                  href={`/profile/${u.username}`}
                  onClick={() => handleSelect(query)}
                  className="flex gap-3 p-3 card hover:border-white/10 cursor-pointer items-center"
                >
                  <div className="relative w-12 h-12 rounded-full overflow-hidden bg-[#1A1A28] shrink-0">
                    {u.avatar_url ? (
                      <Image src={u.avatar_url} alt={u.username} fill className="object-cover" sizes="48px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#505060]">
                        <UserRound size={20} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-sm text-white leading-tight truncate">@{u.username}</h3>
                      {u.is_blue_tick && <VerifiedBadge size={14} />}
                    </div>
                    <p className="text-xs text-[#505060] mt-0.5">
                      Level {u.level} · {u.xp_points.toLocaleString()} XP · {u._count.followers} follower{u._count.followers === 1 ? "" : "s"}
                    </p>
                    {u.bio && (
                      <p className="text-xs text-[#A0A0B0] line-clamp-1 mt-0.5">{u.bio}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* No user results */}
          {!loading && type === "user" && query.length >= 2 && userResults.length === 0 && (
            <div className="text-center py-12">
              <p className="text-[#505060]">No users matching "{query}"</p>
            </div>
          )}

          {/* Results */}
          {!loading && type !== "user" && results.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-[#505060] mb-3">{results.length} results for "{query}"</p>
              {results.map((movie) => (
                <Link
                  key={movie.id}
                  href={type === "movie" ? `/movie/${movie.id}` : `/tv/${movie.id}`}
                  onClick={() => handleSelect(query)}
                  className="flex gap-3 p-3 card hover:border-white/10 cursor-pointer"
                >
                  {/* Poster */}
                  <div className="relative w-12 h-[72px] rounded-[6px] overflow-hidden bg-[#1A1A28] shrink-0">
                    {movie.poster_path ? (
                      <Image
                        src={posterUrl(movie.poster_path, "w185")}
                        alt={movie.title}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-lg">🎬</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-white leading-tight mb-0.5 line-clamp-1">
                      {movie.title}
                    </h3>
                    <p className="text-xs text-[#505060] mb-1">
                      {movie.release_date ? extractYear(movie.release_date) : "—"}
                      {movie.genre_ids?.length > 0 && " · Film"}
                    </p>
                    <p className="text-xs text-[#A0A0B0] line-clamp-2 leading-relaxed">
                      {movie.overview?.slice(0, 100)}...
                    </p>
                  </div>

                  {/* TMDB score */}
                  {movie.vote_average > 0 && (
                    <div className="shrink-0 flex flex-col items-center justify-center">
                      <span className={`font-mono font-bold text-sm ${scoreColor(movie.vote_average)}`}>
                        {formatScore(movie.vote_average)}
                      </span>
                      <span className="text-[10px] text-[#505060]">TMDB</span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}

          {/* No results */}
          {!loading && type !== "user" && query.length >= 2 && results.length === 0 && (
            <div className="text-center py-12">
              <p className="text-[#505060]">No results for "{query}"</p>
              <p className="text-sm text-[#505060] mt-1">Try a different spelling or title</p>
            </div>
          )}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
