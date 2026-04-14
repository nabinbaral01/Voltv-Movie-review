import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMovieById, extractTrailerKey } from "@/lib/tmdb";
import { getCache, setCache, CacheKeys, TTL } from "@/lib/redis";
import type { ApiResponse } from "@/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tmdbId = parseInt(id, 10);

    if (isNaN(tmdbId)) {
      return NextResponse.json<ApiResponse>({ error: "Invalid movie ID" }, { status: 400 });
    }

    // 1. Check Redis cache
    const cacheKey = CacheKeys.movieTmdb(tmdbId);
    const cached   = await getCache(cacheKey);
    if (cached) {
      return NextResponse.json<ApiResponse>({ data: cached });
    }

    // 2. Check our DB (already synced)
    let movie = await prisma.movie.findUnique({ where: { tmdb_id: tmdbId } });

    // 3. If not in DB or stale (>24h), fetch from TMDB
    const isStale = !movie ||
      new Date().getTime() - new Date(movie.last_synced).getTime() > 86_400_000;

    if (isStale) {
      const tmdbData = await getMovieById(tmdbId);
      const trailerKey = extractTrailerKey(tmdbData.videos?.results ?? []);

      const movieData = {
        tmdb_id:        tmdbData.id,
        title:          tmdbData.title,
        original_title: tmdbData.original_title,
        overview:       tmdbData.overview,
        poster_url:     tmdbData.poster_path
          ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}`
          : null,
        backdrop_url:   tmdbData.backdrop_path
          ? `https://image.tmdb.org/t/p/w1280${tmdbData.backdrop_path}`
          : null,
        trailer_url:    trailerKey ? `https://www.youtube.com/watch?v=${trailerKey}` : null,
        release_date:   tmdbData.release_date ? new Date(tmdbData.release_date) : null,
        runtime:        tmdbData.runtime,
        genres:         tmdbData.genres.map((g) => g.name),
        languages:      tmdbData.spoken_languages.map((l) => l.english_name),
        countries:      tmdbData.production_countries.map((c) => c.name),
        tmdb_rating:    tmdbData.vote_average,
        tmdb_popularity:tmdbData.popularity,
        imdb_id:        tmdbData.imdb_id ?? tmdbData.external_ids?.imdb_id ?? null,
        last_synced:    new Date(),
      };

      movie = await prisma.movie.upsert({
        where:  { tmdb_id: tmdbId },
        create: movieData,
        update: movieData,
      });
    }

    // Enrich with TMDB details for movie page (cast, etc.)
    let tmdbDetail = null;
    try {
      const raw = await getMovieById(tmdbId);
      tmdbDetail = {
        cast: raw.credits?.cast?.slice(0, 20).map((c) => ({
          id:          c.id,
          name:        c.name,
          character:   c.character,
          profile_path:c.profile_path,
        })) ?? [],
        director: raw.credits?.crew?.find((c) => c.job === "Director"),
        similar:  raw.similar?.results?.slice(0, 8).map((m) => ({
          id:          m.id,
          title:       m.title,
          poster_path: m.poster_path,
          vote_average:m.vote_average,
          release_date:m.release_date,
        })) ?? [],
        providers: raw["watch/providers"]?.results?.US ?? null,
      };
    } catch {}

    const result = { movie, tmdbDetail };
    await setCache(cacheKey, result, TTL.movie);

    return NextResponse.json<ApiResponse>({ data: result });
  } catch (err) {
    console.error("[/api/movies/[id]]", err);
    return NextResponse.json<ApiResponse>({ error: "Failed to fetch movie" }, { status: 500 });
  }
}
