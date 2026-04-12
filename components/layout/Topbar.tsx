"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Search, Bell, Menu, LogOut, User as UserIcon, Settings, Shield } from "lucide-react";
import { cn } from "@/utils/formatters";
import { useMe, type Me } from "@/components/hooks/useMe";

interface TopbarProps {
  onMenuClick?: () => void;
  unreadCount?: number;
}

export default function Topbar({ onMenuClick, unreadCount = 0 }: TopbarProps) {
  const { me, loading } = useMe();
  return (
    <header className="fixed top-0 left-0 right-0 z-[700] h-14 border-b border-[#1E1E2E] bg-[#0A0A0F]/95 backdrop-blur-[12px]">
      <div className="flex items-center justify-between h-full px-4 max-w-7xl mx-auto">

        {/* Left — Logo + Mobile menu */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-[8px] text-[#505060] hover:text-white hover:bg-white/[0.06] transition-all"
          >
            <Menu size={18} />
          </button>

          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative">
              <span className="font-display text-2xl tracking-wider text-white leading-none">
                VOLT
              </span>
              <span className="font-display text-2xl tracking-wider text-[#E50914] leading-none">
                V
              </span>
            </div>
            <div className="hidden sm:flex items-center">
              <span className="text-[10px] font-semibold text-[#505060] uppercase tracking-widest leading-none ml-0.5 mt-0.5">
                Beta
              </span>
            </div>
          </Link>
        </div>

        {/* Center — Search */}
        <div className="flex-1 max-w-md mx-4 hidden sm:block">
          <SearchBar />
        </div>

        {/* Right — Icons */}
        <div className="flex items-center gap-1">
          {/* Mobile search */}
          <Link
            href="/search"
            className="sm:hidden w-9 h-9 flex items-center justify-center rounded-[8px] text-[#505060] hover:text-white hover:bg-white/[0.06] transition-all"
          >
            <Search size={18} />
          </Link>

          {loading ? null : me ? (
            <>
              {/* Notifications */}
              <Link
                href="/notifications"
                className="relative w-9 h-9 flex items-center justify-center rounded-[8px] text-[#505060] hover:text-white hover:bg-white/[0.06] transition-all"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#E50914] rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>

              <ProfileMenu me={me} />
            </>
          ) : (
            <Link href="/login" className="text-sm font-semibold text-white px-3 h-9 flex items-center rounded-full bg-[#E50914] hover:opacity-90 transition-opacity">
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function ProfileMenu({ me }: { me: Me }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/signout",     { method: "POST" });
      await fetch("/api/auth/simple-login", { method: "DELETE" });
    } catch {}
    window.location.href = "/login";
  }

  return (
    <div ref={ref} className="relative ml-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 rounded-full bg-[#1A1A28] border border-[#1E1E2E] overflow-hidden hover:border-[#E50914]/50 transition-colors"
        aria-label="Account menu"
      >
        {me.avatar_url ? (
          <Image src={me.avatar_url} alt={me.username} width={32} height={32} className="object-cover w-full h-full" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#E50914] to-[#8B5CF6] flex items-center justify-center text-xs font-bold text-white">
            {me.username[0]?.toUpperCase()}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-[10px] border border-[#1E1E2E] bg-[#12121A] shadow-xl overflow-hidden">
          <div className="px-3 py-2.5 border-b border-[#1E1E2E]">
            <div className="text-sm font-semibold text-white truncate">@{me.username}</div>
            <div className="text-[10px] text-[#505060]">⚡ {me.xp_points.toLocaleString()} XP</div>
          </div>
          <MenuLink href={`/profile/${me.username}`} icon={<UserIcon size={14} />} label="Profile" onClick={() => setOpen(false)} />
          <MenuLink href="/settings"                 icon={<Settings size={14} />} label="Settings" onClick={() => setOpen(false)} />
          {me.is_admin && (
            <MenuLink href="/admin" icon={<Shield size={14} />} label="Admin panel" onClick={() => setOpen(false)} />
          )}
          <button
            onClick={logout}
            disabled={loggingOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#E50914] hover:bg-white/[0.04] border-t border-[#1E1E2E] disabled:opacity-60"
          >
            <LogOut size={14} />
            {loggingOut ? "Logging out..." : "Log out"}
          </button>
        </div>
      )}
    </div>
  );
}

function MenuLink({ href, icon, label, onClick }: { href: string; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 text-sm text-[#A0A0B0] hover:text-white hover:bg-white/[0.04]"
    >
      {icon}
      {label}
    </Link>
  );
}

function SearchBar() {
  return (
    <Link
      href="/search"
      className="flex items-center gap-2 w-full h-9 px-3 rounded-[8px] bg-[#12121A] border border-[#1E1E2E] hover:border-white/20 transition-all group"
    >
      <Search size={14} className="text-[#505060] group-hover:text-[#A0A0B0] shrink-0" />
      <span className="text-sm text-[#505060] group-hover:text-[#A0A0B0]">
        Search movies, people...
      </span>
      <span className="ml-auto text-[10px] text-[#505060] border border-[#1E1E2E] rounded px-1.5 py-0.5 hidden md:block">
        ⌘K
      </span>
    </Link>
  );
}
