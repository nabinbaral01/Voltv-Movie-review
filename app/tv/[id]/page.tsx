import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Topbar from "@/components/layout/Topbar";
import Sidebar, { BottomNav } from "@/components/layout/Sidebar";
import { getTVById, profileUrl, extractTrailerKey } from "@/lib/tmdb";
import { readFireStore, topFires } from "@/lib/fires";
import MostDiscussedSidebar from "@/components/discover/MostDiscussedSidebar";
import FireButton from "@/components/movie/FireButton";
import { extractYear } from "@/utils/formatters";
import TrailerHero from "@/app/movie/[id]/_components/TrailerHero";
import StreamsOn from "@/app/movie/[id]/_components/StreamsOn";
import ScoreGauge from "@/app/movie/[id]/_components/ScoreGauge";
import ScoreMeter from "@/app/movie/[id]/_components/ScoreMeter";
import CommentSection from "@/app/movie/[id]/_components/CommentSection";
import SeriesWatchActions from "@/app/tv/_components/SeriesWatchActions";
import TVWatchActions from "@/app/tv/_components/TVWatchActions";
import { readCommentsFor } from "@/lib/comments";
import { Tv, ExternalLink } from "lucide-react";

export default async function TVPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tmdbId = parseInt(id, 10);
  if (isNaN(tmdbId)) notFound();

  let show;
  try {
    show = await getTVById(tmdbId);
  } catch {
    notFound();
  }

  const comments = await readCommentsFor(tmdbId, "tv");

  const cast = show.credits?.cast?.slice(0, 12) ?? [];
  const crew = (show.credits?.crew ?? [])
    .filter((c) => ["Executive Producer", "Producer", "Writer", "Director", "Director of Photography", "Original Music Composer"].includes(c.job))
    .slice(0, 8);
  const creator = (show.credits?.crew ?? []).find((c) => c.job === "Executive Producer" || c.department === "Writing");

  const similar = (show.similar?.results ?? []).slice(0, 8).map((s) => ({
    id:           s.id,
    title:        s.name,
    poster_path:  s.poster_path,
    first_air_date: s.first_air_date,
  }));

  const fires = topFires(await readFireStore(), 7);

  const providersUS = show["watch/providers"]?.results?.US;
  const providers   = [
    ...(providersUS?.flatrate ?? []),
    ...(providersUS?.rent ?? []),
  ];

  const backdrop = show.backdrop_path ? `https://image.tmdb.org/t/p/w1280${show.backdrop_path}` : null;
  const poster   = show.poster_path   ? `https://image.tmdb.org/t/p/w500${show.poster_path}`   : null;
  const trailer  = extractTrailerKey(show.videos?.results ?? []);

  const startYear = extractYear(show.first_air_date);
  const endYear   = show.last_air_date ? extractYear(show.last_air_date) : null;
  const yearLabel = show.in_production
    ? (startYear ? `${startYear}–` : "—")
    : (startYear && endYear && startYear !== endYear ? `${startYear}–${endYear}` : (startYear ? String(startYear) : "—"));

  const country = show.production_countries?.[0]?.name ?? "—";
  const language = show.spoken_languages?.[0]?.english_name ?? "—";
  const voteAvg   = show.vote_average;
  const ratingLabel = voteAvg && voteAvg > 0 ? voteAvg.toFixed(1) : "—";
  const epRuntime  = show.episode_run_time?.[0] ? `~${show.episode_run_time[0]}m / ep` : "—";

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Topbar />
      <div className="flex pt-14">
        <div className="hidden lg:block w-[240px] shrink-0"><Sidebar /></div>

        <main className="flex-1 min-w-0 pb-24 lg:pb-8">
          {/* HERO */}
          <TrailerHero backdrop={backdrop} videoId={trailer} title={show.name} />

          {/* Body grid */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-24 relative z-10">
            <div className="grid lg:grid-cols-[1fr_320px] gap-6">
              {/* MAIN */}
              <div className="space-y-8 min-w-0">
                {/* Title row with poster */}
                <div className="flex gap-5 items-start">
                  {poster && (
                    <div className="relative w-28 sm:w-40 shrink-0 aspect-[2/3] rounded-[10px] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
                      <Image src={poster} alt={show.name} fill className="object-cover" sizes="160px" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 pt-2 space-y-3">
                    <div>
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#93C5FD] uppercase tracking-wider mb-1">
                        <Tv size={11} /> TV Series · {yearLabel}
                        {show.number_of_seasons > 0 && <> · {show.number_of_seasons}S {show.number_of_episodes}E</>}
                      </div>
                      <div className="flex items-start gap-3 flex-wrap">
                        <h1 className="font-display text-3xl sm:text-5xl text-white leading-tight">
                          {show.name}
                        </h1>
                        <div className="pt-2 flex items-center gap-2 flex-wrap">
                          <TVWatchActions tmdbId={tmdbId} />
                          <FireButton
                            tmdbId={tmdbId}
                            kind="tv"
                            title={show.name}
                            posterUrl={poster}
                            variant="inline"
                          />
                        </div>
                      </div>
                      {show.tagline && (
                        <p className="mt-2 text-sm text-[#A0A0B0] italic">&ldquo;{show.tagline}&rdquo;</p>
                      )}
                    </div>

                    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                      <InfoCell label="Created by"  value={creator?.name ?? "—"} />
                      <InfoCell label="Country"     value={country} />
                      <InfoCell label="Language"    value={language} />
                      <InfoCell label="Status"      value={show.status ?? "—"} />
                    </dl>
                    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <InfoCell label="Rating"     value={ratingLabel} />
                      <InfoCell label="Episode"    value={epRuntime} />
                      <InfoCell label="Network"    value={show.networks?.[0]?.name ?? "—"} />
                      <InfoCell label="First air"  value={show.first_air_date ? extractYear(show.first_air_date)?.toString() ?? "—" : "—"} />
                    </dl>
                  </div>
                </div>

                {/* Overview + genre tags */}
                <section className="card p-5 space-y-3">
                  <h2 className="text-sm font-semibold text-[#A0A0B0] uppercase tracking-wide">Overview</h2>
                  <div className="flex flex-wrap gap-2">
                    {show.genres.map((g) => (
                      <span key={g.id} className="bg-white/10 text-white text-xs px-2.5 py-1 rounded-md">
                        {g.name}
                      </span>
                    ))}
                  </div>
                  {show.overview && (
                    <p className="text-[#A0A0B0] leading-relaxed text-sm">{show.overview}</p>
                  )}
                </section>

                {/* IMDb deep-link (if available) */}
                {show.external_ids?.imdb_id && (
                  <a
                    href={`https://www.imdb.com/title/${show.external_ids.imdb_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block relative overflow-hidden rounded-2xl px-5 py-4 bg-gradient-to-r from-[#1E3A8A] to-[#3B82F6] text-white"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-bold">View on IMDb</div>
                        <div className="text-xs opacity-90">More ratings, trivia, and user reviews.</div>
                      </div>
                      <div className="bg-white text-[#1E40AF] text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap inline-flex items-center gap-1">
                        IMDb <ExternalLink size={11} />
                      </div>
                    </div>
                  </a>
                )}

                {/* Streams On */}
                <StreamsOn providers={providers} link={providersUS?.link} title={show.name} />

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

                {/* Seasons */}
                {show.seasons.length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold text-[#A0A0B0] uppercase tracking-wide mb-3">Seasons</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {show.seasons
                        .filter((s) => s.season_number > 0)
                        .map((s) => (
                          <Link
                            key={s.id}
                            href={`/tv/${tmdbId}/season/${s.season_number}`}
                            className="flex gap-3 rounded-lg border border-[#1E1E2E] bg-[#12121A] p-2.5 hover:border-[#3B82F6]/40 transition-colors group"
                          >
                            {s.poster_path ? (
                              <Image
                                src={`https://image.tmdb.org/t/p/w185${s.poster_path}`}
                                alt={s.name}
                                width={60}
                                height={90}
                                className="rounded flex-shrink-0 object-cover"
                              />
                            ) : (
                              <div className="w-[60px] h-[90px] rounded bg-[#1A1A28] flex-shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-semibold text-white truncate group-hover:text-[#E50914] transition-colors">{s.name}</p>
                              <p className="text-[11px] text-[#6B6B80] mt-0.5">{s.episode_count} ep{s.episode_count === 1 ? "" : "s"}</p>
                              {s.air_date && (
                                <p className="text-[11px] text-[#6B6B80]">{extractYear(s.air_date)}</p>
                              )}
                            </div>
                          </Link>
                        ))}
                    </div>
                  </div>
                )}

                {/* Score Meter */}
                <ScoreMeter tmdbId={tmdbId} initialComments={comments} kind="tv" />

                {/* Reviews (comment section) */}
                <CommentSection tmdbId={tmdbId} username="admin" kind="tv" />

                {/* Similar */}
                {similar.length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold text-[#A0A0B0] uppercase tracking-wide mb-3">Similar series</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {similar.map((s) => (
                        <Link key={s.id} href={`/tv/${s.id}`} className="group">
                          <div className="aspect-[2/3] rounded-lg overflow-hidden bg-[#1A1A28]">
                            {s.poster_path ? (
                              <Image
                                src={`https://image.tmdb.org/t/p/w500${s.poster_path}`}
                                alt={s.title}
                                width={500}
                                height={750}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-full bg-[#1A1A28]" />
                            )}
                          </div>
                          <p className="text-[12px] font-semibold text-white mt-1.5 truncate">{s.title}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT SIDEBAR */}
              <aside className="space-y-4">
                <div className="card p-5 flex flex-col items-center gap-4">
                  <ScoreGauge tmdbId={tmdbId} initialComments={comments} kind="tv" />
                  <a
                    href="#comments"
                    className="w-full text-center bg-[#22C55E] hover:bg-[#16A34A] text-black font-semibold text-sm py-2 rounded-full transition-colors"
                  >
                    + Add Review
                  </a>
                </div>

                <div className="card p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-white">Series info</h3>
                  <dl className="space-y-2">
                    <SidebarRow label="Status"    value={show.status ?? "—"} />
                    <SidebarRow label="Seasons"   value={show.number_of_seasons > 0 ? String(show.number_of_seasons) : "—"} />
                    <SidebarRow label="Episodes"  value={show.number_of_episodes > 0 ? String(show.number_of_episodes) : "—"} />
                    <SidebarRow label="Network"   value={show.networks?.[0]?.name ?? "—"} />
                    <SidebarRow label="Origin"    value={show.origin_country?.[0] ?? "—"} />
                  </dl>
                </div>

                <MostDiscussedSidebar initial={fires} />
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

function SidebarRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <dt className="text-[#A0A0B0]">{label}</dt>
      <dd className="text-white font-medium truncate max-w-[60%]">{value}</dd>
    </div>
  );
}
