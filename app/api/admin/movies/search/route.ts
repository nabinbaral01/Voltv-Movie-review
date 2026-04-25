import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireLiveAdmin } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  if (!(await requireLiveAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ data: [] });

  const movies = await prisma.movie.findMany({
    where:   { title: { contains: q, mode: "insensitive" } },
    orderBy: [{ tmdb_popularity: "desc" }, { release_date: "desc" }],
    take:    12,
    select: {
      id: true, title: true, poster_url: true, release_date: true,
      genres: true, voltv_score: true,
    },
  });

  return NextResponse.json({
    data: movies.map((m) => ({
      id:           m.id,
      title:        m.title,
      poster_url:   m.poster_url,
      release_year: m.release_date ? new Date(m.release_date).getUTCFullYear() : null,
      genres:       m.genres,
      voltv_score:  m.voltv_score,
    })),
  });
}
