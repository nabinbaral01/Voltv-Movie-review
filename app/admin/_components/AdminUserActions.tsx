"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Shield, ShieldOff, Ban, Undo2 } from "lucide-react";
import { toast } from "@/components/ui/Toast";

interface Props {
  userId:      string;
  username:    string;
  isAdmin:     boolean;
  isBanned:    boolean;
  isMainAdmin: boolean;
}

export default function AdminUserActions({
  userId, username, isAdmin, isBanned, isMainAdmin,
}: Props) {
  const router = useRouter();
  const [pending, startT] = useTransition();
  const [busy, setBusy] = useState<"admin" | "ban" | null>(null);

  async function toggleAdmin() {
    if (isMainAdmin && isAdmin) {
      toast.error("Cannot demote the main administrator");
      return;
    }
    const make = !isAdmin;
    const verb = make ? "grant admin to" : "revoke admin from";
    if (!confirm(`${verb} @${username}?`)) return;

    setBusy("admin");
    try {
      const res = await fetch(`/api/admin/users/${userId}/admin`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ is_admin: make }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed");
      toast.success(make ? `@${username} is now an admin` : `Revoked admin from @${username}`);
      startT(() => router.refresh());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  async function toggleBan() {
    if (isMainAdmin) {
      toast.error("Cannot ban the main administrator");
      return;
    }
    const ban = !isBanned;
    if (!confirm(`${ban ? "Ban" : "Unban"} @${username}?`)) return;

    setBusy("ban");
    try {
      const res = await fetch(`/api/admin/users/${userId}/ban`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ is_banned: ban }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed");
      toast.success(ban ? `@${username} banned` : `@${username} unbanned`);
      startT(() => router.refresh());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  const disabled = pending || busy !== null;

  return (
    <div className="flex items-center justify-end gap-1.5">
      <button
        onClick={toggleAdmin}
        disabled={disabled || (isMainAdmin && isAdmin)}
        title={isAdmin ? "Revoke admin" : "Grant admin"}
        className={`h-7 px-2.5 rounded-[6px] text-[10px] font-semibold inline-flex items-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
          isAdmin
            ? "border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 text-[#8B5CF6] hover:bg-[#8B5CF6]/20"
            : "border border-[#1E1E2E] bg-white/[0.03] text-[#A0A0B0] hover:text-[#8B5CF6] hover:border-[#8B5CF6]/30"
        }`}
      >
        {isAdmin ? <ShieldOff size={11} /> : <Shield size={11} />}
        {isAdmin ? "Revoke" : "Make admin"}
      </button>
      <button
        onClick={toggleBan}
        disabled={disabled || isMainAdmin}
        title={isBanned ? "Unban user" : "Ban user"}
        className={`h-7 px-2.5 rounded-[6px] text-[10px] font-semibold inline-flex items-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
          isBanned
            ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
            : "border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
        }`}
      >
        {isBanned ? <Undo2 size={11} /> : <Ban size={11} />}
        {isBanned ? "Unban" : "Ban"}
      </button>
    </div>
  );
}
