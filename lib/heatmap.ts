// ─────────────────────────────────────
// VOLTV — Heatmap Data Generator
// Powers the GitHub-style activity grid
// ─────────────────────────────────────

import { prisma } from "@/lib/prisma";
import type { HeatmapData, HeatmapDay } from "@/types";

function intensityLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3)  return 2;
  if (count <= 5)  return 3;
  return 4;
}

// Generate 52-week heatmap for a user
export async function generateHeatmap(userId: string): Promise<HeatmapData> {
  const endDate   = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 364); // 52 weeks

  const watchedMovies = await prisma.watchHistory.findMany({
    where: {
      user_id: userId,
      status:  "watched",
      watched_date: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      watched_date: true,
      movie: {
        select: { title: true, poster_url: true },
      },
    },
    orderBy: { watched_date: "asc" },
  });

  // Group by date string
  const byDate = new Map<string, { title: string; poster_url: string | null }[]>();

  for (const entry of watchedMovies) {
    const dateStr = entry.watched_date.toISOString().split("T")[0];
    if (!byDate.has(dateStr)) byDate.set(dateStr, []);
    byDate.get(dateStr)!.push(entry.movie);
  }

  // Build 365-day array
  const days: HeatmapDay[] = [];
  let currentDate = new Date(startDate);
  let longestStreak = 0;
  let currentStreak = 0;
  let totalDaysActive = 0;
  let totalMovies = 0;

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split("T")[0];
    const movies  = byDate.get(dateStr) ?? [];
    const count   = movies.length;

    days.push({
      date:      dateStr,
      count,
      movies:    movies.slice(0, 5), // max 5 in tooltip
      intensity: intensityLevel(count),
    });

    if (count > 0) {
      totalDaysActive++;
      totalMovies += count;
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Calculate current ongoing streak (from today backwards)
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].count > 0) streak++;
    else break;
  }

  return {
    days,
    total_days_active: totalDaysActive,
    total_movies:      totalMovies,
    longest_streak:    longestStreak,
    current_streak:    streak,
  };
}

// Compute current user streak (weekly — log 1 film/week = maintained)
export async function updateStreak(userId: string): Promise<{
  streak_count: number;
  streak_maintained: boolean;
}> {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { streak_count: true, streak_last_date: true, streak_shields: true },
  });

  if (!user) return { streak_count: 0, streak_maintained: false };

  const now       = new Date();
  const today     = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastDate  = user.streak_last_date
    ? new Date(user.streak_last_date)
    : null;

  // Already logged today
  if (lastDate && lastDate.getTime() === today.getTime()) {
    return { streak_count: user.streak_count, streak_maintained: true };
  }

  // Check if it's within 7 days (weekly streak window)
  const daysSinceLast = lastDate
    ? Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
    : Infinity;

  let newStreak = user.streak_count;
  let maintained = true;

  if (daysSinceLast <= 7) {
    newStreak += 1;
  } else if (user.streak_shields > 0) {
    // Use shield to protect streak
    await prisma.user.update({
      where: { id: userId },
      data:  { streak_shields: { decrement: 1 } },
    });
    newStreak += 1;
  } else {
    newStreak = 1;
    maintained = false;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      streak_count:     newStreak,
      streak_last_date: today,
    },
  });

  return { streak_count: newStreak, streak_maintained: maintained };
}
