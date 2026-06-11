import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import DebateClientWrapper from "@/app/_components/DebateClientWrapper";
import Topbar from "@/components/layout/Topbar";
import Sidebar, { BottomNav } from "@/components/layout/Sidebar";
import type { DailyDebate } from "@/types";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Daily Debates" };

async function getDebates(): Promise<DailyDebate[]> {
  try {
    const debates = await prisma.dailyDebate.findMany({
      orderBy: { debate_date: "desc" },
      take: 30,
      include: {
        movie_a: {
          select: {
            id: true, tmdb_id: true, title: true, poster_url: true,
            release_date: true, voltv_score: true, genres: true, runtime: true,
          },
        },
        movie_b: {
          select: {
            id: true, tmdb_id: true, title: true, poster_url: true,
            release_date: true, voltv_score: true, genres: true, runtime: true,
          },
        },
      },
    });

    return debates.map((d) => ({
      id:          d.id,
      question:    d.question,
      option_a:    d.option_a,
      option_b:    d.option_b,
      category:    d.category ?? "general",
      votes_a:     d.votes_a,
      votes_b:     d.votes_b,
      debate_date: d.debate_date.toISOString(),
      expires_at:  d.expires_at.toISOString(),
      movie_a: {
        id:           d.movie_a.id,
        tmdb_id:      d.movie_a.tmdb_id,
        title:        d.movie_a.title,
        poster_url:   d.movie_a.poster_url,
        release_date: d.movie_a.release_date?.toISOString() ?? null,
        voltv_score:  d.movie_a.voltv_score,
        genres:       d.movie_a.genres,
        runtime:      d.movie_a.runtime,
      },
      movie_b: {
        id:           d.movie_b.id,
        tmdb_id:      d.movie_b.tmdb_id,
        title:        d.movie_b.title,
        poster_url:   d.movie_b.poster_url,
        release_date: d.movie_b.release_date?.toISOString() ?? null,
        voltv_score:  d.movie_b.voltv_score,
        genres:       d.movie_b.genres,
        runtime:      d.movie_b.runtime,
      },
      user_vote: null,
    }));
  } catch {
    return [];
  }
}

async function getUserVotes(userId: string, debateIds: string[]): Promise<Record<string, "a" | "b">> {
  try {
    const votes = await prisma.debateVote.findMany({
      where: { user_id: userId, debate_id: { in: debateIds } },
      select: { debate_id: true, choice: true },
    });
    const map: Record<string, "a" | "b"> = {};
    for (const v of votes) {
      map[v.debate_id] = v.choice as "a" | "b";
    }
    return map;
  } catch {
    return {};
  }
}

export default async function DebatesPage() {
  const debates = await getDebates();

  // Try to get user votes
  let userVotes: Record<string, "a" | "b"> = {};
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const dbUser = await prisma.user.findUnique({
        where: { supabase_id: user.id },
        select: { id: true },
      });
      if (dbUser) {
        userVotes = await getUserVotes(dbUser.id, debates.map((d) => d.id));
      }
    }
  } catch {}

  const debatesWithVotes = debates.map((d) => ({
    ...d,
    user_vote: userVotes[d.id] ?? null,
  }));

  const todayStr = new Date().toISOString().slice(0, 10);
  const live = debatesWithVotes.filter((d) => d.debate_date.slice(0, 10) === todayStr);
  const past = debatesWithVotes.filter((d) => d.debate_date.slice(0, 10) !== todayStr);

  return (
    <div className="relative min-h-screen bg-[#070914] overflow-hidden">
      {/* Cool ambient blobs — blue/violet/cyan bokeh under the glass */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-40 -left-32 w-[560px] h-[560px] rounded-full bg-[#3B82F6]/35 blur-[140px]" />
        <div className="absolute top-1/4 right-[-10%] w-[600px] h-[600px] rounded-full bg-[#8B5CF6]/35 blur-[160px]" />
        <div className="absolute bottom-[-15%] left-1/4 w-[520px] h-[520px] rounded-full bg-[#06B6D4]/25 blur-[150px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[380px] h-[380px] rounded-full bg-[#A78BFA]/15 blur-[120px]" />
      </div>

      <Topbar />
      <div className="relative z-10 flex pt-14">
        <div className="hidden lg:block w-[240px] shrink-0"><Sidebar /></div>
        <main className="flex-1 min-w-0 max-w-3xl mx-auto px-4 py-6 pb-24 lg:pb-8">
          {/* One big glass shell wrapping the whole dashboard */}
          <div className="glass-ios p-5 sm:p-7">
            {/* Header */}
            <div className="mb-7">
              <h1 className="font-display text-3xl sm:text-4xl text-white mb-2">DAILY DEBATES</h1>
              <p className="text-[#A8B0C8] text-sm">
                Cast your vote · Earn +5 XP · See how the world thinks
              </p>
            </div>

            {/* Today's live debates */}
            {live.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full bg-[#3B82F6] animate-pulse shadow-[0_0_12px_rgba(59,130,246,0.8)]" />
                  <span className="text-xs font-bold text-[#3B82F6] uppercase tracking-wider">
                    Live Today {live.length > 1 && `· ${live.length} debates`}
                  </span>
                </div>
                <div className="space-y-5">
                  {live.map((d) => (
                    <div key={d.id}>
                      {d.category && d.category !== "general" && (
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#8B5CF6] mb-2">
                          {d.category.replace(/_/g, " ")}
                        </div>
                      )}
                      <DebateClientWrapper debate={d} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Past debates */}
            {past.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-white mb-4">Past Debates</h2>
                <div className="space-y-4">
                  {past.map((debate) => (
                    <DebateClientWrapper key={debate.id} debate={debate} />
                  ))}
                </div>
              </section>
            )}

            {debates.length === 0 && (
              <div className="text-center py-20">
                <p className="text-5xl mb-4">🗳️</p>
                <p className="text-[#A8B0C8]">No debates yet — check back tomorrow.</p>
              </div>
            )}
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
