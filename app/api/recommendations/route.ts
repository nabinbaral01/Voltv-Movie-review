import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getRecommendations, getQuickRecommendations } from "@/lib/recommendation-engine";
import type { TasteDNA } from "@/types";

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where:  { supabase_id: user.id },
    select: { id: true, taste_dna: true },
  });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const limit = Math.min(30, parseInt(req.nextUrl.searchParams.get("limit") ?? "20", 10));

  try {
    const recs = await getRecommendations(dbUser.id, limit);

    if (recs.length < 5) {
      const dna = (dbUser.taste_dna as TasteDNA | null) ?? {
        action: 50, drama: 50, horror: 50, comedy: 50,
        scifi: 50, romance: 50, thriller: 50, anime: 50,
      };
      const fallback = await getQuickRecommendations(dna, recs.map((r) => r.movie_id), limit - recs.length);
      recs.push(...fallback);
    }

    return NextResponse.json({
      data:  recs,
      count: recs.length,
      algorithm: "hybrid_v1",
      layers: ["collaborative_filtering", "content_based", "ml_scoring", "deep_embedding", "ranking"],
    });
  } catch (e) {
    console.error("Recommendation error:", e);
    return NextResponse.json({ error: "Failed to generate recommendations" }, { status: 500 });
  }
}
