export type Verdict = "skip" | "timepass" | "watchit" | "masterpiece";

export interface MovieComment {
  id:        string;
  tmdb_id:   number;
  username:  string;
  verdict?:  Verdict;
  rating?:   number;
  text:      string;
  createdAt: string;
}

export interface CommentStats {
  count:     number;
  avg:       number | null;
  score_pct: number;
  buckets:   { skip: number; timepass: number; watchit: number; masterpiece: number };
  pct:       { skip: number; timepass: number; watchit: number; masterpiece: number };
}

const VERDICT_SCORE: Record<Verdict, number> = {
  skip: 10, timepass: 45, watchit: 75, masterpiece: 100,
};

export function verdictOf(c: MovieComment): Verdict {
  if (c.verdict) return c.verdict;
  const r = c.rating ?? 5;
  if (r <= 3) return "skip";
  if (r <= 5) return "timepass";
  if (r <= 7) return "watchit";
  return "masterpiece";
}

export function statsFor(comments: MovieComment[]): CommentStats {
  const count = comments.length;
  if (count === 0) {
    return {
      count: 0, avg: null, score_pct: 0,
      buckets: { skip: 0, timepass: 0, watchit: 0, masterpiece: 0 },
      pct:     { skip: 0, timepass: 0, watchit: 0, masterpiece: 0 },
    };
  }
  const buckets = { skip: 0, timepass: 0, watchit: 0, masterpiece: 0 };
  let scoreSum = 0;
  for (const c of comments) {
    const v = verdictOf(c);
    buckets[v]++;
    scoreSum += VERDICT_SCORE[v];
  }
  const score_pct = Math.round(scoreSum / count);
  const pct = {
    skip:        Math.round((buckets.skip        / count) * 100),
    timepass:    Math.round((buckets.timepass    / count) * 100),
    watchit:     Math.round((buckets.watchit     / count) * 100),
    masterpiece: Math.round((buckets.masterpiece / count) * 100),
  };
  return { count, avg: score_pct / 10, score_pct, buckets, pct };
}
