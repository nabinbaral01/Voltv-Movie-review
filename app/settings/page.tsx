"use client";

import { useState } from "react";
import Link from "next/link";
import Topbar from "@/components/layout/Topbar";
import Sidebar, { BottomNav } from "@/components/layout/Sidebar";
import { toast } from "@/components/ui/Toast";
import { ChevronRight, User, Bell, Shield, Download, Trash2, LogOut } from "lucide-react";

const SECTIONS = [
  {
    title:    "Account",
    icon:     <User size={16} />,
    items: [
      { label: "Edit Profile",        href: "/settings/profile" },
      { label: "Change Username",     href: "/settings/username" },
      { label: "Phone Verification",  href: "/settings/phone",  badge: "Required for full rating weight" },
      { label: "Privacy Settings",    href: "/settings/privacy" },
    ],
  },
  {
    title:    "Notifications",
    icon:     <Bell size={16} />,
    items: [
      { label: "Push Notifications",  href: "/settings/notifications" },
      { label: "Email Digest",        href: "/settings/email" },
    ],
  },
  {
    title:    "Security",
    icon:     <Shield size={16} />,
    items: [
      { label: "Connected Accounts",  href: "/settings/accounts" },
      { label: "Sessions",            href: "/settings/sessions" },
    ],
  },
  {
    title:    "Data",
    icon:     <Download size={16} />,
    items: [
      { label: "Export My Data",      href: "/settings/export",  badge: "GDPR" },
      { label: "Import from Letterboxd", href: "/settings/import" },
    ],
  },
];

export default function SettingsPage() {
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      window.location.href = "/";
    } catch {
      toast.error("Failed to sign out");
      setLoggingOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Topbar />
      <div className="flex pt-14">
        <div className="hidden lg:block w-[240px] shrink-0"><Sidebar /></div>

        <main className="flex-1 min-w-0 max-w-lg mx-auto px-4 py-6 pb-24 lg:pb-8 space-y-6">
          <h1 className="text-2xl font-bold text-white">Settings</h1>

          {SECTIONS.map((section) => (
            <div key={section.title} className="card overflow-hidden p-0">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1E1E2E]">
                <span className="text-[#E50914]">{section.icon}</span>
                <span className="text-sm font-semibold text-[#A0A0B0] uppercase tracking-wide">
                  {section.title}
                </span>
              </div>
              <div>
                {section.items.map((item, i) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.03] transition-colors ${
                      i < section.items.length - 1 ? "border-b border-[#1E1E2E]" : ""
                    }`}
                  >
                    <div>
                      <span className="text-sm text-white">{item.label}</span>
                      {"badge" in item && item.badge && (
                        <p className="text-xs text-[#505060] mt-0.5">{item.badge}</p>
                      )}
                    </div>
                    <ChevronRight size={16} className="text-[#505060]" />
                  </Link>
                ))}
              </div>
            </div>
          ))}

          {/* Subscription */}
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">Subscription</p>
                <p className="text-sm text-[#505060]">Currently on Free tier</p>
              </div>
              <Link
                href="/settings/upgrade"
                className="btn-gold text-sm h-9 px-4 btn-primary bg-[#F5A623] hover:bg-[#e8971e] text-black font-bold rounded-[8px] px-4 h-9 flex items-center"
              >
                Upgrade
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="card-elevated p-3 rounded-[10px]">
                <div className="font-bold text-[#3B82F6]">💎 Pro</div>
                <div className="text-[#505060] text-xs">$6/month</div>
                <div className="text-xs text-[#A0A0B0] mt-1">Ad-free, unlimited lists</div>
              </div>
              <div className="card-elevated p-3 rounded-[10px]">
                <div className="font-bold text-[#F5A623]">👑 Legend</div>
                <div className="text-[#505060] text-xs">$12/month</div>
                <div className="text-xs text-[#A0A0B0] mt-1">Top of all discussions</div>
              </div>
            </div>
          </div>

          {/* Danger zone */}
          <div className="card p-4 border-red-900/30 space-y-3">
            <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wide">Danger Zone</h3>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full flex items-center gap-3 p-3 rounded-[8px] border border-red-900/30 text-red-400 hover:bg-red-950/20 transition-all text-sm"
            >
              <LogOut size={16} />
              {loggingOut ? "Signing out..." : "Sign Out"}
            </button>
            <button className="w-full flex items-center gap-3 p-3 rounded-[8px] border border-red-900/30 text-red-500 hover:bg-red-950/20 transition-all text-sm">
              <Trash2 size={16} />
              Delete Account
            </button>
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
