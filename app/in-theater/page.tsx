import Link from "next/link";
import Image from "next/image";
import Topbar from "@/components/layout/Topbar";
import Sidebar, { BottomNav } from "@/components/layout/Sidebar";
import PosterActions from "@/components/movie/PosterActions";
import { getNowPlaying, getUpcoming } from "@/lib/tmdb";
import type { TMDBMovieBasic } from "@/lib/tmdb";

type Filter = "now" | "upcoming" | "anticipated";

const FILTERS: { key: Filter; label: string; sub: string }[] = [
  { key: "now",         label: "Now Playing", sub: "Currently in theaters" },
  { key: "upcoming",    label: "This Month",  sub: "Releasing in the next 4 weeks" },
  { key: "anticipated", label: "Anticipated", sub: "Most-awaited releases" },
];

function formatReleaseDate(iso: string | undefined): string {
  if (!iso) return "TBA";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "TBA";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function InTheaterPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter: f } = await searchParams;
  const filter: Filter = f === "upcoming" || f === "anticipated" ? f : "now";

  let movies: TMDBMovieBasic[] = [];
  try {
    if (filter === "now") {
      const data = await getNowPlaying("US", 1);
      movies = data.results;
    } else if (filter === "upcoming") {
      const data = await getUpcoming("US", 1);
      movies = data.results;
    } else {
      const [p2, p3] = await Promise.all([getUpcoming("US", 2), getUpcoming("US", 3)]);
      movies = [...p2.results, ...p3.results].sort((a, b) => b.popularity - a.popularity);
    }
  } catch {}

  const hero = movies[0] ?? null;
  const rest = movies.slice(1);
  const activeMeta = FILTERS.find((x) => x.key === filter) ?? FILTERS[0];

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Topbar />
      <div className="flex pt-14">
        <div className="hidden lg:block w-[240px] shrink-0"><Sidebar /></div>

        <main className="flex-1 min-w-0 pb-24 lg:pb-12">
          {/* Hero */}
          {hero && (
            <div className="group relative w-full h-[44vh] min-h-[320px] max-h-[520px] overflow-hidden">
              <Link
                href={`/movie/${hero.id}`}
                className="absolute inset-0 block"
                aria-label={hero.title}
              >
                {hero.backdrop_path ? (
                  <Image
                    src={`https://image.tmdb.org/t/p/original${hero.backdrop_path}`}
                    alt={hero.title}
                    fill
                    priority
                    sizes="100vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-[#1A1A28] to-[#0A0A0F]" />
                )}
                {/* Gradients for legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F] via-[#0A0A0F]/30 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0F]/80 via-transparent to-transparent" />
              </Link>

              {/* Watched / Watch later / Fire */}
              <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
                <PosterActions
                  tmdbId={hero.id}
                  kind="movie"
                  alwaysShowWatched
                  title={hero.title}
                  posterUrl={hero.poster_path ? `https://image.tmdb.org/t/p/w500${hero.poster_path}` : null}
                />
              </div>

              <div className="pointer-events-none absolute bottom-0 left-0 right-0 p-6 sm:p-10 max-w-3xl">
                <span className="inline-block text-[10px] font-bold tracking-[0.2em] text-[#F5A623] uppercase mb-2">
                  Featured · {activeMeta.label}
                </span>
                <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl text-white leading-[0.95] mb-3">
                  {hero.title}
                </h1>
                <p className="text-sm sm:text-base text-[#A0A0B0] line-clamp-2 mb-3 max-w-xl">
                  {hero.overview || "No synopsis yet."}
                </p>
                <div className="flex items-center gap-3 text-xs sm:text-sm text-[#A0A0B0]">
                  <span className="font-semibold text-white">{formatReleaseDate(hero.release_date)}</span>
                  {hero.vote_average > 0 && (
                    <>
                      <span className="text-[#1E1E2E]">|</span>
                      <span>★ {hero.vote_average.toFixed(1)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Filter bar — sticky-ish, full-bleed */}
          <div className="border-b border-[#1E1E2E]">
            <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">{activeMeta.label}</h2>
                <p className="text-xs text-[#505060] mt-0.5">{activeMeta.sub}</p>
              </div>
              <div className="flex items-center gap-1 bg-[#12121A] rounded-full p-1 border border-[#1E1E2E] self-start sm:self-auto">
                {FILTERS.map((opt) => {
                  const active = opt.key === filter;
                  return (
                    <Link
                      key={opt.key}
                      href={`/in-theater?filter=${opt.key}`}
                      className={
                        "px-4 py-1.5 rounded-full text-sm font-medium transition-colors " +
                        (active
                          ? "bg-white text-black"
                          : "text-[#A0A0B0] hover:text-white")
                      }
                    >
                      {opt.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Grid */}
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
            {rest.length === 0 ? (
              <p className="text-sm text-[#505060]">No additional titles in this window.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5">
                {rest.map((m) => (
                  <div key={m.id} className="group flex flex-col">
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-[#1A1A28]">
                      <Link href={`/movie/${m.id}`} className="absolute inset-0">
                        {m.poster_path ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/w500${m.poster_path}`}
                            alt={m.title}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#505060] text-xs">
                            No poster
                          </div>
                        )}
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                      {m.vote_average > 0 && (
                        <span className="absolute top-2 left-2 text-[10px] font-mono font-bold text-white bg-black/70 backdrop-blur px-1.5 py-0.5 rounded z-10">
                          ★ {m.vote_average.toFixed(1)}
                        </span>
                      )}
                      <PosterActions
                        tmdbId={m.id}
                        kind="movie"
                        title={m.title}
                        posterUrl={m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null}
                      />
                    </div>
                    <Link href={`/movie/${m.id}`} className="block">
                      <p className="mt-2.5 text-sm font-semibold text-white leading-tight line-clamp-2 group-hover:text-[#E50914] transition-colors">
                        {m.title}
                      </p>
                      <p className="text-xs text-[#505060] mt-1">
                        {formatReleaseDate(m.release_date)}
                      </p>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
