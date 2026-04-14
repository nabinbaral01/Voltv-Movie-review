import fs from "node:fs/promises";
import path from "node:path";
import type { MovieComment } from "./comment-stats";

export type { Verdict, MovieComment, CommentStats } from "./comment-stats";
export { statsFor, verdictOf } from "./comment-stats";

const FILE = path.join(process.cwd(), "data", "comments.json");

export async function readCommentsFor(tmdbId: number): Promise<MovieComment[]> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const store = JSON.parse(raw) as Record<string, MovieComment[]>;
    return store[String(tmdbId)] ?? [];
  } catch {
    return [];
  }
}
