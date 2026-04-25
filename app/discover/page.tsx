import { Suspense } from "react";
import Link from "next/link";
import Topbar from "@/components/layout/Topbar";
import Sidebar, { BottomNav } from "@/components/layout/Sidebar";
import { MovieRow } from "@/components/movie/MovieCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { discoverMovies, discoverTV, getTrending } from "@/lib/tmdb";
import { MOOD_TAGS, DECADES, STREAMING_SERVICES } from "@/types";
import CountryDropdown from "@/components/discover/CountryDropdown";
import type { MovieCard } from "@/types";

function tmdbToCard(m: { id: number; title: string; poster_path: string | null; release_date: string; vote_average?: number }): MovieCard {
  return {
    id:           String(m.id),
    tmdb_id:      m.id,
    title:        m.title,
    poster_url:   m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
    release_date: m.release_date,
    voltv_score:  null,
    genres:       [],
    runtime:      null,
  };
}

type DiscoverKind = "movie" | "tv";

const MOOD_GRADIENTS: Record<string, string> = {
  feel_good:    "from-[#F59E0B] to-[#EA580C]",
  emotional:    "from-[#6366F1] to-[#4338CA]",
  mind_bending: "from-[#8B5CF6] to-[#5B21B6]",
  action:       "from-[#EF4444] to-[#991B1B]",
  scary:        "from-[#1F2937] to-[#0F172A]",
  romantic:     "from-[#EC4899] to-[#BE185D]",
  comedy:       "from-[#10B981] to-[#047857]",
  comfort:      "from-[#06B6D4] to-[#0E7490]",
  scifi:        "from-[#0EA5E9] to-[#1E40AF]",
};

const COUNTRIES: { code: string; label: string; flag: string }[] = [
  { code: "US", label: "USA",        flag: "🇺🇸" },
  { code: "IN", label: "India",      flag: "🇮🇳" },
  { code: "GB", label: "UK",         flag: "🇬🇧" },
  { code: "KR", label: "Korea",      flag: "🇰🇷" },
  { code: "JP", label: "Japan",      flag: "🇯🇵" },
  { code: "FR", label: "France",     flag: "🇫🇷" },
  { code: "ES", label: "Spain",      flag: "🇪🇸" },
  { code: "IT", label: "Italy",      flag: "🇮🇹" },
  { code: "DE", label: "Germany",    flag: "🇩🇪" },
  { code: "CN", label: "China",      flag: "🇨🇳" },
  { code: "HK", label: "Hong Kong",  flag: "🇭🇰" },
  { code: "BR", label: "Brazil",     flag: "🇧🇷" },
  { code: "MX", label: "Mexico",     flag: "🇲🇽" },
  { code: "CA", label: "Canada",     flag: "🇨🇦" },
  { code: "AU", label: "Australia",  flag: "🇦🇺" },
  { code: "RU", label: "Russia",     flag: "🇷🇺" },
  { code: "NP", label: "Nepal",      flag: "🇳🇵" },
];

// Mood → TMDB genre IDs
const MOOD_GENRE_IDS: Record<string, string> = {
  feel_good:    "35,16,10751",
  emotional:    "18,10749",
  mind_bending: "878,9648,53",
  action:       "28,12",
  scary:        "27",
  romantic:     "10749",
  comedy:       "35",
  comfort:      "18,35",
  scifi:        "878",
};

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ mood?: string; decade?: string; country?: string; kind?: string; sort?: string; filter?: string }>;
}) {
  const sp      = await searchParams;
  const moodParam = sp.mood;
  const moods   = moodParam
    ? moodParam.split(",").filter((m) => MOOD_GENRE_IDS[m])
    : [];
  const decade  = sp.decade;
  const country = sp.country && COUNTRIES.some((c) => c.code === sp.country) ? sp.country : undefined;
  const kind: DiscoverKind = sp.kind === "tv" ? "tv" : "movie";

  const [trending, topRated, upcoming] = await Promise.all([
    getTrending("week").then((d) => d.results.slice(0, 10).map(tmdbToCard)).catch(() => [] as MovieCard[]),
    discoverMovies({ sort_by: "vote_average.desc", "vote_average.gte": 8, page: 1 })
      .then((d) => d.results.slice(0, 10).map(tmdbToCard)).catch(() => [] as MovieCard[]),
    discoverMovies({ sort_by: "primary_release_date.asc" })
      .then((d) => d.results.filter((m) => new Date(m.release_date) > new Date()).slice(0, 8).map(tmdbToCard))
      .catch(() => [] as MovieCard[]),
  ]);

  // Filtered results based on params (mood + decade combinable)
  let filtered: MovieCard[] = [];
  let filterTitle = "";

  if (moods.length > 0 || decade || country || kind !== "movie") {
    const tagLabels = moods
      .map((m) => MOOD_TAGS.find((t) => t.id === m)?.label)
      .filter(Boolean) as string[];
    const ctry = country ? COUNTRIES.find((c) => c.code === country) : null;
    const parts: string[] = [];
    if (tagLabels.length) parts.push(tagLabels.join(" + "));
    if (decade) parts.push(`${decade}s`);
    if (ctry) parts.push(`${ctry.flag} ${ctry.label}`);
    if (kind === "tv") parts.push("TV");
    filterTitle = parts.join(" · ");

    const params: Record<string, string | number> = { sort_by: "popularity.desc" };
    if (moods.length) {
      // Union genre IDs across selected moods, OR-joined with pipe
      const ids = Array.from(new Set(moods.flatMap((m) => MOOD_GENRE_IDS[m].split(","))));
      params.with_genres = ids.join("|");
    }
    if (country) params.with_origin_country = country;
    if (decade) {
      const year = parseInt(decade);
      params["release_date.gte"] = `${year}-01-01`;
      params["release_date.lte"] = `${year + 9}-12-31`;
      if (!moods.length) {
        params.sort_by = "vote_average.desc";
        params["vote_average.gte"] = 7;
      }
    }
    const fetcher = kind === "tv" ? discoverTV(params) : discoverMovies(params);
    filtered = await fetcher
      .then((d) => d.results.slice(0, 20).map(tmdbToCard))
      .catch(() => [] as MovieCard[]);
  }

  const buildHref = (overrides: { mood?: string[] | null; decade?: string | null; country?: string | null; kind?: DiscoverKind }) => {
    const nextMoods   = overrides.mood    === undefined ? moods   : (overrides.mood ?? []);
    const nextDecade  = overrides.decade  === undefined ? decade  : overrides.decade;
    const nextCountry = overrides.country === undefined ? country : overrides.country;
    const nextKind    = overrides.kind    === undefined ? kind    : overrides.kind;
    const qs = new URLSearchParams();
    if (nextMoods.length)      qs.set("mood", nextMoods.join(","));
    if (nextDecade)            qs.set("decade", nextDecade);
    if (nextCountry)           qs.set("country", nextCountry);
    if (nextKind !== "movie")  qs.set("kind", nextKind);
    const s = qs.toString();
    return s ? `/discover?${s}` : "/discover";
  };
  const toggleMoodHref = (id: string) => {
    const next = moods.includes(id) ? moods.filter((m) => m !== id) : [...moods, id];
    return buildHref({ mood: next });
  };
  const decadeHref  = (yr: string) => buildHref({ decade: yr });
  const countryHref = (code: string) => buildHref({ country: code });

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Topbar />
      <div className="flex pt-14">
        <div className="hidden lg:block w-[240px] shrink-0"><Sidebar /></div>

        <main className="flex-1 min-w-0 max-w-4xl mx-auto px-4 py-6 space-y-10 pb-24 lg:pb-8">

          {/* MOOD SELECTOR */}
          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-base font-semibold text-white tracking-tight">Mood</h2>
              <p className="text-[11px] text-[#6B6B80]">Tap to toggle · multi-select</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MOOD_TAGS.map((tag) => {
                const active = moods.includes(tag.id);
                const gradient = MOOD_GRADIENTS[tag.id] ?? "from-[#3A3A50] to-[#1A1A28]";
                return (
                  <Link
                    key={tag.id}
                    href={toggleMoodHref(tag.id)}
                    className={`group relative overflow-hidden rounded-full h-8 pl-2.5 pr-3 flex items-center gap-1.5 text-[12.5px] font-medium border transition-all
                      ${active
                        ? "border-white/30 text-white shadow-sm"
                        : "border-[#1E1E2E] bg-[#12121A] text-[#C8C8D4] hover:border-white/20 hover:text-white"}`}
                  >
                    {active && (
                      <span className={`absolute inset-0 bg-gradient-to-r ${gradient} opacity-85`} />
                    )}
                    <span className={`relative inline-block h-2 w-2 rounded-full bg-gradient-to-br ${gradient} ${active ? "ring-1 ring-white/60" : ""}`} />
                    <span className="relative">{tag.label}</span>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* DECADE SELECTOR */}
          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-base font-semibold text-white tracking-tight">Decade</h2>
              <p className="text-[11px] text-[#6B6B80]">Travel through cinema</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DECADES.map((d) => {
                const yr = d.replace("s", "");
                const active = decade === yr;
                return (
                  <Link
                    key={d}
                    href={active ? buildHref({ decade: null }) : decadeHref(yr)}
                    className={`h-8 px-3 rounded-full text-[12.5px] font-mono font-semibold tracking-wide flex items-center transition-all
                      ${active
                        ? "bg-gradient-to-r from-[#F5A623] to-[#E50914] text-white border border-white/20 shadow-sm"
                        : "bg-[#12121A] border border-[#1E1E2E] text-[#C8C8D4] hover:border-[#F5A623]/40 hover:text-white"
                      }`}
                  >
                    {d}
                  </Link>
                );
              })}
            </div>
          </section>

          {/* COUNTRY + KIND */}
          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-base font-semibold text-white tracking-tight">Country &amp; type</h2>
              <p className="text-[11px] text-[#6B6B80]">Narrow by region</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <CountryDropdown
                countries={COUNTRIES.map((c) => ({ ...c, href: countryHref(c.code) }))}
                active={country}
                clearHref={buildHref({ country: null })}
              />
              <div className="flex items-center gap-1 p-0.5 bg-[#12121A] border border-[#1E1E2E] rounded-full h-8">
                {([
                  { id: "movie", label: "Movies" },
                  { id: "tv",    label: "TV Series" },
                ] as const).map((t) => {
                  const active = kind === t.id;
                  return (
                    <Link
                      key={t.id}
                      href={buildHref({ kind: t.id })}
                      className={`px-3 h-7 flex items-center rounded-full text-[12.5px] font-medium transition-all
                        ${active
                          ? "bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white"
                          : "text-[#A0A0B0] hover:text-white"
                        }`}
                    >
                      {t.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Filtered results */}
          {filtered.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-white mb-4">{filterTitle}</h2>
              <div className="movie-grid">
                {filtered.map((item) => (
                  <Link
                    key={item.id}
                    href={kind === "tv" ? `/tv/${item.tmdb_id}` : `/movie/${item.tmdb_id}`}
                    className="poster-card aspect-[2/3] bg-[#1A1A28]"
                  >
                    {item.poster_url && (
                      <img src={item.poster_url} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end p-2">
                      <p className="text-xs font-semibold text-white line-clamp-2">{item.title}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Trending This Week */}
          {!moods.length && !decade && !country && kind === "movie" &&trending.length > 0 && (
            <MovieRow title="🔥 Trending This Week" movies={trending} />
          )}

          {/* Top Rated All Time */}
          {!moods.length && !decade && !country && kind === "movie" &&topRated.length > 0 && (
            <MovieRow title="⭐ Highest Rated" movies={topRated} />
          )}

          {/* Upcoming */}
          {!moods.length && !decade && !country && kind === "movie" &&upcoming.length > 0 && (
            <MovieRow title="📅 Coming Soon" movies={upcoming} />
          )}

          {/* STREAMING SERVICES */}
          {!moods.length && !decade && !country && kind === "movie" &&(
            <section>
              <h2 className="text-lg font-bold text-white mb-4">📺 By Platform</h2>
              <div className="flex flex-wrap gap-2">
                {STREAMING_SERVICES.map((svc) => (
                  <Link
                    key={svc}
                    href={`/discover?platform=${encodeURIComponent(svc)}`}
                    className="px-4 py-2 rounded-[8px] border border-[#1E1E2E] bg-[#1A1A28] text-sm text-[#A0A0B0] hover:border-white/20 hover:text-white transition-all"
                  >
                    {svc}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
