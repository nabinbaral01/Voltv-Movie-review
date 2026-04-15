import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";

// GET — user notifications
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const page  = parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10);
  const limit = 20;

  const dbUser = await prisma.user.findUnique({ where: { supabase_id: user.id }, select: { id: true } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where:   { user_id: dbUser.id },
      orderBy: { created_at: "desc" },
      skip:    (page - 1) * limit,
      take:    limit,
      include: { related_movie: { select: { id: true, tmdb_id: true, title: true, poster_url: true } } },
    }),
    prisma.notification.count({ where: { user_id: dbUser.id, is_read: false } }),
  ]);

  return NextResponse.json({ data: notifications, unread_count: unreadCount });
}

// PATCH — mark notifications as read
export async function PATCH(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { notification_ids } = await req.json() as { notification_ids?: string[] };

  const dbUser = await prisma.user.findUnique({ where: { supabase_id: user.id }, select: { id: true } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await prisma.notification.updateMany({
    where: {
      user_id: dbUser.id,
      ...(notification_ids?.length ? { id: { in: notification_ids } } : {}),
    },
    data: { is_read: true },
  });

  return NextResponse.json({ success: true });
}
