import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { z } from "zod";

const ReportSchema = z.object({
  reason: z.enum(["spam", "hate_speech", "spoiler_abuse", "harassment", "misinformation", "other"]),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: reviewId } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body   = await req.json();
  const parsed = ReportSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const dbUser = await prisma.user.findUnique({ where: { supabase_id: user.id }, select: { id: true } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const review = await prisma.review.findUnique({ where: { id: reviewId }, select: { id: true, user_id: true } });
  if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });
  if (review.user_id === dbUser.id) return NextResponse.json({ error: "Cannot report your own review" }, { status: 400 });

  // Prevent duplicate reports
  const existing = await prisma.report.findFirst({
    where: { reporter_id: dbUser.id, review_id: reviewId },
  });
  if (existing) return NextResponse.json({ error: "Already reported" }, { status: 409 });

  await prisma.$transaction([
    prisma.report.create({
      data: {
        reporter_id: dbUser.id,
        review_id:   reviewId,
        reason:      parsed.data.reason,
      },
    }),
    prisma.review.update({
      where: { id: reviewId },
      data:  { reports_count: { increment: 1 } },
    }),
  ]);

  // Auto-hide if 5+ reports
  await prisma.review.updateMany({
    where: { id: reviewId, reports_count: { gte: 5 }, is_hidden: false },
    data:  { is_hidden: true, hidden_reason: "Auto-hidden: multiple reports" },
  });

  return NextResponse.json({ success: true });
}
