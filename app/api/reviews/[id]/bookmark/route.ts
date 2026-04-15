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

  const existing = await prisma.bookmark.findUnique({
    where: { user_id_review_id: { user_id: dbUser.id, review_id: reviewId } },
  });

  if (existing) {
    await prisma.bookmark.delete({
      where: { user_id_review_id: { user_id: dbUser.id, review_id: reviewId } },
    });
    return NextResponse.json({ bookmarked: false });
  }

  await prisma.bookmark.create({ data: { user_id: dbUser.id, review_id: reviewId } });
  return NextResponse.json({ bookmarked: true });
}
