import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { z } from "zod";

const CollectionSchema = z.object({
  title:       z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  mood_tag:    z.string().optional(),
  genre_tag:   z.string().optional(),
  is_public:   z.boolean().optional().default(true),
});

// GET — user's collections or public collections
export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  const page     = parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10);
  const limit    = 12;

  let userId: string | undefined;
  if (username) {
    const u = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    userId  = u?.id;
  }

  const where = {
    ...(userId ? { user_id: userId } : { is_public: true }),
  };

  const [collections, total] = await Promise.all([
    prisma.collection.findMany({
      where,
      include: {
        user:   { select: { id: true, username: true, avatar_url: true } },
        movies: { take: 4, include: { movie: { select: { poster_url: true, title: true } } } },
        _count: { select: { movies: true } },
      },
      orderBy: { created_at: "desc" },
      skip:    (page - 1) * limit,
      take:    limit,
    }),
    prisma.collection.count({ where }),
  ]);

  return NextResponse.json({ data: collections, total, page, has_more: page * limit < total });
}

// POST — create collection
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body   = await req.json();
  const parsed = CollectionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const dbUser = await prisma.user.findUnique({ where: { supabase_id: user.id } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Free tier: max 5 collections
  if (dbUser.subscription_tier === "free") {
    const count = await prisma.collection.count({ where: { user_id: dbUser.id } });
    if (count >= 5) {
      return NextResponse.json(
        { error: "Free tier limited to 5 collections. Upgrade to Pro for unlimited." },
        { status: 403 }
      );
    }
  }

  const collection = await prisma.collection.create({
    data: {
      user_id:     dbUser.id,
      title:       parsed.data.title,
      description: parsed.data.description ?? null,
      mood_tag:    parsed.data.mood_tag    ?? null,
      genre_tag:   parsed.data.genre_tag   ?? null,
      is_public:   parsed.data.is_public,
    },
  });

  return NextResponse.json({ data: collection }, { status: 201 });
}
