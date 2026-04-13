// ─────────────────────────────────────
// VOLTV — Badge Engine
// Checks and awards badges after actions
// ─────────────────────────────────────

import { prisma } from "@/lib/prisma";
import { ALL_BADGES } from "@/types";

export async function checkAndAwardBadges(userId: string): Promise<string[]> {
  const awarded: string[] = [];

  const [user, existing, stats] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { created_at: true, streak_count: true, xp_points: true },
    }),
    prisma.achievement.findMany({
      where: { user_id: userId },
      select: { badge_id: true },
    }),
    getStats(userId),
  ]);

  if (!user) return [];

  const earnedIds = new Set(existing.map((a) => a.badge_id));

  // ── Badge checks ─────────────────────────────────────────

  async function tryAward(badgeId: string) {
    if (earnedIds.has(badgeId)) return;
    const badge = ALL_BADGES.find((b) => b.id === badgeId);
    if (!badge) return;

    await prisma.achievement.create({
      data: {
        user_id:    userId,
        badge_id:   badgeId,
        badge_name: badge.name,
        badge_type: badge.type,
        badge_icon: badge.icon,
        description: badge.description,
      },
    });
    earnedIds.add(badgeId);
    awarded.push(badgeId);
  }

  // Common badges
  if (stats.reviews >= 1)                        await tryAward("first_review");
  if (stats.movies >= 100)                       await tryAward("centurion");
  if (stats.genres >= 5)                         await tryAward("genre_explorer");
  if (user.streak_count >= 7)                    await tryAward("streak_starter");
  if (stats.debate_votes >= 1)                   await tryAward("first_debate");
  if (stats.predictions >= 1)                    await tryAward("first_prediction");

  // Rare badges
  if (stats.horror_movies >= 50)                 await tryAward("horror_master");
  if (stats.countries >= 20)                     await tryAward("world_cinema");
  if (stats.decades >= 8)                        await tryAward("decade_hopper");
  if (stats.review_likes >= 100)                 await tryAward("hot_take_king");

  // Epic badges
  if (stats.reviews >= 100)                      await tryAward("review_legend");
  if (stats.debate_wins >= 10)                   await tryAward("debate_champion");

  // Legendary
  if (user.streak_count >= 365)                  await tryAward("streak_god");

  // VOLTV OG — first 1000 users ever
  const totalUsers = await prisma.user.count();
  if (totalUsers <= 1000)                        await tryAward("voltv_og");

  return awarded;
}

async function getStats(userId: string) {
  const [
    movies, reviews, horror, countries, decades,
    debateVotes, predictions, reviewLikes, debateWins
  ] = await Promise.all([
    prisma.watchHistory.count({ where: { user_id: userId, status: "watched" } }),
    prisma.review.count({ where: { user_id: userId } }),
    prisma.watchHistory.count({
      where: {
        user_id: userId,
        status:  "watched",
        movie:   { genres: { has: "Horror" } },
      },
    }),
    prisma.watchHistory.findMany({
      where:  { user_id: userId, status: "watched" },
      select: { movie: { select: { countries: true } } },
    }).then((rows: { movie: { countries: string[] } }[]) => {
      const c = new Set<string>();
      rows.forEach((r) => r.movie.countries.forEach((cc: string) => c.add(cc)));
      return c.size;
    }),
    prisma.watchHistory.findMany({
      where:  { user_id: userId, status: "watched" },
      select: { movie: { select: { release_date: true } } },
    }).then((rows: { movie: { release_date: Date | null } }[]) => {
      const d = new Set<string>();
      rows.forEach((r) => {
        if (r.movie.release_date) {
          d.add(String(Math.floor(new Date(r.movie.release_date).getFullYear() / 10) * 10));
        }
      });
      return d.size;
    }),
    prisma.debateVote.count({ where: { user_id: userId } }),
    prisma.predictions.count({ where: { user_id: userId } }),
    prisma.reviewLike.count({ where: { review: { user_id: userId } } }),
    prisma.rating.count({ where: { user_id: userId } }),
    prisma.rating.findMany({
      where: { user_id: userId },
      select: { movie: { select: { genres: true } } },
    }).then((rows: { movie: { genres: string[] } }[]) => {
      const g = new Set<string>();
      rows.forEach((r) => r.movie.genres.forEach((g2: string) => g.add(g2)));
      return g.size;
    }),
  ]);

  return {
    movies,
    reviews,
    horror_movies: horror,
    countries,
    decades,
    genres: await prisma.rating.findMany({
      where: { user_id: userId },
      select: { movie: { select: { genres: true } } },
    }).then((rows: { movie: { genres: string[] } }[]) => {
      const g = new Set<string>();
      rows.forEach((r) => r.movie.genres.forEach((g2: string) => g.add(g2)));
      return g.size;
    }),
    debate_votes:  debateVotes,
    predictions,
    review_likes:  reviewLikes,
    debate_wins:   0,
  };
}
