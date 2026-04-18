import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { z } from "zod";
import { awardXP } from "@/lib/xp-system";
import { updateStreak } from "@/lib/heatmap";
import { prisma as db } from "@/lib/prisma";
import { deleteCache, CacheKeys } from "@/lib/redis";

const WatchlistSchema = z.object({
  movie_id: z.string().min(1),
  status:   z.enum(["want_to_watch", "watching", "watched"]),
  watched_date: z.string().optional(),
  personal_notes: z.string().max(2000).optional(),
});

// GET — user's watchlist
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = req.nextUrl.searchParams.get("status");
  const page   = parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10);
  const limit  = 20;

  const dbUser = await prisma.user.findUnique({ where: { supabase_id: user.id }, select: { id: true } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const where = {
    user_id: dbUser.id,
    ...(status ? { status: status as "want_to_watch" | "watching" | "watched" } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.watchHistory.findMany({
      where,
      include: { movie: true },
      orderBy: { updated_at: "desc" },
      skip:    (page - 1) * limit,
      take:    limit,
    }),
    prisma.watchHistory.count({ where }),
  ]);

  return NextResponse.json({
    data:     items,
    total,
    page,
    has_more: page * limit < total,
  });
}

// POST — add or update watchlist entry
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body   = await req.json();
  const parsed = WatchlistSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { movie_id, status, watched_date, personal_notes } = parsed.data;

  const dbUser = await prisma.user.findUnique({ where: { supabase_id: user.id } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const existing = await prisma.watchHistory.findUnique({
    where: { user_id_movie_id: { user_id: dbUser.id, movie_id } },
  });

  const entry = await prisma.watchHistory.upsert({
    where:  { user_id_movie_id: { user_id: dbUser.id, movie_id } },
    create: {
      user_id:      dbUser.id,
      movie_id,
      status,
      watched_date: watched_date ? new Date(watched_date) : new Date(),
      personal_notes: personal_notes ?? null,
    },
    update: {
      status,
      watched_date: watched_date ? new Date(watched_date) : new Date(),
      personal_notes: personal_notes ?? null,
      rewatch_count: status === "watched" && existing?.status === "watched"
        ? { increment: 1 }
        : undefined,
    },
  });

  // XP + streak when marking watched (first time only — no XP farming on re-save)
  if (status === "watched") {
    const isNewWatch = !existing || existing.status !== "watched";
    await Promise.all([
      isNewWatch ? awardXP(dbUser.id, "log_movie") : Promise.resolve(),
      updateStreak(dbUser.id),
      deleteCache(CacheKeys.heatmap(dbUser.id)),
      isNewWatch
        ? prisma.activityFeed.create({
            data: { user_id: dbUser.id, activity_type: "added_watchlist", movie_id },
          })
        : Promise.resolve(),
    ]);
  }

  return NextResponse.json({ data: entry });
}

// DELETE — remove from watchlist
export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const movie_id = req.nextUrl.searchParams.get("movie_id");
  if (!movie_id) return NextResponse.json({ error: "movie_id required" }, { status: 400 });

  const dbUser = await prisma.user.findUnique({ where: { supabase_id: user.id }, select: { id: true } });
  if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.watchHistory.deleteMany({ where: { user_id: dbUser.id, movie_id } });
  return NextResponse.json({ success: true });
}
