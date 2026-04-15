import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import Link from "next/link";
import Image from "next/image";
import Topbar from "@/components/layout/Topbar";
import Sidebar, { BottomNav } from "@/components/layout/Sidebar";
import PostComposer from "@/components/feed/PostComposer";
import PostCard from "@/components/feed/PostCard";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import { LevelBadge } from "@/components/ui/Badge";
import { formatCount } from "@/utils/formatters";
import { Flame, Users, Sparkles } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Social" };

type Tab = "for-you" | "following";

export default async function SocialPage(
  { searchParams }: { searchParams: Promise<{ tab?: string }> },
) {
  const sp = await searchParams;
  const tab: Tab = sp.tab === "following" ? "following" : "for-you";

  const me = await getSessionUser();

  // Build post filter based on tab
  let followingIds: string[] = [];
  if (me && tab === "following") {
    const rows = await prisma.follow.findMany({
      where:  { follower_id: me.id },
      select: { following_id: true },
    });
    followingIds = rows.map((r) => r.following_id);
  }

  const postsWhere = tab === "following" && me
    ? { is_hidden: false, user_id: { in: [...followingIds, me.id] } }
    : { is_hidden: false };

  const [posts, suggestions, trendingUsers] = await Promise.all([
    prisma.review.findMany({
      where:   postsWhere,
      orderBy: { created_at: "desc" },
      take:    30,
      include: {
        user:  { select: { username: true, avatar_url: true, is_blue_tick: true, subscription_tier: true } },
        movie: { select: { tmdb_id: true, title: true, poster_url: true, release_date: true } },
      },
    }),
    me
      ? prisma.user.findMany({
          where: {
            id:        { not: me.id },
            is_banned: false,
            NOT:       { followers: { some: { follower_id: me.id } } },
          },
          orderBy: { xp_points: "desc" },
          take:    5,
          select: {
            id: true, username: true, avatar_url: true, xp_points: true,
            is_blue_tick: true, subscription_tier: true, bio: true,
            _count: { select: { followers: true } },
          },
        })
      : Promise.resolve([]),
    prisma.user.findMany({
      where:   { is_banned: false },
      orderBy: { xp_points: "desc" },
      take:    5,
      select: {
        id: true, username: true, avatar_url: true, xp_points: true,
        is_blue_tick: true, _count: { select: { followers: true } },
      },
    }),
  ]);

  let likedSet = new Set<string>(), repostedSet = new Set<string>(), bookmarkedSet = new Set<string>();
  if (me && posts.length) {
    const ids = posts.map((p) => p.id);
    const [l, r, b] = await Promise.all([
      prisma.reviewLike.findMany({ where: { user_id: me.id, review_id: { in: ids } }, select: { review_id: true } }),
      prisma.repost.findMany    ({ where: { user_id: me.id, review_id: { in: ids } }, select: { review_id: true } }),
      prisma.bookmark.findMany  ({ where: { user_id: me.id, review_id: { in: ids } }, select: { review_id: true } }),
    ]);
    likedSet      = new Set(l.map((x) => x.review_id));
    repostedSet   = new Set(r.map((x) => x.review_id));
    bookmarkedSet = new Set(b.map((x) => x.review_id));
  }

  const postCount24h = await prisma.review.count({
    where: { is_hidden: false, created_at: { gte: new Date(Date.now() - 86_400_000) } },
  });

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Topbar />
      <div className="flex pt-14">
        <div className="hidden lg:block w-[240px] shrink-0"><Sidebar /></div>

        <main className="flex-1 min-w-0 max-w-2xl mx-auto pb-24 lg:pb-10">
          {/* Sticky tab header */}
          <div className="sticky top-14 z-20 bg-[#0A0A0F]/90 backdrop-blur-md border-b border-[#1E1E2E]">
            <div className="flex items-center justify-between px-4 sm:px-6 pt-3 pb-2">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-[#E50914]" />
                <h1 className="text-lg font-bold text-white">Social</h1>
              </div>
              <span className="text-[11px] text-[#505060] flex items-center gap-1">
                <Flame size={12} className="text-[#FF6B35]" />
                {postCount24h} posts today
              </span>
            </div>
            <div className="flex items-center px-2">
              <TabLink href="/social?tab=for-you"   label="For You"   active={tab === "for-you"} />
              <TabLink href="/social?tab=following" label="Following" active={tab === "following"} />
            </div>
          </div>

          {/* Composer */}
          {me ? (
            <div className="px-3 sm:px-4 pt-3 border-b border-[#1E1E2E]">
              <PostComposer currentUser={{ username: me.username, avatar_url: me.avatar_url }} />
            </div>
          ) : (
            <Link
              href="/login"
              className="block mx-3 sm:mx-4 mt-3 p-4 rounded-[12px] border border-[#E50914]/30 bg-gradient-to-r from-[#E50914]/10 to-transparent text-center"
            >
              <p className="text-sm text-white font-semibold">Log in to post and follow critics</p>
              <p className="text-xs text-[#A0A0B0] mt-0.5">Join the conversation</p>
            </Link>
          )}

          {/* Feed */}
          <div className="mt-1">
            {posts.length === 0 ? (
              <div className="mx-3 sm:mx-4 mt-6 p-10 rounded-[14px] border border-[#1E1E2E] bg-[#12121A] text-center">
                <div className="w-12 h-12 rounded-full bg-[#1A1A28] mx-auto mb-3 flex items-center justify-center">
                  <Sparkles size={20} className="text-[#505060]" />
                </div>
                <p className="text-white font-semibold">
                  {tab === "following" ? "Your feed is quiet" : "No posts yet"}
                </p>
                <p className="text-xs text-[#505060] mt-1">
                  {tab === "following"
                    ? "Follow more people to see their takes here."
                    : "Be the first to share a hot take."}
                </p>
                {tab === "following" && (
                  <Link
                    href="/social?tab=for-you"
                    className="inline-block mt-4 h-8 px-4 rounded-full bg-[#E50914] hover:bg-[#C50812] text-sm text-white font-semibold leading-8 transition-colors"
                  >
                    Browse For You
                  </Link>
                )}
              </div>
            ) : (
              <div className="divide-y divide-[#1E1E2E]">
                {posts.map((p) => (
                  <PostCard
                    key={p.id}
                    post={p}
                    initialLiked={likedSet.has(p.id)}
                    initialReposted={repostedSet.has(p.id)}
                    initialBookmarked={bookmarkedSet.has(p.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Right rail — suggestions */}
        <aside className="hidden xl:block w-[320px] shrink-0 pt-6 pr-4 space-y-4">
          {me && suggestions.length > 0 && (
            <SuggestionPanel
              title="Who to follow"
              users={suggestions}
            />
          )}
          <TrendingCreatorsPanel users={trendingUsers} />
        </aside>
      </div>
      <BottomNav />
    </div>
  );
}

function TabLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex-1 text-center py-3 text-sm font-semibold transition-colors relative ${
        active ? "text-white" : "text-[#A0A0B0] hover:text-white"
      }`}
    >
      {label}
      {active && (
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-0.5 rounded-full bg-[#E50914]" />
      )}
    </Link>
  );
}

interface SuggestedUser {
  id: string;
  username: string;
  avatar_url: string | null;
  xp_points: number;
  is_blue_tick: boolean;
  bio?: string | null;
  _count: { followers: number };
}

function SuggestionPanel({ title, users }: { title: string; users: SuggestedUser[] }) {
  return (
    <div className="card p-4 space-y-3">
      <h3 className="font-bold text-white flex items-center gap-2">
        <Sparkles size={16} className="text-[#F5A623]" />
        {title}
      </h3>
      <ul className="space-y-3">
        {users.map((u) => (
          <li key={u.id}>
            <Link
              href={`/profile/${u.username}`}
              className="flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-[#E50914] to-[#8B5CF6] flex items-center justify-center text-sm font-bold text-white shrink-0">
                {u.avatar_url ? (
                  <Image src={u.avatar_url} alt={u.username} width={40} height={40} className="object-cover w-full h-full" />
                ) : (
                  u.username[0]?.toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold text-white truncate group-hover:text-[#E50914] transition-colors">
                    @{u.username}
                  </span>
                  {u.is_blue_tick && <VerifiedBadge size={12} />}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[#505060] mt-0.5">
                  <LevelBadge xp={u.xp_points} />
                  <span>{formatCount(u._count.followers)} followers</span>
                </div>
              </div>
              <span className="text-xs font-semibold text-white bg-white/[0.06] hover:bg-white/10 border border-[#1E1E2E] rounded-full px-3 py-1.5 shrink-0 transition-colors">
                View
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface TrendingUser {
  id: string;
  username: string;
  avatar_url: string | null;
  xp_points: number;
  is_blue_tick: boolean;
  _count: { followers: number };
}

function TrendingCreatorsPanel({ users }: { users: TrendingUser[] }) {
  return (
    <div className="card p-4 space-y-3">
      <h3 className="font-bold text-white flex items-center gap-2">
        <Flame size={16} className="text-[#FF6B35]" />
        Top critics
      </h3>
      <ol className="space-y-3">
        {users.map((u, i) => (
          <li key={u.id}>
            <Link href={`/profile/${u.username}`} className="flex items-center gap-3 group">
              <span className="w-5 text-center text-xs font-mono font-bold text-[#505060] shrink-0">
                {i + 1}
              </span>
              <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-[#E50914] to-[#8B5CF6] flex items-center justify-center text-sm font-bold text-white shrink-0">
                {u.avatar_url ? (
                  <Image src={u.avatar_url} alt={u.username} width={36} height={36} className="object-cover w-full h-full" />
                ) : (
                  u.username[0]?.toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold text-white truncate group-hover:text-[#E50914] transition-colors">
                    @{u.username}
                  </span>
                  {u.is_blue_tick && <VerifiedBadge size={12} />}
                </div>
                <div className="text-[11px] text-[#505060] font-mono">
                  ⚡ {formatCount(u.xp_points)} XP
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ol>
      <Link
        href="/leaderboard"
        className="block text-xs text-[#E50914] hover:underline text-center pt-1"
      >
        See full leaderboard →
      </Link>
    </div>
  );
}
