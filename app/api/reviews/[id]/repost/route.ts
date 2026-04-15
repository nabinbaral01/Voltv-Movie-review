import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: reviewId } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { supabase_id: user.id }, select: { id: true },
  });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const existing = await prisma.repost.findUnique({
    where: { user_id_review_id: { user_id: dbUser.id, review_id: reviewId } },
  });

  if (existing) {
    await prisma.$transaction([
      prisma.repost.delete({
        where: { user_id_review_id: { user_id: dbUser.id, review_id: reviewId } },
      }),
      prisma.review.update({
        where: { id: reviewId },
        data:  { reposts_count: { decrement: 1 } },
      }),
    ]);
    return NextResponse.json({ reposted: false });
  }

  const [, review] = await prisma.$transaction([
    prisma.repost.create({ data: { user_id: dbUser.id, review_id: reviewId } }),
    prisma.review.update({
      where:  { id: reviewId },
      data:   { reposts_count: { increment: 1 } },
      select: { user_id: true, movie_id: true },
    }),
  ]);

  if (review.user_id !== dbUser.id) {
    await prisma.notification.create({
      data: {
        user_id:          review.user_id,
        type:             "review_liked",
        message:          "Someone reposted your post",
        related_movie_id: review.movie_id,
        related_user_id:  dbUser.id,
      },
    });
  }

  return NextResponse.json({ reposted: true });
}
