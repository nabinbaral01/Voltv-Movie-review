import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Topbar from "@/components/layout/Topbar";
import Sidebar, { BottomNav } from "@/components/layout/Sidebar";
import { MovieRow } from "@/components/movie/MovieCard";
import { getMovieById, profileUrl, getTrending, extractTrailerKey } from "@/lib/tmdb";
import { formatRuntime, extractYear } from "@/utils/formatters";
import { readCommentsFor } from "@/lib/comments";
import { getSessionUser } from "@/lib/auth";
import { BLUE_TICK_XP_THRESHOLD } from "@/lib/xp-system";
import CommentSection from "./_components/CommentSection";
import WatchActions from "./_components/WatchActions";
import ScoreGauge from "./_components/ScoreGauge";
import ScoreMeter from "./_components/ScoreMeter";
import StreamsOn from "./_components/StreamsOn";
import TrailerHero from "./_components/TrailerHero";
import PosterDownloadButton from "@/components/movie/PosterDownloadButton";
import type { MovieCard } from "@/types";

export default async function MoviePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tmdbId = parseInt(id, 10);
  if (isNaN(tmdbId)) notFound();

  let movie;
  try {
    movie = await getMovieById(tmdbId);
  } catch {
    notFound();
  }

  const comments = await readCommentsFor(tmdbId);
  const me       = await getSessionUser();
  const unlocked = (me?.xp_points ?? 0) >= BLUE_TICK_XP_THRESHOLD;

  const cast     = movie.credits?.cast?.slice(0, 12) ?? [];
  const crew     = (movie.credits?.crew ?? [])
    .filter((c) => ["Director", "Producer", "Screenplay", "Writer", "Director of Photography", "Original Music Composer"].includes(c.job))
    .slice(0, 8);
  const director = movie.credits?.crew?.find((c) => c.job === "Director");

  const similar: MovieCard[] = (movie.similar?.results ?? []).slice(0, 8).map((m) => ({
    id:           String(m.id),
    tmdb_id:      m.id,
    title:        m.title,
    poster_url:   m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
    release_date: m.release_date,
    voltv_score:  null,
    genres:       [],
    runtime:      null,
  }));

  // Most Discussed (trending movies for sidebar)
  let trending: { id: number; title: string; poster_path: string | null }[] = [];
  try {
    const t = await getTrending("week");
    trending = t.results.slice(0, 6);
  } catch {}

  const providersUS = movie["watch/providers"]?.results?.US;
  const providers   = [
    ...(providersUS?.flatrate ?? []),
    ...(providersUS?.rent ?? []),
  ];

  const backdrop = movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : null;
  const poster   = movie.poster_path   ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`   : null;

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Topbar />
      <div className="flex pt-14">
        <div className="hidden lg:block w-[240px] shrink-0"><Sidebar /></div>

        <main className="flex-1 min-w-0 pb-24 lg:pb-8">
          {/* HERO */}
          <TrailerHero
            backdrop={backdrop}
            videoId={extractTrailerKey(movie.videos?.results ?? [])}
            title={movie.title}
          />

          {/* Body grid */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-24 relative z-10">
            <div className="grid lg:grid-cols-[1fr_320px] gap-6">
              {/* MAIN */}
              <div className="space-y-8 min-w-0">
                {/* Title row with poster */}
                {(() => {
                  const country = movie.production_countries?.[0]?.name ?? "—";
                  const language = movie.spoken_languages?.[0]?.english_name ?? "—";
                  const certs = movie.release_dates?.results ?? [];
                  const pick = (iso: string) =>
                    certs.find((r) => r.iso_3166_1 === iso)?.release_dates
                      .map((d) => d.certification).find((c) => c && c.trim());
                  const ageRating = pick("US") || pick("IN") || pick("GB") || certs
                    .flatMap((r) => r.release_dates.map((d) => d.certification))
                    .find((c) => c && c.trim()) || "NR";

                  const formatMoney = (n: number | null | undefined) => {
                    if (!n || n <= 0) return "—";
                    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
                    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
                    if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
                    return `$${n}`;
                  };
                  const revenue = formatMoney((movie as { revenue?: number }).revenue);
                  const voteAvg  = (movie as { vote_average?: number }).vote_average;
                  const voteCount = (movie as { vote_count?: number }).vote_count;
                  const rating = voteAvg && voteAvg > 0
                    ? `⭐ ${voteAvg.toFixed(1)}${voteCount ? ` (${voteCount >= 1000 ? `${(voteCount/1000).toFixed(1)}K` : voteCount})` : ""}`
                    : "—";

                  return (
                    <div className="flex gap-5 items-start">
                      {poster && (
                        <div className="relative w-28 sm:w-40 shrink-0 aspect-[2/3] rounded-[10px] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
                          <Image src={poster} alt={movie.title} fill className="object-cover" sizes="160px" />
                          <PosterDownloadButton url={poster} name={`${movie.title}-poster`} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 pt-2 space-y-3">
                        <div>
                          <div className="text-xs text-[#A0A0B0] mb-1">
                            Movie
                            {movie.release_date && <> · {extractYear(movie.release_date)}</>}
                            {movie.runtime && <> · {formatRuntime(movie.runtime)}</>}
                          </div>
                          <div className="flex items-start gap-3 flex-wrap">
                            <h1 className="font-display text-3xl sm:text-5xl text-white leading-tight">
                              {movie.title}
                            </h1>
                            <div className="pt-2">
                              <WatchActions tmdbId={tmdbId} />
                            </div>
                          </div>
                        </div>

                        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                          <InfoCell label="Directed by" value={director?.name ?? "—"} />
                          <InfoCell label="Country"     value={country} />
                          <InfoCell label="Language"    value={language} />
                          <InfoCell label="Age Rating"  value={ageRating} />
                        </dl>
                        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <InfoCell label="Rating"  value={rating} />
                          <InfoCell label="Revenue" value={revenue} />
                        </dl>
                      </div>
                    </div>
                  );
                })()}

                {/* Overview + genre tags */}
                <section className="card p-5 space-y-3">
                  <h2 className="text-sm font-semibold text-[#A0A0B0] uppercase tracking-wide">Overview</h2>
                  <div className="flex flex-wrap gap-2">
                    {movie.genres.map((g) => (
                      <span key={g.id} className="bg-white/10 text-white text-xs px-2.5 py-1 rounded-md">
                        {g.name}
                      </span>
                    ))}
                  </div>
                  {movie.overview && (
                    <p className="text-[#A0A0B0] leading-relaxed text-sm">{movie.overview}</p>
                  )}
                </section>

                {/* Promo banner — hidden once user earns 100+ XP */}
                {!unlocked && (
                  <Link
                    href="/settings/subscription"
                    className="block relative overflow-hidden rounded-2xl px-5 py-4 bg-gradient-to-r from-[#1E40AF] to-[#3B82F6] text-white"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-bold">Sign up to get access</div>
                        <div className="text-xs opacity-90">Unlock reviews, reactions, and personalized recs.</div>
                      </div>
                      <div className="bg-white text-[#1E40AF] text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap">
                        Get VoltV Pro →
                      </div>
                    </div>
                  </Link>
                )}

                {/* Streams On */}
                <StreamsOn providers={providers} link={providersUS?.link} />

                {/* Cast */}
                {cast.length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold text-[#A0A0B0] uppercase tracking-wide mb-3">Cast</h2>
                    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                      {cast.map((p) => (
                        <Link key={p.id} href={`/actor/${p.id}`} className="flex flex-col items-center gap-1.5 shrink-0 w-20 group">
                          <div className="w-16 h-16 rounded-full overflow-hidden bg-[#1A1A28] border-2 border-transparent group-hover:border-[#E50914] transition-colors">
                            {p.profile_path ? (
                              <Image src={profileUrl(p.profile_path, "w185")} alt={p.name} width={64} height={64} className="object-cover w-full h-full" />
                            ) : (
                              <div className="w-full h-full bg-[#2A2A3A] flex items-center justify-center">
                                <svg viewBox="0 0 100 100" className="w-3/5 h-3/5 text-[#3A3A4A]">
                                  <circle cx="50" cy="38" r="18" fill="currentColor" />
                                  <ellipse cx="50" cy="80" rx="30" ry="22" fill="currentColor" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <p className="text-[11px] text-white text-center leading-tight line-clamp-2 group-hover:text-[#E50914] transition-colors">{p.name}</p>
                          <p className="text-[10px] text-[#505060] text-center leading-tight line-clamp-1">{p.character}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Crew */}
                {crew.length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold text-[#A0A0B0] uppercase tracking-wide mb-3">Crew</h2>
                    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                      {crew.map((p, i) => (
                        <div key={`${p.id}-${i}`} className="flex flex-col items-center gap-1.5 shrink-0 w-20">
                          <div className="w-16 h-16 rounded-full overflow-hidden bg-[#1A1A28]">
                            {p.profile_path ? (
                              <Image src={profileUrl(p.profile_path, "w185")} alt={p.name} width={64} height={64} className="object-cover w-full h-full" />
                            ) : (
                              <div className="w-full h-full bg-[#2A2A3A] flex items-center justify-center">
                                <svg viewBox="0 0 100 100" className="w-3/5 h-3/5 text-[#3A3A4A]">
                                  <circle cx="50" cy="38" r="18" fill="currentColor" />
                                  <ellipse cx="50" cy="80" rx="30" ry="22" fill="currentColor" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <p className="text-[11px] text-white text-center leading-tight line-clamp-2">{p.name}</p>
                          <p className="text-[10px] text-[#505060] text-center leading-tight line-clamp-1">{p.job}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Score Meter */}
                <ScoreMeter tmdbId={tmdbId} initialComments={comments} />

                {/* Reviews (comment section) */}
                <CommentSection tmdbId={movie.id} username="admin" />

                {similar.length > 0 && <MovieRow title="Latest Reviews" movies={similar} size="sm" />}
              </div>

              {/* RIGHT SIDEBAR */}
              <aside className="space-y-4">
                <div className="card p-5 flex flex-col items-center gap-4">
                  <ScoreGauge tmdbId={tmdbId} initialComments={comments} />
                  <a
                    href="#comments"
                    className="w-full text-center bg-[#22C55E] hover:bg-[#16A34A] text-black font-semibold text-sm py-2 rounded-full transition-colors"
                  >
                    + Add Review
                  </a>
                </div>

                {trending.length > 0 && (
                  <div className="card p-4">
                    <h3 className="text-sm font-semibold text-white mb-3">💬 Most Discussed</h3>
                    <ol className="space-y-3">
                      {trending.map((m, i) => (
                        <li key={m.id}>
                          <Link href={`/movie/${m.id}`} className="flex items-center gap-3 group">
                            <span className="w-5 text-center text-sm font-extrabold text-[#505060] shrink-0">
                              {i + 1}
                            </span>
                            <div className="relative w-9 h-12 rounded-md overflow-hidden bg-[#1A1A28] shrink-0">
                              {m.poster_path && (
                                <Image
                                  src={`https://image.tmdb.org/t/p/w185${m.poster_path}`}
                                  alt={m.title}
                                  fill
                                  sizes="36px"
                                  className="object-cover"
                                />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold text-white truncate group-hover:text-[#E50914] transition-colors">
                                {m.title}
                              </div>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </aside>
            </div>
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-[#505060]">{label}</dt>
      <dd className="text-sm text-white mt-0.5 truncate">{value}</dd>
    </div>
  );
}
