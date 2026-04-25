import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Topbar from "@/components/layout/Topbar";
import Sidebar, { BottomNav } from "@/components/layout/Sidebar";
import { getTVById, getTVEpisode, profileUrl } from "@/lib/tmdb";
import { readCommentsByScope, episodeKey } from "@/lib/comments";
import ScoreGauge from "@/app/movie/[id]/_components/ScoreGauge";
import ScoreMeter from "@/app/movie/[id]/_components/ScoreMeter";
import CommentSection from "@/app/movie/[id]/_components/CommentSection";
import SeriesWatchActions from "@/app/tv/_components/SeriesWatchActions";
import { ChevronLeft, Calendar, Clock, Star } from "lucide-react";

export default async function EpisodePage({
  params,
}: {
  params: Promise<{ id: string; seasonNumber: string; episodeNumber: string }>;
}) {
  const { id, seasonNumber, episodeNumber } = await params;
  const tvId = parseInt(id, 10);
  const sn   = parseInt(seasonNumber, 10);
  const en   = parseInt(episodeNumber, 10);
  if (isNaN(tvId) || isNaN(sn) || isNaN(en)) notFound();

  let show, ep;
  try {
    [show, ep] = await Promise.all([getTVById(tvId), getTVEpisode(tvId, sn, en)]);
  } catch {
    notFound();
  }

  const scope    = episodeKey(tvId, sn, en);
  const comments = await readCommentsByScope(scope);

  const still = ep.still_path ? `https://image.tmdb.org/t/p/w780${ep.still_path}` : null;
  const director = ep.crew?.find((c) => c.job === "Director");
  const writer   = ep.crew?.find((c) => c.department === "Writing");
  const guests   = ep.guest_stars?.slice(0, 8) ?? [];

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Topbar />
      <div className="flex pt-14">
        <div className="hidden lg:block w-[240px] shrink-0"><Sidebar /></div>

        <main className="flex-1 min-w-0 pb-24 lg:pb-8">
          {/* Hero still */}
          {still && (
            <div className="relative w-full aspect-[16/7] max-h-[420px] overflow-hidden">
              <Image src={still} alt={ep.name} fill priority sizes="100vw" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F] via-[#0A0A0F]/40 to-transparent" />
            </div>
          )}

          <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-16 relative z-10 space-y-6">
            <Link
              href={`/tv/${tvId}/season/${sn}`}
              className="inline-flex items-center gap-1 text-sm text-[#A0A0B0] hover:text-white transition-colors"
            >
              <ChevronLeft size={16} /> Back to Season {sn}
            </Link>

            <div className="grid lg:grid-cols-[1fr_320px] gap-6">
              {/* MAIN */}
              <div className="space-y-8 min-w-0">
                {/* Title block */}
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-[#93C5FD] uppercase tracking-wider">
                    {show.name} · S{sn} · E{ep.episode_number}
                  </div>
                  <div className="flex items-start gap-3 flex-wrap">
                    <h1 className="font-display text-3xl sm:text-5xl text-white leading-tight">
                      {ep.name}
                    </h1>
                    <div className="pt-2">
                      <SeriesWatchActions scope={scope} />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#A0A0B0]">
                    {ep.air_date && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={12} /> {ep.air_date}
                      </span>
                    )}
                    {ep.runtime && (
                      <span className="inline-flex items-center gap-1">
                        <Clock size={12} /> {ep.runtime}m
                      </span>
                    )}
                    {ep.vote_average > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Star size={11} className="fill-[#F5A623] text-[#F5A623]" />
                        {ep.vote_average.toFixed(1)} ({ep.vote_count})
                      </span>
                    )}
                  </div>
                </div>

                {/* Overview + credits */}
                <section className="card p-5 space-y-3">
                  <h2 className="text-sm font-semibold text-[#A0A0B0] uppercase tracking-wide">Overview</h2>
                  {ep.overview ? (
                    <p className="text-sm text-[#A0A0B0] leading-relaxed">{ep.overview}</p>
                  ) : (
                    <p className="text-sm text-[#505060]">No overview available.</p>
                  )}
                  <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                    <InfoCell label="Directed by" value={director?.name ?? "—"} />
                    <InfoCell label="Written by"  value={writer?.name ?? "—"} />
                  </dl>
                </section>

                {/* Guest stars */}
                {guests.length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold text-[#A0A0B0] uppercase tracking-wide mb-3">Guest stars</h2>
                    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                      {guests.map((p) => (
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

                {/* Score Meter */}
                <ScoreMeter tmdbId={ep.id} initialComments={comments} scope={scope} />

                {/* Reviews */}
                <CommentSection tmdbId={ep.id} username="admin" scope={scope} />
              </div>

              {/* SIDEBAR */}
              <aside className="space-y-4">
                <div className="card p-5 flex flex-col items-center gap-4">
                  <ScoreGauge tmdbId={ep.id} initialComments={comments} scope={scope} />
                  <a
                    href="#comments"
                    className="w-full text-center bg-[#22C55E] hover:bg-[#16A34A] text-black font-semibold text-sm py-2 rounded-full transition-colors"
                  >
                    + Add Review
                  </a>
                </div>
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
