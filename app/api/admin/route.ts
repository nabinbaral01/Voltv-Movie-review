import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";

// Admin-only middleware helper
async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const dbUser = await prisma.user.findUnique({
    where:  { supabase_id: user.id },
    select: { id: true, is_admin: true },
  });
  if (!dbUser?.is_admin) return null;
  return dbUser;
}

// GET — admin dashboard stats
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const action = req.nextUrl.searchParams.get("action");

  switch (action) {
    case "stats": {
      const [users, movies, ratings, reviews, reports] = await Promise.all([
        prisma.user.count(),
        prisma.movie.count(),
        prisma.rating.count(),
        prisma.review.count(),
        prisma.report.count({ where: { status: "pending" } }),
      ]);
      const recentUsers = await prisma.user.findMany({
        orderBy: { created_at: "desc" },
        take:    10,
        select:  { id: true, username: true, email: true, created_at: true, subscription_tier: true },
      });
      return NextResponse.json({ data: { users, movies, ratings, reviews, pending_reports: reports, recent_users: recentUsers } });
    }

    case "reports": {
      const reports = await prisma.report.findMany({
        where:   { status: "pending" },
        include: {
          reporter:      { select: { username: true } },
          reported_user: { select: { username: true } },
          review:        { select: { content: true, user: { select: { username: true } } } },
        },
        orderBy: { created_at: "desc" },
        take:    50,
      });
      return NextResponse.json({ data: reports });
    }

    case "debates": {
      const debates = await prisma.dailyDebate.findMany({
        orderBy: { debate_date: "desc" },
        take:    10,
      });
      return NextResponse.json({ data: debates });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}

// POST — admin actions
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body   = await req.json() as { action: string; [key: string]: unknown };
  const action = body.action;

  switch (action) {
    case "ban_user": {
      const { user_id } = body as { user_id: string; action: string };
      await prisma.user.update({ where: { id: user_id }, data: { is_banned: true } });
      return NextResponse.json({ success: true });
    }

    case "hide_review": {
      const { review_id, reason } = body as { review_id: string; reason: string; action: string };
      await prisma.review.update({
        where: { id: review_id },
        data:  { is_hidden: true, hidden_reason: reason ?? "Admin moderation" },
      });
      return NextResponse.json({ success: true });
    }

    case "resolve_report": {
      const { report_id } = body as { report_id: string; action: string };
      await prisma.report.update({
        where: { id: report_id },
        data:  { status: "resolved", resolved_by: admin.id },
      });
      return NextResponse.json({ success: true });
    }

    case "create_debate": {
      const { question, option_a, option_b, movie_a_id, movie_b_id, debate_date } =
        body as { question: string; option_a: string; option_b: string; movie_a_id: string; movie_b_id: string; debate_date: string; action: string };

      const date     = new Date(debate_date);
      const expires  = new Date(date);
      expires.setHours(23, 59, 59, 999);

      const debate = await prisma.dailyDebate.create({
        data: { question, option_a, option_b, movie_a_id, movie_b_id, debate_date: date, expires_at: expires },
      });
      return NextResponse.json({ data: debate }, { status: 201 });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
