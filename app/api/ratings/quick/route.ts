import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getRatingWeight, updateMovieScores } from "@/utils/voltv-score";
import { awardXP } from "@/lib/xp-system";
import { getMovieById, getTVById, extractTrailerKey } from "@/lib/tmdb";
import { storageIdFor } from "@/lib/media-kind";
import { isUnreleased, UNRELEASED_RATING_ERROR } from "@/lib/release";
import type { Verdict } from "@/lib/comments";

// Single-score quick-rate. Maps a 1-10 number to the 5-dimension Rating model
// (all dims = score, voltv_verdict derived).
//
// POST /api/ratings/quick { tmdb_id, score, media_kind? }
//   score: number in [1,10] (half-step OK)
// GET  /api/ratings/quick?tmdb_id=X&media_kind=movie  → user's score or null

function verdictFor(score: number): Verdict {
  if (score <= 3)  return "skip";
  if (score <= 5)  return "timepass";
  if (score <= 7)  return "watchit";
  return "masterpiece";
}

async function ensureMovie(tmdbId: number, mediaKind: "movie" | "tv") {
  const storageId = storageIdFor(tmdbId, mediaKind);
  const existing = await prisma.movie.findUnique({ where: { tmdb_id: storageId } });
  if (existing) return existing;

  if (mediaKind === "tv") {
    const t = await getTVById(tmdbId);
    const trailerKey = extractTrailerKey(t.videos?.results ?? []);
    return prisma.movie.create({
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
  }
  const t = await getMovieById(tmdbId);
  const trailerKey = extractTrailerKey(t.videos?.results ?? []);
  return prisma.movie.create({
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

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ data: null });

  const sp = req.nextUrl.searchParams;
  const tmdbId = Number(sp.get("tmdb_id"));
  const mediaKind = sp.get("media_kind") === "tv" ? "tv" : "movie";
  if (!Number.isFinite(tmdbId)) return NextResponse.json({ data: null });

  const dbUser = await prisma.user.findUnique({
    where: { supabase_id: user.id }, select: { id: true },
  });
  if (!dbUser) return NextResponse.json({ data: null });

  const storageId = storageIdFor(tmdbId, mediaKind);
  const movie = await prisma.movie.findUnique({
    where: { tmdb_id: storageId }, select: { id: true },
  });
  if (!movie) return NextResponse.json({ data: null });

  const rating = await prisma.rating.findUnique({
    where:  { user_id_movie_id: { user_id: dbUser.id, movie_id: movie.id } },
    select: { overall_score: true, voltv_verdict: true },
  });
  return NextResponse.json({ data: rating ?? null });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const tmdbId = Number(body.tmdb_id);
  const scoreRaw = Number(body.score);
  const mediaKind = body.media_kind === "tv" ? "tv" : "movie";

  if (!Number.isFinite(tmdbId) || tmdbId <= 0) {
    return NextResponse.json({ error: "tmdb_id required" }, { status: 400 });
  }
  if (!Number.isFinite(scoreRaw) || scoreRaw < 1 || scoreRaw > 10) {
    return NextResponse.json({ error: "score must be between 1 and 10" }, { status: 400 });
  }

  // Round to nearest 0.5 then snap to int dimensions (Rating columns are SmallInt 1-10)
  const score = Math.round(scoreRaw);
  const verdict = verdictFor(score);

  const dbUser = await prisma.user.findUnique({ where: { supabase_id: user.id } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (dbUser.is_banned) return NextResponse.json({ error: "Account suspended" }, { status: 403 });

  let movie;
  try {
    movie = await ensureMovie(tmdbId, mediaKind);
  } catch {
    return NextResponse.json({ error: "Could not load from TMDB" }, { status: 502 });
  }

  // A title nobody could have seen yet must not collect scores.
  if (isUnreleased(movie.release_date)) {
    return NextResponse.json({ error: UNRELEASED_RATING_ERROR }, { status: 409 });
  }

  const weight = getRatingWeight(dbUser);
  const overall_score = score;

  const existing = await prisma.rating.findUnique({
    where: { user_id_movie_id: { user_id: dbUser.id, movie_id: movie.id } },
  });

  const rating = await prisma.rating.upsert({
    where: { user_id_movie_id: { user_id: dbUser.id, movie_id: movie.id } },
    create: {
      user_id:        dbUser.id,
      movie_id:       movie.id,
      story:          score,
      direction:      score,
      acting:         score,
      visuals:        score,
      rewatch:        score,
      voltv_verdict:  verdict,
      overall_score,
      weight_applied: weight,
    },
    update: {
      story:          score,
      direction:      score,
      acting:         score,
      visuals:        score,
      rewatch:        score,
      voltv_verdict:  verdict,
      overall_score,
      weight_applied: weight,
    },
  });

  // Async post-rating actions
  Promise.all([
    updateMovieScores(movie.id),
    !existing ? awardXP(dbUser.id, "rate_movie") : Promise.resolve(),
  ]).catch((e) => console.error("Post-rate actions failed:", e));

  return NextResponse.json({ data: rating });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const tmdbId = Number(sp.get("tmdb_id"));
  const mediaKind = sp.get("media_kind") === "tv" ? "tv" : "movie";
  if (!Number.isFinite(tmdbId)) {
    return NextResponse.json({ error: "tmdb_id required" }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabase_id: user.id }, select: { id: true },
  });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const storageId = storageIdFor(tmdbId, mediaKind);
  const movie = await prisma.movie.findUnique({
    where: { tmdb_id: storageId }, select: { id: true },
  });
  if (!movie) return NextResponse.json({ ok: true });

  await prisma.rating.deleteMany({
    where: { user_id: dbUser.id, movie_id: movie.id },
  });
  updateMovieScores(movie.id).catch((e) => console.error("Score update failed:", e));

  return NextResponse.json({ ok: true });
}
