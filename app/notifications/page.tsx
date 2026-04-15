import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Topbar from "@/components/layout/Topbar";
import Sidebar, { BottomNav } from "@/components/layout/Sidebar";
import { timeAgo } from "@/utils/formatters";
import type { Metadata } from "next";
import type { NotificationType } from "@prisma/client";
import {
  Film, Clapperboard, Vote, Flame, Trophy, Heart, Target,
  Zap, Radio, BarChart2, Info, Bell, CheckCheck,
} from "lucide-react";

export const metadata: Metadata = { title: "Notifications" };

type NotifMeta = {
  icon:  React.ReactNode;
  tint:  string;  // bg gradient / solid for the icon tile
  ring:  string;  // border accent for unread
};

const META: Record<NotificationType, NotifMeta> = {
  friend_logged: {
    icon: <Film size={16} />,
    tint: "from-[#E50914] to-[#8B5CF6]",
    ring: "border-l-[#E50914]",
  },
  new_film_director: {
    icon: <Clapperboard size={16} />,
    tint: "from-[#8B5CF6] to-[#3B82F6]",
    ring: "border-l-[#8B5CF6]",
  },
  daily_debate_live: {
    icon: <Vote size={16} />,
    tint: "from-[#F59E0B] to-[#E50914]",
    ring: "border-l-[#F59E0B]",
  },
  streak_at_risk: {
    icon: <Flame size={16} />,
    tint: "from-[#FF6B35] to-[#E50914]",
    ring: "border-l-[#FF6B35]",
  },
  badge_unlocked: {
    icon: <Trophy size={16} />,
    tint: "from-[#FACC15] to-[#F59E0B]",
    ring: "border-l-[#FACC15]",
  },
  review_liked: {
    icon: <Heart size={16} />,
    tint: "from-[#EC4899] to-[#E50914]",
    ring: "border-l-[#EC4899]",
  },
  prediction_result: {
    icon: <Target size={16} />,
    tint: "from-[#10B981] to-[#3B82F6]",
    ring: "border-l-[#10B981]",
  },
  weekly_challenge: {
    icon: <Zap size={16} />,
    tint: "from-[#FACC15] to-[#8B5CF6]",
    ring: "border-l-[#FACC15]",
  },
  leaving_streaming: {
    icon: <Radio size={16} />,
    tint: "from-[#3B82F6] to-[#8B5CF6]",
    ring: "border-l-[#3B82F6]",
  },
  weekly_digest: {
    icon: <BarChart2 size={16} />,
    tint: "from-[#64748B] to-[#334155]",
    ring: "border-l-[#64748B]",
  },
  system: {
    icon: <Info size={16} />,
    tint: "from-[#475569] to-[#1E293B]",
    ring: "border-l-[#64748B]",
  },
};

function groupKey(d: Date): "today" | "week" | "earlier" {
  const now = Date.now();
  const diff = now - d.getTime();
  const DAY = 86_400_000;
  if (diff < DAY) return "today";
  if (diff < DAY * 7) return "week";
  return "earlier";
}

const GROUP_LABEL: Record<"today" | "week" | "earlier", string> = {
  today:   "Today",
  week:    "This week",
  earlier: "Earlier",
};

export default async function NotificationsPage() {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const notifications = await prisma.notification.findMany({
    where: { user_id: me.id },
    orderBy: { created_at: "desc" },
    take: 100,
    include: {
      related_movie: { select: { id: true, title: true, poster_url: true } },
    },
  });

  const relatedUserIds = Array.from(
    new Set(notifications.map((n) => n.related_user_id).filter(Boolean) as string[]),
  );
  const relatedUsers = relatedUserIds.length
    ? await prisma.user.findMany({
        where:  { id: { in: relatedUserIds } },
        select: { id: true, username: true, avatar_url: true },
      })
    : [];
  const userById = new Map(relatedUsers.map((u) => [u.id, u]));

  const unreadBeforeMarking = notifications.filter((n) => !n.is_read).length;

  await prisma.notification.updateMany({
    where: { user_id: me.id, is_read: false },
    data:  { is_read: true },
  });

  // Group by time bucket — preserves desc order
  const groups: Record<"today" | "week" | "earlier", typeof notifications> = {
    today:   [],
    week:    [],
    earlier: [],
  };
  for (const n of notifications) groups[groupKey(n.created_at)].push(n);

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Topbar unreadCount={0} />
      <div className="flex pt-14">
        <div className="hidden lg:block w-[240px] shrink-0"><Sidebar /></div>

        <main className="flex-1 min-w-0 max-w-2xl mx-auto pb-24 lg:pb-10 px-4 sm:px-6">
          {/* Sticky header */}
          <div className="sticky top-14 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 bg-[#0A0A0F]/90 backdrop-blur-md border-b border-[#1E1E2E]">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-[#E50914]" />
                <h1 className="text-lg font-bold text-white">Notifications</h1>
                {notifications.length > 0 && (
                  <span className="text-xs text-[#505060] font-mono">
                    {notifications.length}
                  </span>
                )}
              </div>
              {unreadBeforeMarking > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-[#A0A0B0]">
                  <CheckCheck size={14} className="text-[#10B981]" />
                  <span>Marked {unreadBeforeMarking} read</span>
                </div>
              )}
            </div>
          </div>

          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-full bg-[#1A1A28] flex items-center justify-center mb-4">
                <Bell size={26} className="text-[#505060]" />
              </div>
              <p className="text-white font-semibold mb-1">All caught up</p>
              <p className="text-[#505060] text-sm max-w-xs">
                When someone interacts with you or something happens on VOLTV, you&apos;ll see it here.
              </p>
            </div>
          ) : (
            <div className="pt-4 space-y-6">
              {(["today", "week", "earlier"] as const).map((bucket) => {
                const items = groups[bucket];
                if (items.length === 0) return null;
                return (
                  <section key={bucket}>
                    <h2 className="text-xs font-semibold text-[#505060] uppercase tracking-wider px-1 mb-2">
                      {GROUP_LABEL[bucket]}
                    </h2>
                    <div className="space-y-1.5">
                      {items.map((notif) => {
                        const meta = META[notif.type] ?? META.system;
                        const user = notif.related_user_id
                          ? userById.get(notif.related_user_id)
                          : null;
                        const href = notif.related_movie
                          ? `/movie/${notif.related_movie.id}`
                          : user
                          ? `/profile/${user.username}`
                          : "#";

                        return (
                          <Link
                            key={notif.id}
                            href={href}
                            className={`group relative flex items-start gap-3 p-3 sm:p-4 rounded-[12px] bg-[#12121A] border border-[#1E1E2E] hover:border-white/20 hover:bg-[#15151F] transition-all border-l-2 ${
                              !notif.is_read ? meta.ring : "border-l-transparent"
                            }`}
                          >
                            {/* Icon tile or avatar */}
                            {user?.avatar_url ? (
                              <div className="relative w-10 h-10 shrink-0">
                                <div className="w-10 h-10 rounded-full overflow-hidden bg-[#1A1A28]">
                                  <Image
                                    src={user.avatar_url}
                                    alt={user.username}
                                    width={40}
                                    height={40}
                                    className="object-cover w-full h-full"
                                  />
                                </div>
                                <span className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-gradient-to-br ${meta.tint} flex items-center justify-center text-white ring-2 ring-[#12121A]`}>
                                  {meta.icon}
                                </span>
                              </div>
                            ) : (
                              <div className={`w-10 h-10 shrink-0 rounded-full bg-gradient-to-br ${meta.tint} flex items-center justify-center text-white`}>
                                {meta.icon}
                              </div>
                            )}

                            {/* Body */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white leading-snug">
                                {notif.message}
                              </p>

                              {notif.related_movie && (
                                <div className="mt-2 inline-flex items-center gap-2 rounded-[8px] bg-white/[0.04] border border-[#1E1E2E] px-2 py-1">
                                  {notif.related_movie.poster_url && (
                                    <Image
                                      src={notif.related_movie.poster_url}
                                      alt=""
                                      width={20}
                                      height={30}
                                      className="rounded-[2px] object-cover"
                                      style={{ width: "auto", height: "auto", maxHeight: 30 }}
                                    />
                                  )}
                                  <span className="text-xs text-[#A0A0B0] truncate max-w-[180px]">
                                    {notif.related_movie.title}
                                  </span>
                                </div>
                              )}

                              <p className="text-[11px] text-[#505060] mt-1.5">
                                {timeAgo(notif.created_at.toISOString())}
                              </p>
                            </div>

                            {!notif.is_read && (
                              <span className="mt-1 w-2 h-2 rounded-full bg-[#E50914] shrink-0 shadow-[0_0_6px_#E50914]" />
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
