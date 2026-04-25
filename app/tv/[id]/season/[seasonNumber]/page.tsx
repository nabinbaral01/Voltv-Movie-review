import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Topbar from "@/components/layout/Topbar";
import Sidebar, { BottomNav } from "@/components/layout/Sidebar";
import { getTVById, getTVSeason } from "@/lib/tmdb";
import { extractYear } from "@/utils/formatters";
import SeriesWatchActions from "@/app/tv/_components/SeriesWatchActions";
import { episodeKey, commentKey } from "@/lib/comments";
import { ChevronLeft, Calendar, Clock, Star, Play } from "lucide-react";

export default async function SeasonPage({
  params,
}: {
  params: Promise<{ id: string; seasonNumber: string }>;
}) {
  const { id, seasonNumber } = await params;
  const tvId = parseInt(id, 10);
  const sn   = parseInt(seasonNumber, 10);
  if (isNaN(tvId) || isNaN(sn)) notFound();

  let show, season;
  try {
    [show, season] = await Promise.all([getTVById(tvId), getTVSeason(tvId, sn)]);
  } catch {
    notFound();
  }

  const backdrop = show.backdrop_path ? `https://image.tmdb.org/t/p/w1280${show.backdrop_path}` : null;
  const poster   = season.poster_path ? `https://image.tmdb.org/t/p/w500${season.poster_path}` : null;
  const episodes = season.episodes ?? [];
  const seasonScope = `${commentKey(tvId, "tv")}:s${sn}`;

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Topbar />
      <div className="flex pt-14">
        <div className="hidden lg:block w-[240px] shrink-0"><Sidebar /></div>

        <main className="flex-1 min-w-0 pb-24 lg:pb-8">
          {/* Cinematic backdrop header */}
          <div className="relative">
            {backdrop && (
              <div className="absolute inset-0 overflow-hidden">
                <Image src={backdrop} alt="" fill priority sizes="100vw" className="object-cover opacity-40" />
                <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0F]/60 via-[#0A0A0F]/80 to-[#0A0A0F]" />
              </div>
            )}

            <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-10">
              <Link
                href={`/tv/${tvId}`}
                className="inline-flex items-center gap-1 text-sm text-[#A0A0B0] hover:text-white transition-colors mb-6"
              >
                <ChevronLeft size={16} /> Back to {show.name}
              </Link>

              <div className="flex flex-col sm:flex-row gap-6 items-start">
                {poster && (
                  <div className="relative w-36 sm:w-48 shrink-0 aspect-[2/3] rounded-xl overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.7)] ring-1 ring-white/5">
                    <Image src={poster} alt={season.name} fill className="object-cover" sizes="192px" />
                  </div>
                )}
                <div className="flex-1 min-w-0 space-y-3 pt-1">
                  <div className="text-[11px] font-semibold text-[#93C5FD] uppercase tracking-[0.14em]">
                    {show.name} · Season {season.season_number}
                  </div>

                  <div className="flex items-start gap-3 flex-wrap">
                    <h1 className="font-display text-4xl sm:text-6xl text-white leading-[1.05]">
                      {season.name}
                    </h1>
                    <div className="pt-2">
                      <SeriesWatchActions scope={seasonScope} />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#C4C4D0]">
                    {season.air_date && (
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar size={13} /> {extractYear(season.air_date)}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      <Play size={13} /> {episodes.length} episode{episodes.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  {season.overview && (
                    <p className="text-sm text-[#A0A0B0] leading-relaxed max-w-prose">
                      {season.overview}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Episodes */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#A0A0B0] uppercase tracking-wider">Episodes</h2>
              <span className="text-xs text-[#505060]">{episodes.length} total</span>
            </div>

            {episodes.length === 0 ? (
              <p className="text-sm text-[#505060] py-8 text-center">No episodes listed.</p>
            ) : (
              <ul className="space-y-2.5">
                {episodes.map((ep) => {
                  const still = ep.still_path ? `https://image.tmdb.org/t/p/w500${ep.still_path}` : null;
                  const epScope = episodeKey(tvId, sn, ep.episode_number);
                  return (
                    <li key={ep.id} className="group">
                      <div className="relative flex flex-col sm:flex-row rounded-xl overflow-hidden bg-[#12121A] border border-[#1E1E2E] hover:border-[#3B82F6]/50 transition-colors">
                        <Link
                          href={`/tv/${tvId}/season/${sn}/episode/${ep.episode_number}`}
                          className="flex flex-col sm:flex-row flex-1 min-w-0"
                        >
                          <div className="relative w-full sm:w-56 aspect-video shrink-0 bg-[#0A0A0F]">
                            {still ? (
                              <Image src={still} alt={ep.name} fill sizes="224px" className="object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[#2A2A3A]">
                                <Play size={32} />
                              </div>
                            )}
                            <div className="absolute top-2 left-2 text-[10px] font-bold text-white bg-black/70 backdrop-blur px-2 py-0.5 rounded-full">
                              E{ep.episode_number}
                            </div>
                            {ep.vote_average > 0 && (
                              <div className="absolute bottom-2 right-2 inline-flex items-center gap-1 text-[10px] font-semibold text-white bg-black/70 backdrop-blur px-2 py-0.5 rounded-full">
                                <Star size={10} className="fill-[#F5A623] text-[#F5A623]" /> {ep.vote_average.toFixed(1)}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 p-4 space-y-1.5">
                            <div className="flex items-center gap-3 text-[11px] text-[#6B6B80]">
                              {ep.air_date && <span>{ep.air_date}</span>}
                              {ep.runtime ? <span>· {ep.runtime}m</span> : null}
                            </div>
                            <h3 className="text-[15px] font-semibold text-white group-hover:text-[#E50914] transition-colors line-clamp-1">
                              {ep.name}
                            </h3>
                            {ep.overview && (
                              <p className="text-xs text-[#A0A0B0] leading-relaxed line-clamp-2">
                                {ep.overview}
                              </p>
                            )}
                          </div>
                        </Link>
                        <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                          <SeriesWatchActions scope={epScope} size="sm" />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
