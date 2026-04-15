import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import Topbar from "@/components/layout/Topbar";
import Sidebar, { BottomNav } from "@/components/layout/Sidebar";
import PostComposer from "@/components/feed/PostComposer";
import PostCard from "@/components/feed/PostCard";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Feed · VOLTV" };

export default async function FeedPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch user + posts in parallel (posts don't need user row)
  const [dbUser, posts] = await Promise.all([
    prisma.user.findUnique({
      where:  { supabase_id: user.id },
      select: { id: true, username: true, avatar_url: true },
    }),
    prisma.review.findMany({
      where:   { is_hidden: false, visibility: { in: ["public", "followers"] } },
      orderBy: { created_at: "desc" },
      take:    50,
      include: {
        user:  { select: { username: true, avatar_url: true, is_blue_tick: true, subscription_tier: true } },
        movie: { select: { tmdb_id: true, title: true, poster_url: true, release_date: true } },
      },
    }),
  ]);
  if (!dbUser) redirect("/login");

  // Filter followers-only posts to those from authors the viewer follows (or own)
  const followingIds = new Set(
    (await prisma.follow.findMany({
      where:  { follower_id: dbUser.id },
      select: { following_id: true },
    })).map((f) => f.following_id)
  );
  const visiblePosts = posts.filter((p) =>
    p.visibility === "public" ||
    p.user_id === dbUser.id ||
    (p.visibility === "followers" && followingIds.has(p.user_id))
  );

  const postIds = visiblePosts.map((p) => p.id);
  const [likes, reposts, bookmarks] = postIds.length
    ? await Promise.all([
        prisma.reviewLike.findMany({ where: { user_id: dbUser.id, review_id: { in: postIds } }, select: { review_id: true } }),
        prisma.repost.findMany    ({ where: { user_id: dbUser.id, review_id: { in: postIds } }, select: { review_id: true } }),
        prisma.bookmark.findMany  ({ where: { user_id: dbUser.id, review_id: { in: postIds } }, select: { review_id: true } }),
      ])
    : [[], [], []] as const;
  const likedSet      = new Set(likes.map((x) => x.review_id));
  const repostedSet   = new Set(reposts.map((x) => x.review_id));
  const bookmarkedSet = new Set(bookmarks.map((x) => x.review_id));

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Topbar />
      <div className="flex pt-14">
        <div className="hidden lg:block w-[240px] shrink-0"><Sidebar /></div>

        <main className="flex-1 min-w-0 max-w-2xl mx-auto px-4 py-6 pb-24 lg:pb-8 space-y-4">
          {/* Sticky header */}
          <div className="sticky top-14 -mx-4 px-4 py-3 bg-[#0A0A0F]/90 backdrop-blur border-b border-[#1E1E2E] z-10">
            <h1 className="text-xl font-bold text-white">Feed</h1>
            <p className="text-xs text-[#505060]">What people are saying about movies</p>
          </div>

          <PostComposer currentUser={{ username: dbUser.username, avatar_url: dbUser.avatar_url }} />

          {/* Posts */}
          {visiblePosts.length === 0 ? (
            <div className="card p-8 text-center text-sm text-[#A0A0B0]">
              No posts yet. Be the first to share a hot take!
            </div>
          ) : (
            <div className="card p-0 overflow-hidden">
              {visiblePosts.map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  isOwner={p.user_id === dbUser.id}
                  initialLiked={likedSet.has(p.id)}
                  initialReposted={repostedSet.has(p.id)}
                  initialBookmarked={bookmarkedSet.has(p.id)}
                />
              ))}
            </div>
          )}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
