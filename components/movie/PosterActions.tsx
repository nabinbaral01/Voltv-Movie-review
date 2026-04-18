"use client";

import { useState } from "react";
import { Eye, Plus, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/Toast";
import { useWatchStatus, setLocalWatchStatus } from "@/components/hooks/useWatchStatus";

interface Props {
  tmdbId: number;
  alwaysShowWatched?: boolean;
}

export default function PosterActions({ tmdbId, alwaysShowWatched }: Props) {
  const status = useWatchStatus(tmdbId);
  const [busy, setBusy] = useState<"watched" | "want_to_watch" | null>(null);

  function act(e: React.MouseEvent, kind: "watched" | "want_to_watch") {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;

    // Optimistic
    const prev = status;
    const next = status === kind ? null : kind;
    setLocalWatchStatus(tmdbId, next);
    setBusy(kind);

    fetch("/api/watchlist/quick", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ tmdb_id: tmdbId, kind }),
      keepalive: true,
    })
      .then(async (res) => {
        if (res.status === 401) { setLocalWatchStatus(tmdbId, prev); toast.error("Login required"); return; }
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "Failed");
        setLocalWatchStatus(tmdbId, json.data.status);
        toast.success(
          kind === "watched"
            ? `Marked watched · ${json.data.genres?.[0] ?? "Movie"}`
            : "Added to Watch Later"
        );
      })
      .catch((err) => {
        setLocalWatchStatus(tmdbId, prev);
        toast.error(err instanceof Error ? err.message : "Failed");
      })
      .finally(() => setBusy(null));
  }

  const isWatched   = status === "watched";
  const isWantWatch = status === "want_to_watch";

  const showEyeAlways = alwaysShowWatched && isWatched;

  return (
    <div
      className={`absolute top-2 right-2 z-10 flex flex-col gap-1.5 transition-opacity ${
        showEyeAlways ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
      }`}
    >
      <IconButton
        onClick={(e) => act(e, "watched")}
        active={isWatched}
        busy={busy === "watched"}
        title={isWatched ? "Watched" : "Mark as watched"}
        activeColor="#22c55e"
      >
        {busy === "watched"
          ? <Loader2 size={14} className="animate-spin" />
          : <Eye size={14} />}
      </IconButton>
      <IconButton
        onClick={(e) => act(e, "want_to_watch")}
        active={isWantWatch}
        busy={busy === "want_to_watch"}
        title={isWantWatch ? "In Watch Later" : "Add to Watch Later"}
        activeColor="#F5A623"
      >
        {busy === "want_to_watch"
          ? <Loader2 size={14} className="animate-spin" />
          : <Plus size={14} />}
      </IconButton>
    </div>
  );
}

function IconButton({
  onClick, active, busy, title, activeColor, children,
}: {
  onClick: (e: React.MouseEvent) => void;
  active: boolean;
  busy: boolean;
  title: string;
  activeColor: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label={title}
      title={title}
      className="w-7 h-7 rounded-full flex items-center justify-center backdrop-blur text-white shadow-md transition-all hover:scale-110 disabled:opacity-60"
      style={{
        background: active ? activeColor : "rgba(0,0,0,0.65)",
        border: active ? `1px solid ${activeColor}` : "1px solid rgba(255,255,255,0.15)",
        boxShadow: active ? `0 0 10px ${activeColor}, 0 0 18px ${activeColor}80` : undefined,
      }}
    >
      {children}
    </button>
  );
}
