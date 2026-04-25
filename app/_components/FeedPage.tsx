import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import Topbar from "@/components/layout/Topbar";
import Sidebar, { BottomNav } from "@/components/layout/Sidebar";
import { MovieRow } from "@/components/movie/MovieCard";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  getTrending,
  getPopular,
  getTopRated,
  getNowPlaying,
  getUpcoming,
  getMarvelMovies,
  getDCMovies,
} from "@/lib/tmdb";
import type { MovieCard as MovieCardType } from "@/types";
import type { TMDBMovieBasic } from "@/lib/tmdb";
import WeeklyLeaderboard from "./WeeklyLeaderboard";
import MostDiscussedSidebar from "@/components/discover/MostDiscussedSidebar";
import { readFireStore, topFires } from "@/lib/fires";
import ForYouRow from "./ForYouRow";
import PostComposer from "@/components/feed/PostComposer";
import PostCard from "@/components/feed/PostCard";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";

function toCards(results: TMDBMovieBasic[], limit = 10): MovieCardType[] {
  return results.slice(0, limit).map((m) => ({
    id:           String(m.id),
    tmdb_id:      m.id,
    title:        m.title,
    poster_url:   m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
    release_date: m.release_date,
    voltv_score:  null,
    genres:       [],
    runtime:      null,
  }));
}

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try { return await p; } catch { return fallback; }
}

export default async function FeedPage() {
  const empty = { results: [], total_results: 0, total_pages: 0, page: 1 };

  // Only block on TMDB (cached 1hr → near-instant). DB-backed community feed
  // streams in via <Suspense> below so movie rows paint immediately.
  const [trending, popular, topRated, nowPlaying, upcoming, trendingDay, popular2, marvel, dc] = await Promise.all([
    safe(getTrending("week"), empty),
    safe(getPopular(),        empty),
    safe(getTopRated(),       empty),
    safe(getNowPlaying(),     empty),
    safe(getUpcoming(),       empty),
    safe(getTrending("day"),  empty),
    safe(getPopular(2),       empty),
    safe(getMarvelMovies(),   empty),
    safe(getDCMovies(),       empty),
  ]);

  const talkOfTown    = toCards(trending.results);
  const withFriends   = toCards(popular.results);
  const editorsPick   = toCards(topRated.results);
  const netflix       = toCards(nowPlaying.results);
  const amazon        = toCards(upcoming.results);
  const prime         = toCards(trendingDay.results);
  const crunchyroll   = toCards(popular2.results);
  const marvelRow     = toCards(marvel.results);
  const dcRow         = toCards(dc.results);
  const fires = topFires(await readFireStore(), 10);

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Topbar />
      <div className="flex pt-14">
        <div className="hidden lg:block w-[240px] shrink-0">
          <Sidebar />
        </div>

        <main className="flex-1 min-w-0 px-4 py-6 space-y-10 pb-24 lg:pb-8">
          <Suspense fallback={<Skeleton className="w-full h-48 rounded-2xl" />}>
            <ForYouRow />
          </Suspense>
          {talkOfTown.length > 0 && (
            <MovieRow title="Talk of the Town" movies={talkOfTown} size="md" viewAllHref="/discover?sort=trending" />
          )}
          {withFriends.length > 0 && (
            <MovieRow title="Watch it with Friends" movies={withFriends} size="md" viewAllHref="/discover?sort=popular" />
          )}
          {marvelRow.length > 0 && (
            <MovieRow title="Marvel Universe" movies={marvelRow} size="md" viewAllHref="/discover?studio=marvel" />
          )}
          {dcRow.length > 0 && (
            <MovieRow title="DC Universe" movies={dcRow} size="md" viewAllHref="/discover?studio=dc" />
          )}
          {editorsPick.length > 0 && (
            <MovieRow title="Editor's Pick of the Week" movies={editorsPick} size="md" viewAllHref="/discover?sort=top_rated" />
          )}
          {netflix.length > 0 && (
            <MovieRow title="Don't Miss These on Netflix" movies={netflix} size="md" viewAllHref="/discover?filter=now_playing" />
          )}
          {amazon.length > 0 && (
            <MovieRow title="Don't Miss These on Amazon" movies={amazon} size="md" viewAllHref="/discover?filter=upcoming" />
          )}
          {prime.length > 0 && (
            <MovieRow title="Worth Watching on Prime" movies={prime} size="md" viewAllHref="/discover?sort=trending" />
          )}
          {crunchyroll.length > 0 && (
            <MovieRow title="Worth Watching on Crunchyroll" movies={crunchyroll} size="md" viewAllHref="/discover?sort=popular" />
          )}

          {/* ── Community feed (X-style) streams in ─────── */}
          <Suspense fallback={<CommunityFeedSkeleton />}>
            <CommunityFeed />
          </Suspense>
        </main>

        <aside className="hidden xl:block w-[320px] shrink-0 pt-6 pr-4 space-y-4">
          <PromoBanner />
          <MostDiscussedSidebar initial={fires} />
          <Suspense fallback={<Skeleton className="w-full h-64 rounded-2xl" />}>
            <WeeklyLeaderboard />
          </Suspense>
        </aside>
      </div>
      <BottomNav />
    </div>
  );
}

function PromoBanner() {
  return (
    <Link
      href="/settings/subscription"
      className="block relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-[#8B5CF6] via-[#6D28D9] to-[#4C1D95] text-white"
    >
      <div className="absolute -right-6 -bottom-6 text-8xl opacity-20">⚡</div>
      <div className="relative">
        <div className="text-xs font-semibold uppercase tracking-widest opacity-80">Deal Of The Day</div>
        <div className="mt-2 text-3xl font-extrabold leading-tight">FLAT 35% OFF</div>
        <div className="mt-1 text-sm opacity-90">on VoltV Pro — this week only</div>
        <div className="mt-3 inline-flex items-center gap-1 bg-white text-[#4C1D95] text-xs font-bold px-3 py-1.5 rounded-full">
          Upgrade →
        </div>
      </div>
    </Link>
  );
}


async function CommunityFeed() {
  const supabase = await createServerSupabaseClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  const [currentUser, posts] = await Promise.all([
    authUser
      ? prisma.user.findUnique({
          where:  { supabase_id: authUser.id },
          select: { id: true, username: true, avatar_url: true },
        })
      : Promise.resolve(null),
    prisma.review.findMany({
      where:   { is_hidden: false },
      orderBy: { created_at: "desc" },
      take:    20,
      include: {
        user:  { select: { username: true, avatar_url: true, is_blue_tick: true, subscription_tier: true } },
        movie: { select: { tmdb_id: true, title: true, poster_url: true, release_date: true } },
      },
    }),
  ]);

  let likedSet = new Set<string>(), repostedSet = new Set<string>(), bookmarkedSet = new Set<string>();
  if (currentUser && posts.length) {
    const ids = posts.map((p) => p.id);
    const [l, r, b] = await Promise.all([
      prisma.reviewLike.findMany({ where: { user_id: currentUser.id, review_id: { in: ids } }, select: { review_id: true } }),
      prisma.repost.findMany    ({ where: { user_id: currentUser.id, review_id: { in: ids } }, select: { review_id: true } }),
      prisma.bookmark.findMany  ({ where: { user_id: currentUser.id, review_id: { in: ids } }, select: { review_id: true } }),
    ]);
    likedSet      = new Set(l.map((x) => x.review_id));
    repostedSet   = new Set(r.map((x) => x.review_id));
    bookmarkedSet = new Set(b.map((x) => x.review_id));
  }

  return (
    <section className="max-w-2xl mx-auto w-full pt-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold text-white">📣 Community Feed</h2>
        <Link href="/feed" className="text-xs text-[#E50914] hover:underline">
          See all →
        </Link>
      </div>

      {currentUser && (
        <div className="mb-4">
          <PostComposer currentUser={{ username: currentUser.username, avatar_url: currentUser.avatar_url }} />
        </div>
      )}

      {posts.length === 0 ? (
        <div className="card p-8 text-center text-sm text-[#A0A0B0]">
          No posts yet. Be the first to share a hot take!
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
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
    </section>
  );
}

function CommunityFeedSkeleton() {
  return (
    <section className="max-w-2xl mx-auto w-full pt-4">
      <h2 className="text-xl font-bold text-white mb-3">📣 Community Feed</h2>
      <div className="space-y-3">
        <Skeleton className="w-full h-24 rounded-2xl" />
        <Skeleton className="w-full h-24 rounded-2xl" />
        <Skeleton className="w-full h-24 rounded-2xl" />
      </div>
    </section>
  );
}
