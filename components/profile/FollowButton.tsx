"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";

interface Props {
  username:         string;
  initialFollowing: boolean;
}

export default function FollowButton({ username, initialFollowing }: Props) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [hovered,   setHovered]   = useState(false);
  const [, startT]  = useTransition();
  const [loading,   setLoading]   = useState(false);

  async function toggle() {
    if (loading) return;
    const next = !following;
    setFollowing(next);
    setLoading(true);
    try {
      const res = await fetch("/api/user/follow", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ username }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setFollowing(!!json.following);
      startT(() => router.refresh());
    } catch (e) {
      setFollowing(!next);
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  const label = following ? (hovered ? "Unfollow" : "Following") : "Follow";
  const cls = following
    ? "text-sm h-9 px-4 rounded-full border border-white/20 text-white hover:border-[#E50914] hover:text-[#E50914] hover:bg-[#E50914]/10 transition-colors"
    : "btn-primary text-sm h-9 px-4";

  return (
    <button
      onClick={toggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      disabled={loading}
      className={cls + " disabled:opacity-60"}
    >
      {label}
    </button>
  );
}
