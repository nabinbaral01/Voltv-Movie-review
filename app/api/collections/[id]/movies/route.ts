import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";

async function authorize(collectionId: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { err: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const [dbUser, collection] = await Promise.all([
    prisma.user.findUnique({ where: { supabase_id: user.id }, select: { id: true } }),
    prisma.collection.findUnique({ where: { id: collectionId }, select: { user_id: true } }),
  ]);
  if (!dbUser)        return { err: NextResponse.json({ error: "User not found" }, { status: 404 }) };
  if (!collection)    return { err: NextResponse.json({ error: "Collection not found" }, { status: 404 }) };
  if (collection.user_id !== dbUser.id) {
    return { err: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { userId: dbUser.id };
}

// POST — add a movie to the collection (by movie_id OR tmdb_id)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: collectionId } = await params;
  const { err } = await authorize(collectionId);
  if (err) return err;

  const body = await req.json().catch(() => ({}));
  const { movie_id, tmdb_id } = body as { movie_id?: string; tmdb_id?: number };

  let resolvedMovieId: string | null = null;
  if (movie_id) {
    const m = await prisma.movie.findUnique({ where: { id: movie_id }, select: { id: true } });
    resolvedMovieId = m?.id ?? null;
  } else if (tmdb_id) {
    const m = await prisma.movie.findUnique({ where: { tmdb_id }, select: { id: true } });
    resolvedMovieId = m?.id ?? null;
  }
  if (!resolvedMovieId) {
    return NextResponse.json(
      { error: "Movie not synced yet — open the movie page first, then retry" },
      { status: 404 }
    );
  }

  // Use last position + 1
  const last = await prisma.collectionMovie.findFirst({
    where:  { collection_id: collectionId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  await prisma.collectionMovie.upsert({
    where:  { collection_id_movie_id: { collection_id: collectionId, movie_id: resolvedMovieId } },
    update: {},
    create: { collection_id: collectionId, movie_id: resolvedMovieId, position: (last?.position ?? 0) + 1 },
  });

  await prisma.collection.update({ where: { id: collectionId }, data: { updated_at: new Date() } });

  return NextResponse.json({ ok: true });
}

// DELETE — remove a movie from the collection
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: collectionId } = await params;
  const { err } = await authorize(collectionId);
  if (err) return err;

  const movieId = req.nextUrl.searchParams.get("movie_id");
  if (!movieId) return NextResponse.json({ error: "movie_id required" }, { status: 400 });

  await prisma.collectionMovie.delete({
    where: { collection_id_movie_id: { collection_id: collectionId, movie_id: movieId } },
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
