"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EyeOff, Eye } from "lucide-react";
import { toast } from "@/components/ui/Toast";

export default function AdminPostActions({
  postId, isHidden,
}: { postId: string; isHidden: boolean }) {
  const router = useRouter();
  const [, startT] = useTransition();
  const [optimistic, setOptimistic] = useState(isHidden);
  const inflight = useRef<AbortController | null>(null);

  // Sync with server truth whenever parent re-renders with new value
  useEffect(() => { setOptimistic(isHidden); }, [isHidden]);

  async function toggle() {
    const next = !optimistic;
    setOptimistic(next); // instant flip

    // Cancel any in-flight request — latest click wins
    inflight.current?.abort();
    const ctl = new AbortController();
    inflight.current = ctl;

    try {
      const res = await fetch(`/api/admin/posts/${postId}/hide`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ is_hidden: next }),
        signal:  ctl.signal,
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed");
      }
      toast.success(next ? "Post hidden" : "Post restored");
      startT(() => router.refresh());
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setOptimistic(!next); // revert
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <button
      onClick={toggle}
      title={optimistic ? "Restore post" : "Hide post"}
      className={`shrink-0 h-7 w-7 rounded-[6px] inline-flex items-center justify-center transition-colors ${
        optimistic
          ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
          : "border border-[#1E1E2E] bg-white/[0.03] text-[#A0A0B0] hover:text-red-400 hover:border-red-500/30"
      }`}
    >
      {optimistic ? <Eye size={12} /> : <EyeOff size={12} />}
    </button>
  );
}
