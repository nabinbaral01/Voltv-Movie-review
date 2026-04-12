import { prisma } from "@/lib/prisma";
import DebateClientWrapper from "@/app/_components/DebateClientWrapper";
import type { DailyDebate } from "@/types";

async function getTodayDebate(): Promise<DailyDebate | null> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const debate = await prisma.dailyDebate.findFirst({
      where: { debate_date: today },
      include: {
        movie_a: {
          select: { id: true, tmdb_id: true, title: true, poster_url: true, release_date: true, voltv_score: true, genres: true, runtime: true },
        },
        movie_b: {
          select: { id: true, tmdb_id: true, title: true, poster_url: true, release_date: true, voltv_score: true, genres: true, runtime: true },
        },
      },
    });

    if (!debate) return null;

    return {
      id:         debate.id,
      question:   debate.question,
      option_a:   debate.option_a,
      option_b:   debate.option_b,
      votes_a:    debate.votes_a,
      votes_b:    debate.votes_b,
      debate_date: debate.debate_date.toISOString(),
      expires_at:  debate.expires_at.toISOString(),
      movie_a: {
        id:           debate.movie_a.id,
        tmdb_id:      debate.movie_a.tmdb_id,
        title:        debate.movie_a.title,
        poster_url:   debate.movie_a.poster_url,
        release_date: debate.movie_a.release_date?.toISOString() ?? null,
        voltv_score:  debate.movie_a.voltv_score,
        genres:       debate.movie_a.genres,
        runtime:      debate.movie_a.runtime,
      },
      movie_b: {
        id:           debate.movie_b.id,
        tmdb_id:      debate.movie_b.tmdb_id,
        title:        debate.movie_b.title,
        poster_url:   debate.movie_b.poster_url,
        release_date: debate.movie_b.release_date?.toISOString() ?? null,
        voltv_score:  debate.movie_b.voltv_score,
        genres:       debate.movie_b.genres,
        runtime:      debate.movie_b.runtime,
      },
      user_vote: null,
    };
  } catch {
    return null;
  }
}

export default async function TodayDebate() {
  const debate = await getTodayDebate();

  if (!debate) {
    return (
      <div className="card p-6 text-center">
        <p className="text-2xl mb-2">🗳️</p>
        <p className="text-[#A0A0B0] text-sm">No debate today — check back later.</p>
      </div>
    );
  }

  return <DebateClientWrapper debate={debate} />;
}
