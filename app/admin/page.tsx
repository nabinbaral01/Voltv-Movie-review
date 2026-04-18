import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import AdminLogoutButton from "./_components/AdminLogoutButton";
import AdminUserActions from "./_components/AdminUserActions";
import AdminPostActions from "./_components/AdminPostActions";
import ActivityChart, { type DailyPoint } from "./_components/ActivityChart";
import { formatCount, timeAgo } from "@/utils/formatters";
import {
  Shield, Users, Film, MessageSquare, Star, AlertTriangle,
  Crown, CheckCircle2, XCircle, Activity, Swords,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dashboard — VOLTV",
  robots: { index: false, follow: false },
};

const MAIN_ADMIN = process.env.ADMIN_USERNAME ?? "";

async function getStats() {
  const DAY  = new Date(Date.now() - 86_400_000);
  const WEEK = new Date(Date.now() - 86_400_000 * 7);
  const [
    users, usersDay, usersWeek,
    movies, reviews, reviewsDay,
    ratings, reportsPending, bannedUsers, proUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { created_at: { gte: DAY  } } }),
    prisma.user.count({ where: { created_at: { gte: WEEK } } }),
    prisma.movie.count(),
    prisma.review.count(),
    prisma.review.count({ where: { created_at: { gte: DAY } } }),
    prisma.rating.count(),
    prisma.report.count({ where: { status: "pending" } }),
    prisma.user.count({ where: { is_banned: true } }),
    prisma.user.count({ where: { subscription_tier: { not: "free" } } }),
  ]);
  return { users, usersDay, usersWeek, movies, reviews, reviewsDay, ratings, reportsPending, bannedUsers, proUsers };
}

async function getDailyActivity(): Promise<DailyPoint[]> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - 29); // 30-day window

  const [postRows, userRows] = await Promise.all([
    prisma.$queryRaw<{ day: Date; count: bigint }[]>`
      SELECT date_trunc('day', created_at) AS day, COUNT(*)::bigint AS count
      FROM reviews
      WHERE created_at >= ${start}
      GROUP BY 1
    `,
    prisma.$queryRaw<{ day: Date; count: bigint }[]>`
      SELECT date_trunc('day', created_at) AS day, COUNT(*)::bigint AS count
      FROM users
      WHERE created_at >= ${start}
      GROUP BY 1
    `,
  ]);

  const postMap = new Map(postRows.map((r) => [r.day.toISOString().slice(0, 10), Number(r.count)]));
  const userMap = new Map(userRows.map((r) => [r.day.toISOString().slice(0, 10), Number(r.count)]));

  const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const out: DailyPoint[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);
    out.push({
      iso,
      date:  fmt.format(d),
      posts: postMap.get(iso) ?? 0,
      users: userMap.get(iso) ?? 0,
    });
  }
  return out;
}

export default async function AdminPage() {
  const [stats, dailyActivity, recentUsers, allAdmins, recentPosts, pendingReports] = await Promise.all([
    getStats(),
    getDailyActivity(),
    prisma.user.findMany({
      take:    25,
      orderBy: { created_at: "desc" },
      select: {
        id: true, username: true, avatar_url: true, created_at: true,
        is_admin: true, is_banned: true, is_blue_tick: true,
        subscription_tier: true, xp_points: true, level: true,
      },
    }),
    prisma.user.findMany({
      where:   { is_admin: true },
      orderBy: { username: "asc" },
      select: { id: true, username: true, avatar_url: true, created_at: true },
    }),
    prisma.review.findMany({
      take:    15,
      orderBy: { created_at: "desc" },
      include: {
        user:  { select: { username: true, avatar_url: true } },
        movie: { select: { title: true } },
      },
    }),
    prisma.report.findMany({
      where:   { status: "pending" },
      take:    10,
      orderBy: { created_at: "desc" },
      include: {
        reporter: { select: { username: true } },
        review:   { select: { id: true, content: true, user: { select: { username: true } } } },
      },
    }),
  ]);

  const statCards = [
    {
      label:    "Total Users",
      value:    stats.users,
      sub:      `+${stats.usersDay} today · +${stats.usersWeek} this week`,
      icon:     <Users size={16} />,
      tint:     "from-[#3B82F6] to-[#8B5CF6]",
    },
    {
      label:    "Movies",
      value:    stats.movies,
      sub:      "Catalog",
      icon:     <Film size={16} />,
      tint:     "from-[#8B5CF6] to-[#E50914]",
    },
    {
      label:    "Posts",
      value:    stats.reviews,
      sub:      `+${stats.reviewsDay} in 24h`,
      icon:     <MessageSquare size={16} />,
      tint:     "from-[#10B981] to-[#3B82F6]",
    },
    {
      label:    "Ratings",
      value:    stats.ratings,
      sub:      "All-time",
      icon:     <Star size={16} />,
      tint:     "from-[#F5A623] to-[#E50914]",
    },
    {
      label:    "Pro users",
      value:    stats.proUsers,
      sub:      `${stats.users ? Math.round(stats.proUsers / stats.users * 100) : 0}% conversion`,
      icon:     <Crown size={16} />,
      tint:     "from-[#F5A623] to-[#8B5CF6]",
    },
    {
      label:    "Pending reports",
      value:    stats.reportsPending,
      sub:      stats.reportsPending > 0 ? "Needs review" : "All clear",
      icon:     <AlertTriangle size={16} />,
      tint:     stats.reportsPending > 0
                 ? "from-[#E50914] to-[#B91C1C]"
                 : "from-[#475569] to-[#1E293B]",
      alert:    stats.reportsPending > 0,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      {/* Admin topbar */}
      <header className="sticky top-0 z-50 border-b border-[#1E1E2E] bg-[#0A0A0F]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-[8px] bg-gradient-to-br from-[#E50914] to-[#8B5CF6] flex items-center justify-center shadow-md shadow-[#E50914]/20">
              <Shield size={16} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-white leading-none">VOLTV Admin</div>
              <div className="text-[10px] text-[#505060] mt-0.5">Control Panel</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/debates"
              className="text-xs text-white px-3 h-8 flex items-center gap-1.5 rounded-[8px] border border-[#E50914]/30 bg-[#E50914]/10 hover:bg-[#E50914]/20 font-semibold transition-colors"
            >
              <Swords size={13} /> Debates
            </Link>
            <Link
              href="/"
              className="text-xs text-[#A0A0B0] hover:text-white px-3 h-8 flex items-center rounded-[8px] hover:bg-white/[0.06] transition-colors"
            >
              ← Back to site
            </Link>
            <AdminLogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* Hero row */}
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
          <p className="text-sm text-[#A0A0B0]">Real-time platform health &amp; moderation</p>
        </div>

        {/* Stat grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {statCards.map((s) => (
            <div
              key={s.label}
              className={`relative rounded-[12px] p-4 border bg-[#0E0E15] overflow-hidden ${
                s.alert ? "border-[#E50914]/40" : "border-[#1E1E2E]"
              }`}
            >
              <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-30 bg-gradient-to-br ${s.tint}`} />
              <div className={`relative w-8 h-8 rounded-[8px] bg-gradient-to-br ${s.tint} flex items-center justify-center text-white mb-3`}>
                {s.icon}
              </div>
              <div className="text-[11px] text-[#A0A0B0] uppercase tracking-wider font-semibold">{s.label}</div>
              <div className="text-xl font-bold text-white mt-0.5 font-mono">{formatCount(s.value)}</div>
              <div className="text-[10px] text-[#505060] mt-1 truncate">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Activity graph */}
        <ActivityChart data={dailyActivity} />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Users table */}
          <section className="xl:col-span-2 rounded-[14px] border border-[#1E1E2E] bg-[#0E0E15] overflow-hidden">
            <header className="flex items-center justify-between px-4 py-3 border-b border-[#1E1E2E]">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Users size={14} /> Recent users
                <span className="text-[10px] text-[#505060] font-mono">{recentUsers.length}</span>
              </h2>
              <div className="text-[10px] text-[#505060]">
                Banned: <span className="text-red-400">{stats.bannedUsers}</span>
              </div>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/[0.02]">
                  <tr className="text-[10px] uppercase tracking-wider text-[#505060]">
                    <th className="text-left px-4 py-2.5 font-medium">User</th>
                    <th className="text-left px-4 py-2.5 font-medium">Joined</th>
                    <th className="text-left px-4 py-2.5 font-medium">Tier</th>
                    <th className="text-left px-4 py-2.5 font-medium">Status</th>
                    <th className="text-right px-4 py-2.5 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E1E2E]">
                  {recentUsers.map((u) => {
                    const isMain = u.username === MAIN_ADMIN;
                    return (
                      <tr key={u.id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3">
                          <Link href={`/profile/${u.username}`} target="_blank" className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-[#E50914] to-[#8B5CF6] flex items-center justify-center text-xs font-bold text-white shrink-0">
                              {u.avatar_url ? (
                                <Image src={u.avatar_url} alt={u.username} width={32} height={32} className="object-cover w-full h-full" />
                              ) : (
                                u.username[0]?.toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-semibold text-white truncate">@{u.username}</span>
                                {isMain && <span className="text-[9px] px-1 rounded bg-[#F5A623]/20 text-[#F5A623] border border-[#F5A623]/30 font-bold">MAIN</span>}
                              </div>
                              <div className="text-[10px] text-[#505060]">Lv.{u.level} · {formatCount(u.xp_points)} XP</div>
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-xs text-[#A0A0B0] whitespace-nowrap">
                          {timeAgo(u.created_at.toISOString())}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            u.subscription_tier === "legend"
                              ? "bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30"
                            : u.subscription_tier === "pro"
                              ? "bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/30"
                              : "bg-white/[0.04] text-[#A0A0B0] border border-[#1E1E2E]"
                          }`}>
                            {u.subscription_tier}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {u.is_banned ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-red-400">
                              <XCircle size={11} /> Banned
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                              <CheckCircle2 size={11} /> Active
                            </span>
                          )}
                          {u.is_admin && (
                            <span className="ml-1.5 inline-flex items-center gap-1 text-[10px] text-[#8B5CF6]">
                              <Shield size={11} /> Admin
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <AdminUserActions
                            userId={u.id}
                            username={u.username}
                            isAdmin={u.is_admin}
                            isBanned={u.is_banned}
                            isMainAdmin={isMain}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Admin team */}
          <section className="rounded-[14px] border border-[#1E1E2E] bg-[#0E0E15] overflow-hidden">
            <header className="px-4 py-3 border-b border-[#1E1E2E]">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Shield size={14} /> Admin team
                <span className="text-[10px] text-[#505060] font-mono">{allAdmins.length}</span>
              </h2>
            </header>
            <ul className="divide-y divide-[#1E1E2E]">
              {allAdmins.map((a) => (
                <li key={a.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-[#8B5CF6] to-[#E50914] flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {a.avatar_url ? (
                      <Image src={a.avatar_url} alt={a.username} width={36} height={36} className="object-cover w-full h-full" />
                    ) : (
                      a.username[0]?.toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-white truncate">@{a.username}</span>
                      {a.username === MAIN_ADMIN && (
                        <span className="text-[9px] px-1 rounded bg-[#F5A623]/20 text-[#F5A623] border border-[#F5A623]/30 font-bold">MAIN</span>
                      )}
                    </div>
                    <div className="text-[10px] text-[#505060]">Since {timeAgo(a.created_at.toISOString())}</div>
                  </div>
                </li>
              ))}
              {allAdmins.length === 0 && (
                <li className="px-4 py-6 text-center text-xs text-[#505060]">No admins yet</li>
              )}
            </ul>
          </section>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Recent posts */}
          <section className="rounded-[14px] border border-[#1E1E2E] bg-[#0E0E15] overflow-hidden">
            <header className="flex items-center justify-between px-4 py-3 border-b border-[#1E1E2E]">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <MessageSquare size={14} /> Recent posts
              </h2>
              <span className="text-[10px] text-[#505060] flex items-center gap-1">
                <Activity size={11} /> {stats.reviewsDay} today
              </span>
            </header>
            <ul className="divide-y divide-[#1E1E2E]">
              {recentPosts.map((p) => (
                <li key={p.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Link href={`/profile/${p.user.username}`} target="_blank" className="text-xs font-semibold text-white hover:text-[#E50914]">
                          @{p.user.username}
                        </Link>
                        <span className="text-[10px] text-[#505060]">·</span>
                        <span className="text-[10px] text-[#505060]">{timeAgo(p.created_at.toISOString())}</span>
                        {p.is_hidden && (
                          <span className="text-[9px] px-1 rounded bg-red-500/15 text-red-400 border border-red-500/30">HIDDEN</span>
                        )}
                      </div>
                      <p className="text-sm text-[#E5E5EA] mt-1 line-clamp-2">{p.content}</p>
                      {p.movie && (
                        <p className="text-[10px] text-[#8B5CF6] mt-1">→ {p.movie.title}</p>
                      )}
                    </div>
                    <AdminPostActions postId={p.id} isHidden={p.is_hidden} />
                  </div>
                </li>
              ))}
              {recentPosts.length === 0 && (
                <li className="px-4 py-8 text-center text-xs text-[#505060]">No posts yet</li>
              )}
            </ul>
          </section>

          {/* Reports */}
          <section className="rounded-[14px] border border-[#1E1E2E] bg-[#0E0E15] overflow-hidden">
            <header className="flex items-center justify-between px-4 py-3 border-b border-[#1E1E2E]">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <AlertTriangle size={14} className={stats.reportsPending > 0 ? "text-red-400" : ""} />
                Pending reports
              </h2>
              <span className="text-[10px] text-[#505060] font-mono">{pendingReports.length}</span>
            </header>
            <ul className="divide-y divide-[#1E1E2E]">
              {pendingReports.map((r) => (
                <li key={r.id} className="px-4 py-3">
                  <div className="flex items-start gap-2 mb-1">
                    <span className="text-[10px] px-1.5 rounded bg-red-500/15 text-red-400 border border-red-500/30 font-semibold">{r.reason}</span>
                    <span className="text-[10px] text-[#505060]">
                      by @{r.reporter?.username ?? "?"}
                    </span>
                  </div>
                  {r.review && (
                    <p className="text-xs text-[#A0A0B0] line-clamp-2">
                      &quot;{r.review.content}&quot; — <span className="text-white">@{r.review.user.username}</span>
                    </p>
                  )}
                </li>
              ))}
              {pendingReports.length === 0 && (
                <li className="px-4 py-8 text-center text-xs text-[#505060]">All clear — no pending reports</li>
              )}
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
