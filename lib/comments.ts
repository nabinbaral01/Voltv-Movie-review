import fs from "node:fs/promises";
import path from "node:path";
import type { MovieComment } from "./comment-stats";

export type { Verdict, MovieComment, CommentStats } from "./comment-stats";
export { statsFor, verdictOf } from "./comment-stats";

const FILE = path.join(process.cwd(), "data", "comments.json");

export type MediaKind = "movie" | "tv";

export function commentKey(tmdbId: number, kind: MediaKind = "movie"): string {
  return kind === "tv" ? `tv:${tmdbId}` : String(tmdbId);
}

export function episodeKey(tvId: number, seasonNumber: number, episodeNumber: number): string {
  return `tv:${tvId}:s${seasonNumber}:e${episodeNumber}`;
}

export async function readCommentsFor(tmdbId: number, kind: MediaKind = "movie"): Promise<MovieComment[]> {
  return readCommentsByScope(commentKey(tmdbId, kind));
}

export async function readCommentsByScope(scope: string): Promise<MovieComment[]> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const store = JSON.parse(raw) as Record<string, MovieComment[]>;
    return store[scope] ?? [];
  } catch {
    return [];
  }
}
