import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { awardXP } from "@/lib/xp-system";
import { updateStreak } from "@/lib/heatmap";
import { deleteCache, CacheKeys } from "@/lib/redis";
import { getMovieById, getTVById, extractTrailerKey } from "@/lib/tmdb";
import { TV_TMDB_OFFSET } from "@/lib/media-kind";

// POST { tmdb_id, kind: "watched" | "want_to_watch", media_kind?: "movie" | "tv" }
// Ensures the movie/show exists locally, then upserts a WatchHistory row.
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const tmdbId = Number(body.tmdb_id);
  const kind   = body.kind as "watched" | "want_to_watch" | undefined;
  const mediaKind = body.media_kind === "tv" ? "tv" : "movie";

  if (!Number.isFinite(tmdbId) || tmdbId <= 0) {
    return NextResponse.json({ error: "tmdb_id required" }, { status: 400 });
  }
  if (kind !== "watched" && kind !== "want_to_watch") {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({
    where:  { supabase_id: user.id },
    select: { id: true, is_banned: true },
  });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (dbUser.is_banned) return NextResponse.json({ error: "Account banned" }, { status: 403 });

  // Ensure movie/show exists locally. TV shows are stored with an offset
  // tmdb_id so they don't collide with real movie ids.
  const storageId = mediaKind === "tv" ? TV_TMDB_OFFSET + tmdbId : tmdbId;
  let movie = await prisma.movie.findUnique({ where: { tmdb_id: storageId } });
  if (!movie) {
    try {
      if (mediaKind === "tv") {
        const t = await getTVById(tmdbId);
        const trailerKey = extractTrailerKey(t.videos?.results ?? []);
        movie = await prisma.movie.create({
          data: {
            tmdb_id:        storageId,
            title:          t.name,
            original_title: t.original_name,
            overview:       t.overview,
            poster_url:     t.poster_path   ? `https://image.tmdb.org/t/p/w500${t.poster_path}`    : null,
            backdrop_url:   t.backdrop_path ? `https://image.tmdb.org/t/p/w1280${t.backdrop_path}` : null,
            trailer_url:    trailerKey ? `https://www.youtube.com/watch?v=${trailerKey}` : null,
            release_date:   t.first_air_date ? new Date(t.first_air_date) : null,
            runtime:        t.episode_run_time?.[0] ?? null,
            genres:         t.genres.map((g) => g.name),
            languages:      t.spoken_languages.map((l) => l.english_name),
            countries:      t.production_countries.map((c) => c.name),
            tmdb_rating:    t.vote_average,
            tmdb_popularity:t.popularity,
            imdb_id:        t.external_ids?.imdb_id ?? null,
            last_synced:    new Date(),
          },
        });
      } else {
        const t = await getMovieById(tmdbId);
        const trailerKey = extractTrailerKey(t.videos?.results ?? []);
        movie = await prisma.movie.create({
          data: {
            tmdb_id:        t.id,
            title:          t.title,
            original_title: t.original_title,
            overview:       t.overview,
            poster_url:     t.poster_path   ? `https://image.tmdb.org/t/p/w500${t.poster_path}`    : null,
            backdrop_url:   t.backdrop_path ? `https://image.tmdb.org/t/p/w1280${t.backdrop_path}` : null,
            trailer_url:    trailerKey ? `https://www.youtube.com/watch?v=${trailerKey}` : null,
            release_date:   t.release_date ? new Date(t.release_date) : null,
            runtime:        t.runtime,
            genres:         t.genres.map((g) => g.name),
            languages:      t.spoken_languages.map((l) => l.english_name),
            countries:      t.production_countries.map((c) => c.name),
            tmdb_rating:    t.vote_average,
            tmdb_popularity:t.popularity,
            imdb_id:        t.imdb_id ?? t.external_ids?.imdb_id ?? null,
            last_synced:    new Date(),
          },
        });
      }
    } catch {
      return NextResponse.json({ error: "Could not fetch from TMDB" }, { status: 502 });
    }
  }

  const existing = await prisma.watchHistory.findUnique({
    where: { user_id_movie_id: { user_id: dbUser.id, movie_id: movie.id } },
  });

  const entry = await prisma.watchHistory.upsert({
    where:  { user_id_movie_id: { user_id: dbUser.id, movie_id: movie.id } },
    create: {
      user_id:      dbUser.id,
      movie_id:     movie.id,
      status:       kind,
      watched_date: new Date(),
    },
    update: {
      status:       kind,
      watched_date: kind === "watched" ? new Date() : (existing?.watched_date ?? new Date()),
      rewatch_count: kind === "watched" && existing?.status === "watched"
        ? { increment: 1 } : undefined,
    },
  });

  if (kind === "watched") {
    const isNewWatch = !existing || existing.status !== "watched";
    await Promise.all([
      isNewWatch ? awardXP(dbUser.id, "log_movie") : Promise.resolve(),
      updateStreak(dbUser.id),
      deleteCache(CacheKeys.heatmap(dbUser.id)),
      isNewWatch
        ? prisma.activityFeed.create({
            data: { user_id: dbUser.id, activity_type: "watched_movie", movie_id: movie.id },
          })
        : Promise.resolve(),
    ]);
  }

  return NextResponse.json({
    data: {
      status: entry.status,
      genres: movie.genres,
      title:  movie.title,
    },
  });
}

// GET ?tmdb_id=...&media_kind=movie|tv  → current user's status for that title
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ data: null });

  const tmdbId = Number(req.nextUrl.searchParams.get("tmdb_id"));
  const mediaKind = req.nextUrl.searchParams.get("media_kind") === "tv" ? "tv" : "movie";
  if (!Number.isFinite(tmdbId)) return NextResponse.json({ data: null });

  const dbUser = await prisma.user.findUnique({
    where: { supabase_id: user.id }, select: { id: true },
  });
  if (!dbUser) return NextResponse.json({ data: null });

  const storageId = mediaKind === "tv" ? TV_TMDB_OFFSET + tmdbId : tmdbId;
  const movie = await prisma.movie.findUnique({
    where: { tmdb_id: storageId }, select: { id: true },
  });
  if (!movie) return NextResponse.json({ data: null });

  const entry = await prisma.watchHistory.findUnique({
    where:  { user_id_movie_id: { user_id: dbUser.id, movie_id: movie.id } },
    select: { status: true },
  });

  return NextResponse.json({ data: entry ? { status: entry.status } : null });
}
