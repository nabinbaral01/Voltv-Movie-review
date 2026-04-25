import Image from "next/image";
import Link from "next/link";
import { Crown, Flame, Trophy } from "lucide-react";
import { prisma } from "@/lib/prisma";

async function getTopUsers() {
  try {
    const topUsers = await prisma.user.findMany({
      take: 5,
      orderBy: { xp_points: "desc" },
      select: {
        id: true,
        username: true,
        avatar_url: true,
        xp_points: true,
        streak_count: true,
        subscription_tier: true,
        _count: { select: { watch_history: true } },
      },
    });
    return topUsers;
  } catch {
    return [];
  }
}

type TopUser = Awaited<ReturnType<typeof getTopUsers>>[number];

function rankStyle(rank: number) {
  if (rank === 1) return { glow: "shadow-[0_0_20px_rgba(245,166,35,0.5)]", ring: "ring-[#F5A623]", badge: "from-[#F5A623] to-[#F97316]", badgeText: "text-black" };
  if (rank === 2) return { glow: "shadow-[0_0_14px_rgba(192,192,192,0.3)]",  ring: "ring-[#D0D0D8]", badge: "from-[#D0D0D8] to-[#A0A0B0]", badgeText: "text-black" };
  if (rank === 3) return { glow: "shadow-[0_0_14px_rgba(205,127,50,0.3)]",  ring: "ring-[#CD7F32]", badge: "from-[#CD7F32] to-[#8B4513]", badgeText: "text-white" };
  return { glow: "", ring: "ring-[#1E1E2E]", badge: "from-[#2A2A3A] to-[#1A1A28]", badgeText: "text-[#A0A0B0]" };
}

export default async function WeeklyLeaderboard() {
  const users = await getTopUsers();

  return (
    <div className="rounded-2xl overflow-hidden border border-[#1E1E2E] bg-gradient-to-b from-[#12121A] to-[#0A0A0F]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#1E1E2E]/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#F5A623] to-[#F97316] flex items-center justify-center shadow-[0_0_16px_rgba(245,166,35,0.4)]">
            <Trophy size={13} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white leading-none">Top Critics</h3>
            <p className="text-[10px] text-[#6B6B80] mt-0.5">Ranked by XP</p>
          </div>
        </div>
        <Link href="/leaderboard" className="text-[11px] font-semibold text-[#E50914] hover:text-[#FF1F2E] transition-colors">
          Full board →
        </Link>
      </div>

      {users.length === 0 ? (
        <p className="text-sm text-[#505060] text-center py-8">
          Be the first on the leaderboard!
        </p>
      ) : (
        <>
          {/* #1 — hero card */}
          {users[0] && <HeroCard user={users[0]} />}

          {/* #2–5 — compact rows */}
          <ol className="px-2 pb-2 space-y-1">
            {users.slice(1).map((user, i) => (
              <RankRow key={user.id} user={user} rank={i + 2} />
            ))}
          </ol>
        </>
      )}
    </div>
  );
}

function Avatar({ user, size, rank }: { user: TopUser; size: number; rank: number }) {
  const s = rankStyle(rank);
  const initial = user.username[0]?.toUpperCase() ?? "?";
  return (
    <div
      className={`relative rounded-full overflow-hidden ring-2 ${s.ring} ${s.glow} bg-gradient-to-br from-[#E50914] to-[#8B5CF6] flex items-center justify-center shrink-0`}
      style={{ width: size, height: size }}
    >
      {user.avatar_url ? (
        <Image
          src={user.avatar_url}
          alt={user.username}
          width={size}
          height={size}
          className="object-cover w-full h-full"
        />
      ) : (
        <span
          className="font-bold text-white"
          style={{ fontSize: Math.round(size * 0.42) }}
        >
          {initial}
        </span>
      )}
    </div>
  );
}

function HeroCard({ user }: { user: TopUser }) {
  return (
    <Link
      href={`/profile/${user.username}`}
      className="relative block p-4 border-b border-[#1E1E2E]/60 group"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-[#F5A623]/10 via-transparent to-[#E50914]/5 pointer-events-none" />
      <div className="relative flex items-center gap-3">
        <div className="relative">
          <Avatar user={user} size={52} rank={1} />
          <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-gradient-to-br from-[#F5A623] to-[#F97316] flex items-center justify-center shadow-[0_0_10px_rgba(245,166,35,0.6)]">
            <Crown size={12} className="text-black fill-black" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-[15px] font-bold text-white truncate group-hover:text-[#E50914] transition-colors">
              @{user.username}
            </div>
            <span className="text-[9px] font-bold text-black bg-[#F5A623] px-1.5 py-0.5 rounded-full leading-none">
              #1
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-[11px] text-[#A0A0B0]">
            <span className="font-semibold text-white">{user.xp_points.toLocaleString()}</span>
            <span className="text-[10px] uppercase tracking-wider text-[#6B6B80]">XP</span>
            {user.streak_count > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[#F97316] font-semibold">
                <Flame size={11} className="fill-[#F97316]" />
                {user.streak_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function RankRow({ user, rank }: { user: TopUser; rank: number }) {
  const s = rankStyle(rank);
  return (
    <li>
      <Link
        href={`/profile/${user.username}`}
        className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.03] transition-colors group"
      >
        <div
          className={`w-6 h-6 rounded-lg bg-gradient-to-br ${s.badge} flex items-center justify-center text-[11px] font-extrabold ${s.badgeText} shrink-0`}
        >
          {rank}
        </div>
        <Avatar user={user} size={32} rank={rank} />
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-white truncate group-hover:text-[#E50914] transition-colors">
            @{user.username}
          </div>
          <div className="flex items-center gap-2 text-[10.5px] text-[#A0A0B0] mt-0.5">
            <span className="font-medium text-white">{user.xp_points.toLocaleString()}</span>
            <span className="text-[#6B6B80]">XP</span>
            {user.streak_count > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[#F97316] font-semibold">
                <Flame size={9} className="fill-[#F97316]" />
                {user.streak_count}
              </span>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}
