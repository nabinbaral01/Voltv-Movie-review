import { prisma } from "@/lib/prisma";
import { discoverMovies, GENRE_MAP } from "@/lib/tmdb";
import { isUnreleased } from "@/lib/release";
import type { MovieCard } from "@/types";

// Upcoming releases filtered to what a given user actually watches, rather
// than every upcoming title worldwide.

const GENRE_ID_BY_NAME: Record<string, number> = Object.fromEntries(
  Object.entries(GENRE_MAP).map(([id, name]) => [name, Number(id)]),
);

// A high rating is the strongest taste signal we have; simply having watched
// something counts for less, since people watch things they end up disliking.
const WATCHED_WEIGHT = 3;

export interface UpcomingForYou {
  items: MovieCard[];
  // Genre names the picks were based on — empty when we fall back to popularity.
  genres: string[];
  personalised: boolean;
}

async function topGenres(userId: string, take: number): Promise<string[]> {
  const [ratings, watched] = await Promise.all([
    prisma.rating.findMany({
      where:  { user_id: userId },
      select: { overall_score: true, movie: { select: { genres: true } } },
      take:   500,
    }),
    prisma.watchHistory.findMany({
      where:  { user_id: userId, status: "watched" },
      select: { movie: { select: { genres: true } } },
      take:   500,
    }),
  ]);

  const weight: Record<string, number> = {};
  for (const r of ratings) {
    for (const g of r.movie.genres) weight[g] = (weight[g] ?? 0) + r.overall_score;
  }
  for (const w of watched) {
    for (const g of w.movie.genres) weight[g] = (weight[g] ?? 0) + WATCHED_WEIGHT;
  }

  return Object.entries(weight)
    .filter(([name]) => GENRE_ID_BY_NAME[name] !== undefined)
    .sort((a, b) => b[1] - a[1])
    .slice(0, take)
    .map(([name]) => name);
}

function toCard(m: {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
}): MovieCard {
  return {
    id:           String(m.id),
    tmdb_id:      m.id,
    title:        m.title,
    poster_url:   m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
    release_date: m.release_date,
    voltv_score:  null,
    genres:       [],
    runtime:      null,
    is_upcoming:  true,
  };
}

export async function getUpcomingForYou(
  userId: string | null,
  limit = 12,
): Promise<UpcomingForYou> {
  const genres = userId ? await topGenres(userId, 3) : [];
  const genreIds = genres.map((g) => GENRE_ID_BY_NAME[g]);

  // No region filter, so this is worldwide rather than US-only. "|" is OR in
  // TMDB's discover syntax: any of the user's top genres qualifies.
  const today = new Date().toISOString().slice(0, 10);
  const params = {
    "primary_release_date.gte": today,
    sort_by: "popularity.desc",
    ...(genreIds.length > 0 ? { with_genres: genreIds.join("|") } : {}),
  };

  let results;
  try {
    results = (await discoverMovies(params)).results;
  } catch {
    return { items: [], genres: [], personalised: false };
  }

  const items = results
    // discover can still return a title that came out today, so re-check.
    .filter((m) => m.poster_path && isUnreleased(m.release_date))
    .slice(0, limit)
    .map(toCard);

  return { items, genres, personalised: genreIds.length > 0 };
}
