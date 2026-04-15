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

  const dbUser = await prisma.user.findUnique({ where: { supabase_id: user.id }, select: { id: true } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  try {
    // Toggle like
    const existing = await prisma.reviewLike.findUnique({
      where: { user_id_review_id: { user_id: dbUser.id, review_id: reviewId } },
    });

    if (existing) {
      await prisma.reviewLike.delete({
        where: { user_id_review_id: { user_id: dbUser.id, review_id: reviewId } },
      });
      await prisma.review.update({
        where: { id: reviewId },
        data:  { likes_count: { decrement: 1 } },
      });
      return NextResponse.json({ liked: false });
    } else {
      await prisma.reviewLike.create({
        data: { user_id: dbUser.id, review_id: reviewId },
      });
      const review = await prisma.review.update({
        where: { id: reviewId },
        data:  { likes_count: { increment: 1 } },
        select: { user_id: true, movie_id: true },
      });

      // Notify review author
      if (review.user_id !== dbUser.id) {
        await prisma.notification.create({
          data: {
            user_id:         review.user_id,
            type:            "review_liked",
            message:         `Someone liked your review!`,
            related_movie_id: review.movie_id,
            related_user_id:  dbUser.id,
          },
        });
      }

      return NextResponse.json({ liked: true });
    }
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json({ liked: true });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
