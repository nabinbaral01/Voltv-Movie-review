import { prisma } from "./prisma";
import type { MovieComment, Verdict } from "./comment-stats";

export type { Verdict, MovieComment, CommentStats } from "./comment-stats";
export { statsFor, verdictOf } from "./comment-stats";

export type MediaKind = "movie" | "tv";

export function commentKey(tmdbId: number, kind: MediaKind = "movie"): string {
  return kind === "tv" ? `tv:${tmdbId}` : String(tmdbId);
}

export function episodeKey(tvId: number, seasonNumber: number, episodeNumber: number): string {
  return `tv:${tvId}:s${seasonNumber}:e${episodeNumber}`;
}

// Map a Prisma row to the MovieComment shape callers expect (createdAt as ISO string).
export function toMovieComment(r: {
  id: string; tmdb_id: number; username: string;
  verdict: string | null; rating: number | null; text: string; created_at: Date;
}): MovieComment {
  return {
    id:        r.id,
    tmdb_id:   r.tmdb_id,
    username:  r.username,
    verdict:   (r.verdict ?? undefined) as Verdict | undefined,
    rating:    r.rating ?? undefined,
    text:      r.text,
    createdAt: r.created_at.toISOString(),
  };
}

export async function readCommentsFor(tmdbId: number, kind: MediaKind = "movie"): Promise<MovieComment[]> {
  return readCommentsByScope(commentKey(tmdbId, kind));
}

export async function readCommentsByScope(scope: string): Promise<MovieComment[]> {
  const rows = await prisma.movieComment.findMany({
    where:   { scope },
    orderBy: { created_at: "desc" },
  });
  return rows.map(toMovieComment);
}
