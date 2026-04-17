import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { z } from "zod";
import { awardXP } from "@/lib/xp-system";
import { rateLimit, deleteCache, CacheKeys } from "@/lib/redis";

const VoteSchema = z.object({
  debate_id: z.string().min(1),
  choice:    z.enum(["a", "b"]),
});

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 1 vote per debate per user enforced at DB level (unique constraint)
  // Additionally rate limit at 5 votes/minute (bot protection)
  const { allowed } = await rateLimit(user.id, "debate_vote", 5, 60);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body   = await req.json();
  const parsed = VoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { debate_id, choice } = parsed.data;

  try {
    const dbUser = await prisma.user.findUnique({
      where:  { supabase_id: user.id },
      select: { id: true, is_banned: true },
    });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (dbUser.is_banned) return NextResponse.json({ error: "Account suspended" }, { status: 403 });

    // Validate debate exists and not expired
    const debate = await prisma.dailyDebate.findUnique({
      where:  { id: debate_id },
      select: { id: true, expires_at: true, votes_a: true, votes_b: true },
    });
    if (!debate) return NextResponse.json({ error: "Debate not found" }, { status: 404 });
    if (new Date() > new Date(debate.expires_at)) {
      return NextResponse.json({ error: "Debate has ended" }, { status: 400 });
    }

    // Create vote (unique constraint prevents double voting)
    await prisma.debateVote.create({
      data: { user_id: dbUser.id, debate_id, choice },
    });

    // Increment vote count atomically
    const updated = await prisma.dailyDebate.update({
      where: { id: debate_id },
      data:  {
        votes_a: choice === "a" ? { increment: 1 } : undefined,
        votes_b: choice === "b" ? { increment: 1 } : undefined,
      },
      select: { votes_a: true, votes_b: true },
    });

    // Award XP
    await awardXP(dbUser.id, "daily_debate_vote");

    // Bust debate cache
    await deleteCache(CacheKeys.dailyDebate());

    return NextResponse.json({
      data: {
        votes_a: updated.votes_a,
        votes_b: updated.votes_b,
        user_vote: choice,
      },
    });
  } catch (err: unknown) {
    // Unique constraint violation = already voted
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Already voted in this debate" }, { status: 409 });
    }
    console.error("[/api/debates/vote]", err);
    return NextResponse.json({ error: "Failed to record vote" }, { status: 500 });
  }
}
