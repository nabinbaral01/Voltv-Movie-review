import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { z } from "zod";
import { awardXP } from "@/lib/xp-system";
import { rateLimit } from "@/lib/redis";
import { Filter } from "bad-words";

const filter = new Filter();

const ReviewSchema = z.object({
  movie_id:         z.string().min(1).optional(), // optional if replying (inherits from parent)
  content:          z.string().max(2000).optional().default(""),
  type:             z.enum(["hot_take", "full_review"]).optional().default("hot_take"),
  is_spoiler:       z.boolean().optional().default(false),
  is_anonymous:     z.boolean().optional().default(false),
  visibility:       z.enum(["public", "unlisted", "followers"]).optional().default("public"),
  media_urls:       z.array(z.string().url()).max(4).optional().default([]),
  media_type:       z.enum(["image", "video"]).optional(),
  parent_id:        z.string().optional(),
  quoted_review_id: z.string().optional(),
});

// GET — reviews for a movie
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const movie_id = searchParams.get("movie_id");
  const type     = searchParams.get("type") as "hot_take" | "full_review" | null;
  const spoiler  = searchParams.get("spoiler") === "true";
  const page     = parseInt(searchParams.get("page") ?? "1", 10);
  const limit    = 10;

  if (!movie_id) return NextResponse.json({ error: "movie_id required" }, { status: 400 });

  const where = {
    movie_id,
    is_hidden: false,
    ...(type     ? { type }          : {}),
    ...(spoiler  ? { is_spoiler: true } : type ? { is_spoiler: false } : {}),
  };

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        user: {
          select: {
            id: true, username: true, avatar_url: true,
            subscription_tier: true, is_blue_tick: true,
          },
        },
      },
      orderBy: [
        // Legend/Pro reviews first
        { user: { subscription_tier: "desc" } },
        { likes_count: "desc" },
      ],
      skip:  (page - 1) * limit,
      take:  limit,
    }),
    prisma.review.count({ where }),
  ]);

  return NextResponse.json({
    data:     reviews,
    total,
    page,
    has_more: page * limit < total,
  });
}

// POST — create review
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit: free = 10/hour, pro/legend = 30/hour
  const { allowed } = await rateLimit(user.id, "review_post", 10, 3600);
  if (!allowed) {
    return NextResponse.json({ error: "Review limit reached. Try again later." }, { status: 429 });
  }

  const body   = await req.json();
  const parsed = ReviewSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  let { movie_id } = parsed.data;
  const { content, type, is_spoiler, parent_id, quoted_review_id,
          is_anonymous, visibility, media_urls, media_type } = parsed.data;

  if (content.trim().length < 1 && media_urls.length === 0) {
    return NextResponse.json({ error: "Empty post" }, { status: 422 });
  }

  const dbUser = await prisma.user.findUnique({ where: { supabase_id: user.id } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (dbUser.is_banned) return NextResponse.json({ error: "Account suspended" }, { status: 403 });

  // If replying, inherit movie_id from parent
  let parentUserId: string | null = null;
  if (parent_id) {
    const parent = await prisma.review.findUnique({
      where:  { id: parent_id },
      select: { movie_id: true, user_id: true },
    });
    if (!parent) return NextResponse.json({ error: "Parent post not found" }, { status: 404 });
    movie_id = movie_id || parent.movie_id;
    parentUserId = parent.user_id;
  }

  if (quoted_review_id) {
    const q = await prisma.review.findUnique({
      where:  { id: quoted_review_id },
      select: { movie_id: true },
    });
    if (!q) return NextResponse.json({ error: "Quoted post not found" }, { status: 404 });
    movie_id = movie_id || q.movie_id;
  }

  // movie_id is optional — freeform posts allowed

  // New user 24-hour review limit
  const accountAgeHours = (Date.now() - new Date(dbUser.created_at).getTime()) / 3600000;
  if (accountAgeHours < 24) {
    const todayReviews = await prisma.review.count({
      where: {
        user_id:    dbUser.id,
        created_at: { gte: new Date(Date.now() - 86400000) },
      },
    });
    if (todayReviews >= 3) {
      return NextResponse.json(
        { error: "New accounts are limited to 3 reviews in the first 24 hours." },
        { status: 429 }
      );
    }
  }

  // Auto-flag profanity (hide, don't block)
  const hasProfanity = content ? filter.isProfane(content) : false;

  const review = await prisma.review.create({
    data: {
      user_id:   dbUser.id,
      movie_id:  movie_id ?? null,
      content,
      type,
      is_spoiler,
      is_anonymous,
      visibility,
      media_urls,
      media_type: media_type ?? null,
      is_hidden: hasProfanity,
      parent_id:        parent_id ?? null,
      quoted_review_id: quoted_review_id ?? null,
    },
  });

  // Bump counters on parent/quoted + notify
  if (parent_id) {
    await prisma.review.update({
      where: { id: parent_id },
      data:  { replies_count: { increment: 1 } },
    });
    if (parentUserId && parentUserId !== dbUser.id) {
      await prisma.notification.create({
        data: {
          user_id:          parentUserId,
          type:             "review_liked",
          message:          "Someone replied to your post",
          related_movie_id: movie_id,
          related_user_id:  dbUser.id,
        },
      });
    }
  }

  // Check if first review of this movie → +20 XP bonus (only when tied to a movie)
  let isFirst = false;
  if (movie_id) {
    const reviewCount = await prisma.review.count({ where: { movie_id } });
    isFirst           = reviewCount === 1;
    await Promise.all([
      awardXP(dbUser.id, isFirst ? "first_review_movie" : "write_review"),
      prisma.movie.update({
        where: { id: movie_id },
        data:  { total_reviews_count: { increment: 1 } },
      }),
      prisma.activityFeed.create({
        data: { user_id: dbUser.id, activity_type: "wrote_review", movie_id },
      }),
    ]);
  } else {
    await awardXP(dbUser.id, "write_review");
  }

  return NextResponse.json(
    { data: review, xp_gained: isFirst ? 20 : 25 },
    { status: 201 }
  );
}
