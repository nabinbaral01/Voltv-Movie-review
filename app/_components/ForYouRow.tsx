import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getRecommendations, getQuickRecommendations } from "@/lib/recommendation-engine";
import { MovieRow } from "@/components/movie/MovieCard";
import type { MovieCard as MovieCardType } from "@/types";
import type { TasteDNA } from "@/types";

export default async function ForYouRow() {
  const supabase = await createServerSupabaseClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return null;

  const dbUser = await prisma.user.findUnique({
    where:  { supabase_id: authUser.id },
    select: { id: true, taste_dna: true },
  });
  if (!dbUser) return null;

  let recs = await getRecommendations(dbUser.id, 12);

  if (recs.length < 5) {
    const dna = (dbUser.taste_dna as TasteDNA | null) ?? {
      action: 50, drama: 50, horror: 50, comedy: 50,
      scifi: 50, romance: 50, thriller: 50, anime: 50,
    };
    const fallback = await getQuickRecommendations(dna, recs.map((r) => r.movie_id), 12 - recs.length);
    recs = [...recs, ...fallback];
  }

  if (recs.length === 0) return null;

  const movies: MovieCardType[] = recs.map((r) => ({
    id:           r.movie_id,
    tmdb_id:      r.tmdb_id,
    title:        r.title,
    poster_url:   r.poster_url,
    release_date: r.release_date ? new Date(r.release_date).toISOString() : null,
    voltv_score:  r.voltv_score,
    genres:       r.genres,
    runtime:      r.runtime,
  }));

  return (
    <div className="relative">
      <MovieRow
        title="For You"
        movies={movies}
        size="md"
        viewAllHref="/recommendations"
      />
      <div className="absolute top-0 right-0 flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-[#505060] bg-[#1A1A28] px-2 py-0.5 rounded">
          AI-Powered
        </span>
      </div>
    </div>
  );
}
