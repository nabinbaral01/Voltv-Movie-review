import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";

// GET /api/user/follow?username=xxx → check if current user follows username
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUsername = searchParams.get("username");
  if (!targetUsername) return NextResponse.json({ error: "Missing username" }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ following: false });

  const [dbUser, target] = await Promise.all([
    prisma.user.findUnique({ where: { supabase_id: user.id }, select: { id: true } }),
    prisma.user.findUnique({ where: { username: targetUsername }, select: { id: true } }),
  ]);

  if (!dbUser || !target) return NextResponse.json({ following: false });

  const follow = await prisma.follow.findUnique({
    where: { follower_id_following_id: { follower_id: dbUser.id, following_id: target.id } },
  });

  return NextResponse.json({ following: !!follow });
}

// POST /api/user/follow → toggle follow for { username }
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const targetUsername: string = body.username;
  if (!targetUsername) return NextResponse.json({ error: "Missing username" }, { status: 400 });

  const [dbUser, target] = await Promise.all([
    prisma.user.findUnique({ where: { supabase_id: user.id }, select: { id: true } }),
    prisma.user.findUnique({ where: { username: targetUsername }, select: { id: true } }),
  ]);

  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!target) return NextResponse.json({ error: "Target user not found" }, { status: 404 });
  if (dbUser.id === target.id) return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });

  const existing = await prisma.follow.findUnique({
    where: { follower_id_following_id: { follower_id: dbUser.id, following_id: target.id } },
  });

  if (existing) {
    await prisma.follow.delete({
      where: { follower_id_following_id: { follower_id: dbUser.id, following_id: target.id } },
    });
    return NextResponse.json({ following: false });
  } else {
    await prisma.follow.create({
      data: { follower_id: dbUser.id, following_id: target.id },
    });

    // Notify the followed user
    await prisma.notification.create({
      data: {
        user_id:        target.id,
        type:           "friend_logged",
        message:        "Someone started following you!",
        related_user_id: dbUser.id,
      },
    }).catch(() => {});

    return NextResponse.json({ following: true });
  }
}
