import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";

// GET → { watched: number[], want_to_watch: number[] } (TMDB ids)
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ watched: [], want_to_watch: [] });

  const dbUser = await prisma.user.findUnique({
    where: { supabase_id: user.id }, select: { id: true },
  });
  if (!dbUser) return NextResponse.json({ watched: [], want_to_watch: [] });

  const rows = await prisma.watchHistory.findMany({
    where:  { user_id: dbUser.id, status: { in: ["watched", "want_to_watch"] } },
    select: { status: true, movie: { select: { tmdb_id: true } } },
  });

  const watched: number[] = [];
  const want:    number[] = [];
  for (const r of rows) {
    if (!r.movie?.tmdb_id) continue;
    (r.status === "watched" ? watched : want).push(r.movie.tmdb_id);
  }
  return NextResponse.json({ watched, want_to_watch: want });
}
