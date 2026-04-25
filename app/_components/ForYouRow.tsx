import Link from "next/link";
import { Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getRecommendations, getQuickRecommendations } from "@/lib/recommendation-engine";
import MovieCard from "@/components/movie/MovieCard";
import type { MovieCard as MovieCardType } from "@/types";
import type { TasteDNA } from "@/types";

export default async function ForYouRow() {
  const supabase = await createServerSupabaseClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return null;

  const dbUser = await prisma.user.findUnique({
    where:  { supabase_id: authUser.id },
    select: { id: true, taste_dna: true, username: true },
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

  if (recs.length === 0) {
    return (
      <section className="space-y-3">
        <Header username={dbUser.username} />
        <div className="rounded-2xl border border-[#1E1E2E] bg-gradient-to-br from-[#12121A] to-[#0A0A0F] p-6 text-center">
          <p className="text-sm text-[#A0A0B0] mb-3">
            Watch a few movies and we&apos;ll learn your taste.
          </p>
          <Link
            href="/discover"
            className="inline-flex items-center gap-1.5 h-9 px-4 bg-[#E50914] hover:bg-[#C50812] text-white text-sm font-semibold rounded-full transition-colors"
          >
            Browse movies →
          </Link>
        </div>
      </section>
    );
  }

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
    <section className="space-y-3">
      <Header username={dbUser.username} />
      <div className="flex gap-4 overflow-x-auto no-scrollbar px-4 md:px-0 pb-2">
        {movies.map((m) => (
          <div key={m.id} className="shrink-0">
            <MovieCard movie={m} size="md" />
          </div>
        ))}
      </div>
    </section>
  );
}

function Header({ username }: { username: string }) {
  return (
    <div className="flex items-center justify-between px-4 md:px-0">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#3B82F6] flex items-center justify-center shadow-[0_0_14px_rgba(139,92,246,0.4)]">
          <Sparkles size={13} className="text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white leading-none">For You</h2>
          <p className="text-[10px] text-[#6B6B80] mt-0.5">Tuned to @{username}&apos;s taste</p>
        </div>
      </div>
      <Link
        href="/recommendations"
        className="text-xs font-semibold text-[#E50914] hover:text-[#FF1F2E] transition-colors"
      >
        See all →
      </Link>
    </div>
  );
}
