import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import Topbar from "@/components/layout/Topbar";
import Sidebar, { BottomNav } from "@/components/layout/Sidebar";
import FollowsList from "../_components/FollowsList";

export async function generateMetadata(
  { params }: { params: Promise<{ username: string }> },
): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username} — Following` };
}

export default async function FollowingPage(
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;

  const user = await prisma.user.findUnique({
    where:  { username },
    select: { id: true, username: true },
  });
  if (!user) notFound();

  const me = await getSessionUser();

  const follows = await prisma.follow.findMany({
    where:   { follower_id: user.id },
    orderBy: { created_at: "desc" },
    include: {
      following: {
        select: {
          id:           true,
          username:     true,
          avatar_url:   true,
          bio:          true,
          xp_points:    true,
          is_blue_tick: true,
          _count:       { select: { followers: true } },
        },
      },
    },
  });

  const ids = follows.map((f) => f.following.id);
  const myFollowing = me
    ? await prisma.follow.findMany({
        where:  { follower_id: me.id, following_id: { in: ids } },
        select: { following_id: true },
      })
    : [];
  const iFollowSet = new Set(myFollowing.map((f) => f.following_id));

  const users = follows.map((f) => ({
    id:             f.following.id,
    username:       f.following.username,
    avatar_url:     f.following.avatar_url,
    bio:            f.following.bio,
    xp_points:      f.following.xp_points,
    is_blue_tick:   f.following.is_blue_tick,
    followersCount: f.following._count.followers,
    amFollowing:    iFollowSet.has(f.following.id),
  }));

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Topbar />
      <div className="flex pt-14">
        <div className="hidden lg:block w-[240px] shrink-0"><Sidebar /></div>

        <main className="flex-1 min-w-0 max-w-3xl mx-auto pb-24 lg:pb-8 px-4 sm:px-6">
          <div className="flex items-center gap-3 py-4 border-b border-[#1E1E2E] mb-4">
            <Link
              href={`/profile/${user.username}`}
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-white"
              aria-label="Back to profile"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white">Following</h1>
              <p className="text-xs text-[#505060]">@{user.username}</p>
            </div>
          </div>

          <FollowsList
            users={users}
            currentUserId={me?.id ?? null}
            emptyMessage="Not following anyone yet."
          />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
