import { prisma } from "@/lib/prisma";

type Mv = {
  id: string;
  title: string;
  genres: string[];
  release_date: Date | null;
  tmdb_popularity: number | null;
};

function dayOnly(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function decade(d: Date | null) {
  if (!d) return null;
  return Math.floor(d.getUTCFullYear() / 10) * 10;
}

const QUESTIONS: Record<string, string[]> = {
  Action:          ["Which action flick hits harder?", "Pick your action favorite."],
  Adventure:       ["Which adventure do you pick?", "Which world do you wanna get lost in?"],
  Drama:           ["Which drama cuts deeper?", "Which one moved you more?"],
  Thriller:        ["Which thriller kept you on edge?", "Which one had the better twist?"],
  Comedy:          ["Which one makes you laugh more?", "Which comedy ages better?"],
  "Science Fiction":["Which sci-fi vision wins?", "Which one blew your mind harder?"],
  Fantasy:         ["Which fantasy world do you pick?", "Which one has the better magic?"],
  Crime:           ["Which crime movie grips you more?", "Which underworld do you pick?"],
  Horror:          ["Which one scared you more?", "Which horror holds up better?"],
  Family:          ["Which one would you show the kids?", "Which family flick wins?"],
  Animation:       ["Which animated film wins?", "Which one has the better animation?"],
  Romance:         ["Which love story wins?", "Which romance hits harder?"],
  Mystery:         ["Which mystery keeps you guessing?", "Which reveal landed better?"],
  default:         ["Which one takes the crown?", "Which is the better watch?"],
};

function pickQuestion(genre: string, i: number) {
  const pool = QUESTIONS[genre] ?? QUESTIONS.default;
  return pool[i % pool.length];
}

async function createDebate(params: {
  date: Date;
  question: string;
  a: Mv;
  b: Mv;
}) {
  const debate_date = dayOnly(params.date);
  const expires_at  = new Date(debate_date.getTime() + 24 * 60 * 60 * 1000);

  await prisma.dailyDebate.upsert({
    where:  { debate_date },
    update: {
      question:   params.question,
      option_a:   params.a.title,
      option_b:   params.b.title,
      movie_a_id: params.a.id,
      movie_b_id: params.b.id,
      expires_at,
    },
    create: {
      question:   params.question,
      option_a:   params.a.title,
      option_b:   params.b.title,
      movie_a_id: params.a.id,
      movie_b_id: params.b.id,
      debate_date,
      expires_at,
    },
  });
}

async function main() {
  const movies = (await prisma.movie.findMany({
    select: { id: true, title: true, genres: true, release_date: true, tmdb_popularity: true },
  })) as Mv[];

  if (movies.length < 2) {
    console.log("Need >= 2 movies; aborting.");
    return;
  }

  // Group by (genre, decade)
  const groups = new Map<string, Mv[]>();
  for (const m of movies) {
    const dec = decade(m.release_date);
    if (!dec) continue;
    for (const g of m.genres) {
      const key = `${g}::${dec}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(m);
    }
  }

  // Keep only groups with >= 2 movies, sort each by popularity desc
  const viable = [...groups.entries()]
    .filter(([, arr]) => arr.length >= 2)
    .map(([key, arr]) => {
      arr.sort((a, b) => (b.tmdb_popularity ?? 0) - (a.tmdb_popularity ?? 0));
      return { key, arr };
    });

  // Ensure we pick the Animation group first if it exists (anime/animated section)
  viable.sort((a, b) => {
    const aAnim = a.key.startsWith("Animation::") ? 0 : 1;
    const bAnim = b.key.startsWith("Animation::") ? 0 : 1;
    if (aAnim !== bAnim) return aAnim - bAnim;
    return b.arr.length - a.arr.length;
  });

  const today       = new Date();
  const NEEDED      = 6;
  const PER_GENRE   = 1;   // at most 1 debate per genre — keep the feed diverse
  const usedPairs   = new Set<string>();
  const usedMovies  = new Set<string>();
  const perGenreCnt = new Map<string, number>();
  const picks: { genre: string; decade: number; a: Mv; b: Mv }[] = [];

  for (const { key, arr } of viable) {
    if (picks.length >= NEEDED) break;
    const [genre, decStr] = key.split("::");
    const dec = Number(decStr);
    if ((perGenreCnt.get(genre) ?? 0) >= PER_GENRE) continue;

    for (let i = 0; i < arr.length - 1; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        if (usedMovies.has(arr[i].id) || usedMovies.has(arr[j].id)) continue;
        const pairKey = [arr[i].id, arr[j].id].sort().join("|");
        if (usedPairs.has(pairKey)) continue;
        usedPairs.add(pairKey);
        usedMovies.add(arr[i].id);
        usedMovies.add(arr[j].id);
        perGenreCnt.set(genre, (perGenreCnt.get(genre) ?? 0) + 1);
        picks.push({ genre, decade: dec, a: arr[i], b: arr[j] });
        break;
      }
      if ((perGenreCnt.get(genre) ?? 0) >= PER_GENRE) break;
    }
  }

  if (picks.length === 0) {
    console.log("No viable same-genre / same-decade pairs found.");
    return;
  }

  // Assign today + past days
  for (let i = 0; i < picks.length; i++) {
    const p = picks[i];
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - i);
    await createDebate({
      date,
      question: pickQuestion(p.genre, i),
      a: p.a,
      b: p.b,
    });
    console.log(`seeded [${p.genre} · ${p.decade}s]: ${p.a.title}  vs  ${p.b.title}`);
  }

  const count = await prisma.dailyDebate.count();
  console.log(`\ntotal debates in DB: ${count}`);
}

main().finally(() => prisma.$disconnect());
