import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (q.length < 2) {
    return NextResponse.json({ data: { results: [] } });
  }

  const users = await prisma.user.findMany({
    where: {
      is_banned: false,
      OR: [
        { username: { contains: q, mode: "insensitive" } },
        { bio:      { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id:                true,
      username:          true,
      avatar_url:        true,
      bio:               true,
      level:             true,
      xp_points:         true,
      is_blue_tick:      true,
      subscription_tier: true,
      _count: { select: { followers: true } },
    },
    orderBy: [
      { xp_points: "desc" },
      { username:  "asc" },
    ],
    take: 25,
  });

  return NextResponse.json({ data: { results: users } });
}
