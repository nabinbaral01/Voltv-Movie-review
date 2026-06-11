import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import Topbar from "@/components/layout/Topbar";
import Sidebar, { BottomNav } from "@/components/layout/Sidebar";
import HeatmapGrid from "@/components/profile/HeatmapGrid";
import TastePassport from "@/components/profile/TastePassport";
import BadgeShelf from "@/components/profile/BadgeShelf";
import ProfileTabs from "@/components/profile/ProfileTabs";
import EditProfileButton from "@/components/profile/EditProfileButton";
import TrailerBanner from "@/components/profile/TrailerBanner";
import FollowButton from "@/components/profile/FollowButton";
import PostComposer from "@/components/feed/PostComposer";
import ZoomableMovieGrid from "@/components/profile/ZoomableMovieGrid";
import GenreBreakdown from "@/components/profile/GenreBreakdown";
import { generateHeatmap } from "@/lib/heatmap";
import { LevelBadge, TierBadge } from "@/components/ui/Badge";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import { formatCount, formatRuntime } from "@/utils/formatters";
import type { TasteDNA } from "@/types";

export async function generateMetadata(
  { params }: { params: Promise<{ username: string }> }
): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `@${username}`,
    description: `${username}'s cinematic universe on VOLTV`,
  };
}

export default async function ProfilePage(
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  // User fetch + auth check are independent — run in parallel
  const supabase = await createServerSupabaseClient();
  const [user, authResult] = await Promise.all([
    prisma.user.findUnique({
      where: { username },
      include: {
        achievements: { orderBy: { earned_at: "desc" } },
        _count: {
          select: {
            followers: true,
            following: true,
            watch_history: true,
            reviews: true,
          },
        },
      },
    }),
    supabase.auth.getUser(),
  ]);

  if (!user) notFound();

  const authUser = authResult.data.user;
  const isOwner = !!authUser && authUser.id === user.supabase_id;

  // Follow check, heatmap, stats, favourites, watch lists — all independent of each other,
  // so fire them in one parallel batch instead of sequentially. (DB is in us-east-1; each
  // serial round trip costs ~250-400ms from outside the US, so collapsing 4 rounds into 1
  // is a major win.)
  const followCheckPromise: Promise<boolean> =
    authUser && !isOwner
      ? (async () => {
          const viewer = await prisma.user.findUnique({
            where: { supabase_id: authUser.id }, select: { id: true },
          });
          if (!viewer) return false;
          const f = await prisma.follow.findUnique({
            where: { follower_id_following_id: { follower_id: viewer.id, following_id: user.id } },
            select: { follower_id: true },
          });
          return !!f;
        })()
      : Promise.resolve(false);

  const [
    heatmapData,
    watchStats,
    favourites,
    watchedList,
    watchLaterList,
    initialFollowing,
  ] = await Promise.all([
    generateHeatmap(user.id),
    prisma.watchHistory.findMany({
      where:  { user_id: user.id, status: "watched" },
      select: { movie: { select: { runtime: true, countries: true, genres: true } } },
    }),
    prisma.rating.findMany({
      where:   { user_id: user.id },
      orderBy: { overall_score: "desc" },
      take:    4,
      include: { movie: { select: { id: true, tmdb_id: true, title: true, poster_url: true, release_date: true, voltv_score: true, genres: true, runtime: true } } },
    }),
    prisma.watchHistory.findMany({
      where:   { user_id: user.id, status: "watched" },
      orderBy: { watched_date: "desc" },
      include: { movie: { select: { id: true, tmdb_id: true, title: true, poster_url: true, release_date: true, languages: true, genres: true } } },
    }),
    prisma.watchHistory.findMany({
      where:   { user_id: user.id, status: "want_to_watch" },
      orderBy: { updated_at: "desc" },
      include: { movie: { select: { id: true, tmdb_id: true, title: true, poster_url: true, release_date: true, languages: true, genres: true } } },
    }),
    followCheckPromise,
  ]);

  const totalMinutes = watchStats.reduce((sum, w) => sum + (w.movie.runtime ?? 0), 0);
  const countries    = new Set(watchStats.flatMap((w) => w.movie.countries)).size;

  // Compute live taste DNA from watch history (falls back to stored taste_dna only if no watches)
  const GENRE_MAP: Record<string, keyof TasteDNA> = {
    Action:            "action",
    Adventure:         "action",
    Drama:             "drama",
    Horror:            "horror",
    Thriller:          "thriller",
    Comedy:            "comedy",
    Romance:           "romance",
    "Science Fiction": "scifi",
    Fantasy:           "scifi",
    Animation:         "anime",
  };
  const counts: TasteDNA = {
    action: 0, drama: 0, horror: 0, comedy: 0,
    scifi: 0, romance: 0, thriller: 0, anime: 0,
  };
  for (const w of watchStats) {
    for (const g of w.movie.genres) {
      const key = GENRE_MAP[g];
      if (key) counts[key] += 1;
    }
  }
  const maxCount = Math.max(...Object.values(counts), 1);
  const livePct: TasteDNA = Object.fromEntries(
    Object.entries(counts).map(([k, v]) => [k, Math.round((v / maxCount) * 100)])
  ) as TasteDNA;
  const hasWatches = watchStats.length > 0;
  const storedDna  = (user.taste_dna as TasteDNA | null) ?? null;
  const tasteDNA: TasteDNA = hasWatches ? livePct : (storedDna ?? {
    action: 0, drama: 0, horror: 0, comedy: 0,
    scifi: 0, romance: 0, thriller: 0, anime: 0,
  });

  const earnedBadgeIds = user.achievements.map((a) => a.badge_id);

  // ── Profile tabs data ────────────────────────────────────────
  const reviewInclude = {
    user:  { select: { username: true, avatar_url: true, is_blue_tick: true, subscription_tier: true } },
    movie: { select: { tmdb_id: true, title: true, poster_url: true, release_date: true } },
  } as const;

  // Visibility filter: owner sees everything; others see public only
  // (followers-only posts are shown if viewer follows the author)
  const visWhere = isOwner
    ? {}
    : initialFollowing
      ? { visibility: { in: ["public", "followers"] } }
      : { visibility: "public" };

  const [postsRaw, repliesRaw, likedLinksRaw] = await Promise.all([
    prisma.review.findMany({
      where:   { user_id: user.id, is_hidden: false, parent_id: null, ...visWhere },
      orderBy: { created_at: "desc" },
      take:    30,
      include: reviewInclude,
    }),
    prisma.review.findMany({
      where:   { user_id: user.id, is_hidden: false, NOT: { parent_id: null }, ...visWhere },
      orderBy: { created_at: "desc" },
      take:    30,
      include: reviewInclude,
    }),
    prisma.reviewLike.findMany({
      where:   { user_id: user.id, review: { is_hidden: false, visibility: "public" } },
      orderBy: { created_at: "desc" },
      take:    30,
      include: { review: { include: reviewInclude } },
    }),
  ]);

  const toFeedPost = (r: typeof postsRaw[number]) => ({
    id:            r.id,
    content:       r.content,
    type:          r.type as "hot_take" | "full_review",
    is_spoiler:    r.is_spoiler,
    is_anonymous:  r.is_anonymous,
    visibility:    r.visibility as "public" | "unlisted" | "followers",
    media_urls:    r.media_urls,
    media_type:    r.media_type as "image" | "video" | null,
    edited_at:     r.edited_at,
    likes_count:   r.likes_count,
    reposts_count: r.reposts_count,
    replies_count: r.replies_count,
    created_at:    r.created_at,
    user:          r.user,
    movie:         r.movie,
  });

  const tabPosts   = postsRaw.map(toFeedPost);
  const tabReplies = repliesRaw.map(toFeedPost);
  const tabLikes   = likedLinksRaw.map((l) => toFeedPost(l.review));

  // Media = unique movie posters this user has posted about (posts + replies)
  const seen = new Set<number>();
  const tabMedia: { id: string; tmdb_id: number; title: string; poster_url: string | null }[] = [];
  for (const r of [...postsRaw, ...repliesRaw]) {
    if (!r.movie) continue;
    if (seen.has(r.movie.tmdb_id)) continue;
    seen.add(r.movie.tmdb_id);
    tabMedia.push({ id: r.id, tmdb_id: r.movie.tmdb_id, title: r.movie.title, poster_url: r.movie.poster_url });
    if (tabMedia.length >= 24) break;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Topbar />
      <div className="flex pt-14">
        <div className="hidden lg:block w-[240px] shrink-0"><Sidebar /></div>

        <main className="flex-1 min-w-0 max-w-3xl mx-auto pb-24 lg:pb-8">

          {/* Banner */}
          <div className="relative w-full h-36 sm:h-48 bg-gradient-to-br from-[#E50914]/30 via-[#1A1A28] to-[#8B5CF6]/30 overflow-hidden">
            {user.trailer_url && extractYouTubeId(user.trailer_url) ? (
              <TrailerBanner videoId={extractYouTubeId(user.trailer_url)} bannerUrl={user.banner_url} />
            ) : user.banner_url ? (
              <Image src={user.banner_url} alt="Banner" fill className="object-cover" sizes="100vw" />
            ) : null}
          </div>

          {/* Profile header */}
          <div className="relative px-4 sm:px-6">
            {/* Avatar — overlaps the banner alone */}
            <div className="relative -mt-12 sm:-mt-14 mb-3 z-10">
              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full border-4 border-[#0A0A0F] bg-gradient-to-br from-[#E50914] to-[#8B5CF6] flex items-center justify-center text-2xl font-bold overflow-hidden">
                {user.avatar_url ? (
                  <Image src={user.avatar_url} alt={user.username} width={112} height={112} className="object-cover w-full h-full" />
                ) : (
                  user.username[0]?.toUpperCase()
                )}
              </div>
            </div>

            {/* Name + action row — sits below the banner, no overlap */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold text-white truncate">@{user.username}</h1>
                  {user.is_blue_tick && <VerifiedBadge size={20} />}
                  <TierBadge tier={user.subscription_tier as "free" | "pro" | "legend"} />
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <LevelBadge xp={user.xp_points} />
                  {user.personality_type && (
                    <span className="text-xs text-[#505060]">{user.personality_type}</span>
                  )}
                </div>
              </div>

              <div className="shrink-0">
                {isOwner ? (
                  <EditProfileButton
                    initial={{
                      username:         user.username,
                      bio:              user.bio,
                      avatar_url:       user.avatar_url,
                      banner_url:       user.banner_url,
                      trailer_url:      user.trailer_url,
                      personality_type: user.personality_type,
                    }}
                  />
                ) : (
                  <FollowButton username={user.username} initialFollowing={initialFollowing} />
                )}
              </div>
            </div>

            {/* Bio */}
            {user.bio && (
              <p className="text-sm text-[#A0A0B0] mb-4">{user.bio}</p>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              {[
                { label: "Movies",    value: formatCount(user._count.watch_history) },
                { label: "Hours",     value: formatCount(Math.round(totalMinutes / 60)) },
                { label: "Countries", value: String(countries) },
                { label: "Streak", value: String(user.streak_count) },
              ].map((s) => (
                <div key={s.label} className="card p-3 text-center">
                  <div className="text-lg font-bold font-mono text-white">{s.value}</div>
                  <div className="text-xs text-[#505060]">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Follow counts */}
            <div className="flex gap-4 text-sm text-[#505060] mb-6">
              <Link
                href={`/profile/${user.username}/followers`}
                className="hover:text-white transition-colors"
              >
                <span className="text-white font-bold">{formatCount(user._count.followers)}</span> Followers
              </Link>
              <Link
                href={`/profile/${user.username}/following`}
                className="hover:text-white transition-colors"
              >
                <span className="text-white font-bold">{formatCount(user._count.following)}</span> Following
              </Link>
              <span><span className="text-white font-bold">{formatCount(user._count.reviews)}</span> Reviews</span>
            </div>

            {/* 4 Favourite Movies trophy shelf */}
            {favourites.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-[#A0A0B0] uppercase tracking-wide mb-3">
                  Favourite Films
                </h2>
                <div className="flex gap-3">
                  {favourites.map((fav, i) => (
                    <Link
                      key={fav.id}
                      href={`/movie/${fav.movie.tmdb_id}`}
                      className="relative group"
                    >
                      <div className="w-16 sm:w-20 aspect-[2/3] rounded-[8px] overflow-hidden bg-[#1A1A28]">
                        {fav.movie.poster_url ? (
                          <Image
                            src={fav.movie.poster_url}
                            alt={fav.movie.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform"
                            sizes="80px"
                          />
                        ) : (
                          <div className="w-full h-full bg-[#2A2A3A] flex items-center justify-center">
                            <svg viewBox="0 0 100 100" className="w-1/2 h-1/2 text-[#3A3A4A]">
                              <circle cx="50" cy="38" r="18" fill="currentColor" />
                              <ellipse cx="50" cy="80" rx="30" ry="22" fill="currentColor" />
                            </svg>
                          </div>
                        )}
                      </div>
                      {i === 0 && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#F5A623] rounded-full flex items-center justify-center">
                          <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-black" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
                          </svg>
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Watched */}
            <ZoomableMovieGrid
              title={isOwner ? "Movies You've Watched" : `Watched by @${user.username}`}
              emptyText={isOwner
                ? "Click the eye icon on any poster to log a watch."
                : "No watched movies yet."}
              items={watchedList.map((w) => w.movie)}
            />

            {/* Watch Later */}
            <ZoomableMovieGrid
              title={isOwner ? "Your Watch Later" : `@${user.username}'s Watch Later`}
              emptyText={isOwner
                ? "Click the plus icon on any poster to save for later."
                : "Nothing saved yet."}
              items={watchLaterList.map((w) => w.movie)}
            />

            {/* Post composer (own profile only) */}
            {isOwner && (
              <div className="mb-6">
                <PostComposer currentUser={{ username: user.username, avatar_url: user.avatar_url }} />
                <div className="mt-2 text-right">
                  <Link href="/feed" className="text-xs text-[#A0A0B0] hover:text-white">
                    View full feed →
                  </Link>
                </div>
              </div>
            )}

            {/* GitHub Heatmap */}
            <div className="card p-4 mb-6">
              <h2 className="text-sm font-semibold text-[#A0A0B0] uppercase tracking-wide mb-4">
                Watch Activity
              </h2>
              <HeatmapGrid
                days={heatmapData.days}
                total_movies={heatmapData.total_movies}
                current_streak={heatmapData.current_streak}
                longest_streak={heatmapData.longest_streak}
                customizable={isOwner}
              />
            </div>

            {/* Genre breakdown (from WatchHistory) */}
            <div className="card p-4 mb-6">
              <h2 className="text-sm font-semibold text-[#A0A0B0] uppercase tracking-wide mb-4">
                Watched by Genre
              </h2>
              <GenreBreakdown genres={watchStats.map((w) => w.movie.genres)} />
            </div>

            {/* Taste Passport radar */}
            <div className="card p-4 mb-6">
              <TastePassport tasteDNA={tasteDNA} />
            </div>

            {/* X-style tabbed feed */}
            <ProfileTabs
              posts={tabPosts}
              replies={tabReplies}
              likes={tabLikes}
              media={tabMedia}
              isOwner={isOwner}
            />
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

interface StripMovie {
  id:           string;
  tmdb_id:      number;
  title:        string;
  poster_url:   string | null;
  release_date: Date | null;
}

function MovieStrip({
  title,
  emptyText,
  items,
}: {
  title:     string;
  emptyText: string;
  items:     StripMovie[];
}) {
  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-[#A0A0B0] uppercase tracking-wide mb-3">
        {title}
        <span className="ml-2 text-[#505060] normal-case">· {items.length}</span>
      </h2>
      {items.length === 0 ? (
        <div className="card p-4 text-sm text-[#505060]">{emptyText}</div>
      ) : (
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
          {items.map((m) => (
            <Link
              key={m.id}
              href={`/movie/${m.tmdb_id}`}
              className="shrink-0 w-24 sm:w-28 group"
            >
              <div className="w-full aspect-[2/3] rounded-[8px] overflow-hidden bg-[#1A1A28]">
                {m.poster_url ? (
                  <Image
                    src={m.poster_url}
                    alt={m.title}
                    width={112}
                    height={168}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full bg-[#2A2A3A] flex items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-1/2 h-1/2 text-[#3A3A4A]">
                      <circle cx="50" cy="38" r="18" fill="currentColor" />
                      <ellipse cx="50" cy="80" rx="30" ry="22" fill="currentColor" />
                    </svg>
                  </div>
                )}
              </div>
              <p className="mt-1.5 text-xs text-white leading-tight line-clamp-2 group-hover:text-[#E50914] transition-colors">
                {m.title}
              </p>
              {m.release_date && (
                <p className="text-[10px] text-[#505060]">
                  {new Date(m.release_date).getFullYear()}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function extractYouTubeId(url: string): string {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return m?.[1] ?? "";
}
