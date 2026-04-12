import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { cn } from "@/utils/formatters";

async function getTopUsers() {
  try {
    const start = new Date();
    start.setDate(start.getDate() - start.getDay()); // Monday
    start.setHours(0, 0, 0, 0);

    // Count watch history entries this week
    const topUsers = await prisma.user.findMany({
      take: 5,
      orderBy: { xp_points: "desc" },
      select: {
        id: true, username: true, xp_points: true,
        streak_count: true, subscription_tier: true,
        _count: { select: { watch_history: true } },
      },
    });

    return topUsers;
  } catch {
    return [];
  }
}

const RANK_ICONS = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];

export default async function WeeklyLeaderboard() {
  const users = await getTopUsers();

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-white">🏆 Top Critics</h3>
        <Link href="/leaderboard" className="text-xs text-[#E50914] hover:underline">
          Full board →
        </Link>
      </div>

      {users.length === 0 ? (
        <p className="text-sm text-[#505060] text-center py-4">
          Be the first on the leaderboard!
        </p>
      ) : (
        <div className="space-y-2">
          {users.map((user: typeof users[number], i: number) => (
            <Link
              key={user.id}
              href={`/profile/${user.username}`}
              className="flex items-center gap-3 p-2 rounded-[8px] hover:bg-white/[0.04] transition-all group"
            >
              <span className="text-base w-6 shrink-0">{RANK_ICONS[i]}</span>
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#E50914] to-[#8B5CF6] flex items-center justify-center text-xs font-bold shrink-0">
                {user.username[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white truncate group-hover:text-[#E50914] transition-colors">
                  @{user.username}
                </div>
                <div className="text-xs text-[#505060]">
                  {user.xp_points.toLocaleString()} XP
                  {user.streak_count > 0 && (
                    <span className="streak-active ml-1">🔥{user.streak_count}</span>
                  )}
                </div>
              </div>
              {i === 0 && (
                <span className="text-xs text-[#F5A623] font-bold shrink-0">#1</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
