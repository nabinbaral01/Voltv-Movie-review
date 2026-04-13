import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function PATCH(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where:  { supabase_id: user.id },
    select: { id: true, is_banned: true },
  });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (dbUser.is_banned) return NextResponse.json({ error: "Account banned" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { username, bio, avatar_url, banner_url, trailer_url, personality_type } = body as {
    username?: string;
    bio?: string | null;
    avatar_url?: string | null;
    banner_url?: string | null;
    trailer_url?: string | null;
    personality_type?: string | null;
  };

  const data: Record<string, string | null> = {};
  if (username !== undefined) {
    const trimmed = username.trim();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(trimmed)) {
      return NextResponse.json(
        { error: "Username must be 3–20 characters, letters/numbers/underscore only" },
        { status: 400 },
      );
    }
    const existing = await prisma.user.findUnique({
      where:  { username: trimmed },
      select: { id: true },
    });
    if (existing && existing.id !== dbUser.id) {
      return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
    }
    data.username = trimmed;
  }
  if (bio !== undefined) {
    if (bio && bio.length > 500) {
      return NextResponse.json({ error: "Bio too long (max 500)" }, { status: 400 });
    }
    data.bio = bio || null;
  }
  if (avatar_url !== undefined)       data.avatar_url       = avatar_url || null;
  if (banner_url !== undefined)       data.banner_url       = banner_url || null;
  if (trailer_url !== undefined)     data.trailer_url      = trailer_url || null;
  if (personality_type !== undefined) data.personality_type = personality_type || null;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: dbUser.id },
    data,
    select: {
      username: true,
      bio: true,
      avatar_url: true,
      banner_url: true,
      trailer_url: true,
      personality_type: true,
    },
  });

  return NextResponse.json({ data: updated });
}
