"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function AdminLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    if (loading) return;
    setLoading(true);
    try {
      await fetch("/api/admin/auth", { method: "DELETE" });
    } catch {}
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      onClick={logout}
      disabled={loading}
      className="flex items-center gap-1.5 text-xs h-8 px-3 rounded-[8px] border border-[#E50914]/30 bg-[#E50914]/10 hover:bg-[#E50914]/20 text-[#E50914] font-semibold disabled:opacity-60 transition-colors"
    >
      <LogOut size={13} />
      {loading ? "Signing out…" : "Log out"}
    </button>
  );
}
