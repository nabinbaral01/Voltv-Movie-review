"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useMe } from "@/components/hooks/useMe";
import {
  Home, Film, Compass, Flame, Trophy, BookMarked,
  Users, Settings, Zap, BarChart2, Shapes, PenSquare,
  MoreHorizontal, X, User as UserIcon,
} from "lucide-react";
import { cn } from "@/utils/formatters";
import { useCompose } from "@/components/compose/ComposeProvider";

interface NavItem {
  href:   string;
  label:  string;
  icon:   React.ReactNode;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/",            label: "Home",        icon: <Home size={18} /> },
  { href: "/discover",    label: "Discover",    icon: <Compass size={18} /> },
  { href: "/in-theater",  label: "In Theater",  icon: <Film size={18} /> },
  { href: "/categories",  label: "Categories",  icon: <Shapes size={18} /> },
  { href: "/debates",     label: "Debates",     icon: <Flame size={18} />, badge: "LIVE" },
  { href: "/collections", label: "Collections", icon: <BookMarked size={18} /> },
  { href: "/leaderboard", label: "Leaderboard", icon: <Trophy size={18} /> },
  { href: "/social",      label: "Social",      icon: <Users size={18} /> },
  { href: "/recommendations", label: "For You", icon: <Zap size={18} /> },
];

const BOTTOM_ITEMS: NavItem[] = [
  { href: "/settings", label: "Settings", icon: <Settings size={18} /> },
];

interface SidebarProps {
  streakCount?: number;
  xpPoints?:   number;
  username?:   string;
  avatarUrl?:  string | null;
  open?:       boolean;
  onClose?:    () => void;
}

export default function Sidebar({
  streakCount,
  xpPoints,
  username,
  avatarUrl,
  open,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();
  const { me } = useMe();
  const { openCompose } = useCompose();

  const displayName   = username ?? me?.username ?? "Guest";
  const displayXP     = xpPoints ?? me?.xp_points ?? 0;
  const displayStreak = streakCount ?? me?.streak_count ?? 0;
  const displayAvatar = avatarUrl ?? me?.avatar_url ?? null;
  const hasUser       = !!me || !!username;

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-[790] lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-14 bottom-0 z-[800] w-[240px]",
          "flex flex-col border-r border-[#1E1E2E] bg-[#0A0A0F]",
          "transition-transform duration-300",
          // Desktop: always visible
          "lg:translate-x-0",
          // Mobile: slide in/out
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* User mini card */}
        {hasUser ? (
          <div className="p-4 border-b border-[#1E1E2E]">
            <Link href={`/profile/${displayName}`} className="flex items-center gap-3 group" onClick={onClose}>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#E50914] to-[#8B5CF6] shrink-0 flex items-center justify-center text-sm font-bold overflow-hidden">
                {displayAvatar ? (
                  <Image src={displayAvatar} alt={displayName} width={36} height={36} className="object-cover w-full h-full" />
                ) : (
                  displayName[0]?.toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white truncate group-hover:text-[#E50914] transition-colors">
                  @{displayName}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-[#505060] font-mono">
                    ⚡ {displayXP.toLocaleString()} XP
                  </span>
                  {displayStreak > 0 && (
                    <span className="text-xs streak-active font-bold">
                      🔥 {displayStreak}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </div>
        ) : (
          <div className="p-4 border-b border-[#1E1E2E]">
            <Link href="/login" onClick={onClose} className="btn-primary w-full h-9 flex items-center justify-center text-sm">
              Login
            </Link>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={pathname === item.href}
              onClick={onClose}
            />
          ))}

          {/* Post button */}
          <button
            onClick={() => { onClose?.(); openCompose(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-sm font-medium text-white bg-[#E50914] hover:bg-[#C50812] transition-colors mt-2"
          >
            <PenSquare size={18} />
            <span>Post</span>
          </button>
        </nav>

        {/* Bottom items */}
        <div className="p-3 border-t border-[#1E1E2E] space-y-0.5">
          {BOTTOM_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={pathname === item.href}
              onClick={onClose}
            />
          ))}
        </div>
      </aside>
    </>
  );
}

function NavLink({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-sm font-medium",
        "transition-all duration-150 group relative",
        active
          ? "bg-[#E50914]/15 text-[#E50914] border border-[#E50914]/20"
          : "text-[#505060] hover:text-white hover:bg-white/[0.04]"
      )}
    >
      <span className={cn("shrink-0 transition-colors", active ? "text-[#E50914]" : "group-hover:text-white")}>
        {item.icon}
      </span>
      <span>{item.label}</span>
      {item.badge && (
        <span className="ml-auto text-[10px] font-bold bg-[#E50914] text-white px-1.5 py-0.5 rounded-[4px] animate-pulse-red">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

// ── Mobile bottom nav ────────────────────────────────────────
const MOBILE_PRIMARY: NavItem[] = [
  { href: "/",                label: "Home",     icon: <Home size={20} /> },
  { href: "/discover",        label: "Discover", icon: <Compass size={20} /> },
  { href: "/debates",         label: "Debates",  icon: <Flame size={20} />, badge: "LIVE" },
  { href: "/recommendations", label: "For You",  icon: <Zap size={20} /> },
];

const MOBILE_MORE: NavItem[] = [
  { href: "/in-theater",  label: "In Theater",  icon: <Film size={22} /> },
  { href: "/categories",  label: "Categories",  icon: <Shapes size={22} /> },
  { href: "/collections", label: "Collections", icon: <BookMarked size={22} /> },
  { href: "/leaderboard", label: "Leaderboard", icon: <Trophy size={22} /> },
  { href: "/social",      label: "Social",      icon: <Users size={22} /> },
  { href: "/search",      label: "Search",      icon: <BarChart2 size={22} /> },
  { href: "/settings",    label: "Settings",    icon: <Settings size={22} /> },
];

export function BottomNav() {
  const pathname = usePathname();
  const { me } = useMe();
  const { openCompose } = useCompose();
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => { setSheetOpen(false); }, [pathname]);

  const moreActive = MOBILE_MORE.some((i) => pathname === i.href);

  return (
    <>
      {/* Floating compose button */}
      <button
        onClick={openCompose}
        aria-label="Post"
        className="lg:hidden fixed right-4 bottom-20 z-[705] w-14 h-14 rounded-full bg-[#E50914] hover:bg-[#C50812] shadow-lg shadow-[#E50914]/30 flex items-center justify-center text-white active:scale-95 transition-transform"
      >
        <PenSquare size={22} />
      </button>

      <nav className="fixed bottom-0 left-0 right-0 z-[700] lg:hidden border-t border-[#1E1E2E] bg-[#0A0A0F]/95 backdrop-blur-[12px] pb-safe">
        <div className="grid grid-cols-5 items-stretch h-14">
          {MOBILE_PRIMARY.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 transition-colors",
                  active ? "text-[#E50914]" : "text-[#A0A0B0] hover:text-white",
                )}
              >
                {item.icon}
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
                {item.badge && (
                  <span className="absolute top-1.5 right-[calc(50%-18px)] w-1.5 h-1.5 bg-[#E50914] rounded-full animate-pulse" />
                )}
              </Link>
            );
          })}
          <button
            onClick={() => setSheetOpen(true)}
            aria-label="More"
            className={cn(
              "relative flex flex-col items-center justify-center gap-0.5 transition-colors",
              moreActive || sheetOpen ? "text-[#E50914]" : "text-[#A0A0B0] hover:text-white",
            )}
          >
            <MoreHorizontal size={20} />
            <span className="text-[10px] font-medium leading-none">More</span>
          </button>
        </div>
      </nav>

      {/* More sheet */}
      {sheetOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[750] bg-black/60 backdrop-blur-sm"
          onClick={() => setSheetOpen(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-[#0A0A0F] border-t border-[#1E1E2E] rounded-t-2xl pb-safe animate-[slideUp_.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "slideUp .2s ease-out" }}
          >
            <div className="flex items-center justify-center pt-2 pb-1">
              <span className="w-10 h-1 rounded-full bg-[#1E1E2E]" />
            </div>
            <div className="flex items-center justify-between px-4 pb-2">
              <h3 className="text-sm font-semibold text-white">More</h3>
              <button
                onClick={() => setSheetOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-[#A0A0B0] hover:bg-white/[0.06]"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {me && (
              <Link
                href={`/profile/${me.username}`}
                className="flex items-center gap-3 mx-3 mb-2 p-3 rounded-[10px] bg-white/[0.03] border border-[#1E1E2E]"
              >
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-[#E50914] to-[#8B5CF6] flex items-center justify-center text-sm font-bold shrink-0">
                  {me.avatar_url ? (
                    <Image src={me.avatar_url} alt={me.username} width={40} height={40} className="object-cover w-full h-full" />
                  ) : (
                    me.username[0]?.toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white truncate">@{me.username}</div>
                  <div className="text-xs text-[#505060] font-mono">⚡ {me.xp_points.toLocaleString()} XP</div>
                </div>
                <UserIcon size={16} className="text-[#505060]" />
              </Link>
            )}

            <div className="grid grid-cols-4 gap-2 px-3 pb-4">
              {MOBILE_MORE.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1.5 py-3 rounded-[10px] border text-center transition-colors",
                      active
                        ? "bg-[#E50914]/15 border-[#E50914]/30 text-[#E50914]"
                        : "bg-white/[0.02] border-[#1E1E2E] text-[#A0A0B0] hover:text-white hover:bg-white/[0.06]",
                    )}
                  >
                    {item.icon}
                    <span className="text-[11px] font-medium leading-tight">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
