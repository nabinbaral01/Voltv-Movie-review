import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import Topbar from "@/components/layout/Topbar";
import Sidebar, { BottomNav } from "@/components/layout/Sidebar";
import { TierBadge, LevelBadge } from "@/components/ui/Badge";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import { formatCount } from "@/utils/formatters";
import { Crown, Trophy, Medal, Flame, Film, MessageSquare, TrendingUp, CalendarClock } from "lucide-react";
import MovieCardComponent from "@/components/movie/MovieCard";
import { getUpcomingForYou } from "@/lib/upcoming-for-you";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Leaderboard" };

async function getLeaderboard() {
  return prisma.user.findMany({
    take:    50,
    where:   { is_banned: false },
    orderBy: { xp_points: "desc" },
    select: {
      id: true, username: true, avatar_url: true,
      xp_points: true, streak_count: true, level: true,
      subscription_tier: true, is_blue_tick: true,
      _count: { select: { watch_history: true, reviews: true } },
    },
  });
}

export default async function LeaderboardPage() {
  const [users, me] = await Promise.all([
    getLeaderboard(),
    getSessionUser(),
  ]);

  const upcoming = await getUpcomingForYou(me?.id ?? null);

  const meRank = me
    ? users.findIndex((u) => u.id === me.id)
    : -1;

  const podium = users.slice(0, 3);
  const rest   = users.slice(3);

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Topbar />
      <div className="flex pt-14">
        <div className="hidden lg:block w-[240px] shrink-0"><Sidebar /></div>

        <main className="flex-1 min-w-0 max-w-3xl mx-auto pb-24 lg:pb-10">
          {/* Hero header */}
          <div className="relative overflow-hidden px-4 sm:px-6 pt-6 pb-8 border-b border-[#1E1E2E]">
            <div className="absolute inset-0 bg-gradient-to-br from-[#F5A623]/10 via-transparent to-[#E50914]/10 pointer-events-none" />
            <div className="relative flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[#F5A623] to-[#E50914] flex items-center justify-center shadow-lg shadow-[#F5A623]/20">
                <Trophy size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">Leaderboard</h1>
                <p className="text-xs sm:text-sm text-[#A0A0B0]">Top critics ranked by XP</p>
              </div>
            </div>
          </div>

          {/* Podium */}
          {podium.length >= 3 && (
            <section className="px-4 sm:px-6 pt-6">
              <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
                <PodiumCard user={podium[1]} rank={2} />
                <PodiumCard user={podium[0]} rank={1} />
                <PodiumCard user={podium[2]} rank={3} />
              </div>
            </section>
          )}

          {/* Your rank strip */}
          {me && meRank !== -1 && (
            <section className="px-4 sm:px-6 pt-6">
              <div className="flex items-center gap-3 p-3 sm:p-4 rounded-[12px] bg-gradient-to-r from-[#E50914]/10 via-[#E50914]/5 to-transparent border border-[#E50914]/20">
                <div className="w-10 h-10 rounded-full bg-[#E50914]/20 border border-[#E50914]/40 flex items-center justify-center text-[#E50914] font-bold text-sm shrink-0">
                  #{meRank + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#A0A0B0] leading-none mb-0.5">Your rank</p>
                  <p className="text-sm font-semibold text-white truncate">
                    @{me.username}
                    {meRank === 0 && <span className="ml-1.5 text-[#F5A623]">— #1 champion</span>}
                    {meRank > 0 && meRank < 3 && <span className="ml-1.5 text-[#F5A623]">— podium</span>}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono font-bold text-[#F5A623] text-base leading-none">
                    {formatCount(me.xp_points)}
                  </div>
                  <div className="text-[10px] text-[#505060] uppercase tracking-wider mt-0.5">XP</div>
                </div>
              </div>
            </section>
          )}

          {/* Upcoming, matched to what this user actually watches */}
          {upcoming.items.length > 0 && (
            <section className="px-4 sm:px-6 pt-6">
              <div className="flex items-center justify-between mb-3 px-1 gap-3">
                <h2 className="text-xs font-semibold text-[#505060] uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarClock size={12} />
                  {upcoming.personalised ? "Upcoming for you" : "Upcoming worldwide"}
                </h2>
                {upcoming.personalised && (
                  <span className="text-[10px] text-[#505060] truncate">
                    based on your {upcoming.genres.slice(0, 2).join(" & ")}
                  </span>
                )}
              </div>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                {upcoming.items.map((m) => (
                  <div key={m.tmdb_id} className="shrink-0">
                    <MovieCardComponent movie={m} size="sm" showScore={false} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Full table */}
          <section className="px-4 sm:px-6 pt-6">
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-xs font-semibold text-[#505060] uppercase tracking-wider">
                Top {users.length}
              </h2>
              <span className="text-[10px] text-[#505060] flex items-center gap-1">
                <TrendingUp size={11} /> All-time
              </span>
            </div>

            {users.length === 0 ? (
              <div className="text-center py-16 rounded-[12px] border border-[#1E1E2E] bg-[#12121A]">
                <p className="text-base font-semibold text-[#A0A0B0] mb-1">No users yet</p>
                <p className="text-xs text-[#505060]">Be the first to earn XP</p>
              </div>
            ) : (
              <ol className="rounded-[14px] overflow-hidden border border-[#1E1E2E] bg-[#0E0E15] divide-y divide-[#1E1E2E]">
                {rest.map((user, i) => {
                  const rank = i + 4;
                  const isMe = me?.id === user.id;
                  return (
                    <li key={user.id}>
                      <Link
                        href={`/profile/${user.username}`}
                        className={`flex items-center gap-3 px-3 sm:px-4 py-3 transition-colors ${
                          isMe
                            ? "bg-[#E50914]/[0.06] hover:bg-[#E50914]/[0.10]"
                            : "hover:bg-white/[0.03]"
                        }`}
                      >
                        <span className="w-7 sm:w-9 text-center text-xs sm:text-sm font-mono font-semibold text-[#505060] shrink-0">
                          #{rank}
                        </span>

                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-gradient-to-br from-[#E50914] to-[#8B5CF6] flex items-center justify-center text-sm font-bold text-white shrink-0 border border-[#1E1E2E]">
                          {user.avatar_url ? (
                            <Image
                              src={user.avatar_url}
                              alt={user.username}
                              width={40}
                              height={40}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            user.username[0]?.toUpperCase()
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-white truncate">
                              @{user.username}
                            </span>
                            {user.is_blue_tick && <VerifiedBadge size={14} />}
                            <TierBadge tier={user.subscription_tier as "free" | "pro" | "legend"} />
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-[11px] text-[#505060]">
                            <LevelBadge xp={user.xp_points} />
                            <span className="flex items-center gap-1">
                              <Film size={10} /> {formatCount(user._count.watch_history)}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageSquare size={10} /> {formatCount(user._count.reviews)}
                            </span>
                            {user.streak_count > 0 && (
                              <span className="flex items-center gap-1 text-[#FF6B35]">
                                <Flame size={10} /> {user.streak_count}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-mono font-bold text-[#F5A623] text-sm leading-none">
                            {formatCount(user.xp_points)}
                          </div>
                          <div className="text-[10px] text-[#505060] uppercase tracking-wider mt-0.5">XP</div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

function PodiumCard({
  user,
  rank,
}: {
  user: {
    id: string;
    username: string;
    avatar_url: string | null;
    xp_points: number;
    streak_count: number;
    subscription_tier: string;
    is_blue_tick: boolean;
  };
  rank: 1 | 2 | 3;
}) {
  const config = {
    1: {
      pedestal: "from-[#F5A623] to-[#B8860B]",
      glow:     "shadow-[0_0_24px_rgba(245,166,35,0.35)]",
      ring:     "ring-[#F5A623]",
      icon:     <Crown size={14} className="text-white" />,
      label:    "Champion",
      size:     "w-20 h-20 sm:w-24 sm:h-24",
      height:   "h-24 sm:h-28",
    },
    2: {
      pedestal: "from-[#C0C5CE] to-[#6C7A89]",
      glow:     "shadow-[0_0_16px_rgba(192,197,206,0.25)]",
      ring:     "ring-[#C0C5CE]",
      icon:     <Medal size={12} className="text-white" />,
      label:    "2nd",
      size:     "w-16 h-16 sm:w-20 sm:h-20",
      height:   "h-16 sm:h-20",
    },
    3: {
      pedestal: "from-[#CD7F32] to-[#6B3E11]",
      glow:     "shadow-[0_0_16px_rgba(205,127,50,0.25)]",
      ring:     "ring-[#CD7F32]",
      icon:     <Medal size={12} className="text-white" />,
      label:    "3rd",
      size:     "w-16 h-16 sm:w-20 sm:h-20",
      height:   "h-14 sm:h-16",
    },
  }[rank];

  return (
    <Link
      href={`/profile/${user.username}`}
      className="flex flex-col items-center group"
    >
      {/* Avatar with crown */}
      <div className="relative mb-2">
        <div className={`${config.size} rounded-full overflow-hidden bg-gradient-to-br from-[#E50914] to-[#8B5CF6] flex items-center justify-center text-xl font-bold text-white ring-2 ${config.ring} ${config.glow} group-hover:scale-105 transition-transform`}>
          {user.avatar_url ? (
            <Image src={user.avatar_url} alt={user.username} width={96} height={96} className="object-cover w-full h-full" />
          ) : (
            user.username[0]?.toUpperCase()
          )}
        </div>
        <span className={`absolute -top-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-br ${config.pedestal} flex items-center justify-center shadow-md`}>
          {config.icon}
        </span>
        {user.is_blue_tick && (
          <span className="absolute -bottom-0.5 -right-0.5 bg-[#0A0A0F] rounded-full p-0.5">
            <VerifiedBadge size={14} />
          </span>
        )}
      </div>

      {/* Name */}
      <p className="text-xs sm:text-sm font-semibold text-white truncate max-w-full px-1 text-center">
        @{user.username}
      </p>
      <p className="font-mono font-bold text-[#F5A623] text-sm sm:text-base leading-none mt-1">
        {formatCount(user.xp_points)}
      </p>
      <p className="text-[10px] text-[#505060] uppercase tracking-wider mb-2">XP</p>

      {/* Pedestal */}
      <div className={`w-full ${config.height} rounded-t-[10px] bg-gradient-to-b ${config.pedestal} relative flex items-start justify-center pt-2`}>
        <span className="text-white font-bold text-sm sm:text-base drop-shadow">
          {config.label}
        </span>
      </div>
    </Link>
  );
}
