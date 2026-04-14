"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useMe } from "@/components/hooks/useMe";

type Verdict = "skip" | "timepass" | "watchit" | "masterpiece";

interface Comment {
  id: string;
  username: string;
  verdict?: Verdict;
  rating?: number;
  text: string;
  createdAt: string;
}

const VERDICTS: {
  id: Verdict;
  label: string;
  active: string;     // pill background when selected
  card: string;       // review card background tint
  border: string;     // left accent border
  text: string;       // verdict text color
}[] = [
  { id: "skip",        label: "Skip",       active: "bg-[#505060] text-white", card: "bg-[#505060]/10",  border: "border-l-[#9CA3AF]", text: "text-[#9CA3AF]" },
  { id: "timepass",    label: "Timepass",   active: "bg-[#F5A623] text-black", card: "bg-[#F5A623]/10",  border: "border-l-[#F5A623]", text: "text-[#F5A623]" },
  { id: "watchit",     label: "Go for it",  active: "bg-[#3B82F6] text-white", card: "bg-[#3B82F6]/10",  border: "border-l-[#3B82F6]", text: "text-[#3B82F6]" },
  { id: "masterpiece", label: "Perfection", active: "bg-[#E50914] text-white", card: "bg-[#E50914]/10",  border: "border-l-[#E50914]", text: "text-[#E50914]" },
];

function verdictOf(c: Comment): Verdict {
  if (c.verdict) return c.verdict;
  const r = c.rating ?? 5;
  if (r <= 3) return "skip";
  if (r <= 5) return "timepass";
  if (r <= 7) return "watchit";
  return "masterpiece";
}

function labelFor(v: Verdict) {
  return VERDICTS.find((x) => x.id === v)!.label;
}

export default function CommentSection({ tmdbId, username: usernameProp }: { tmdbId: number; username?: string }) {
  const { me } = useMe();
  const username  = me?.username  ?? usernameProp ?? "guest";
  const avatarUrl = me?.avatar_url ?? null;
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading]   = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [verdict, setVerdict]    = useState<Verdict | null>(null);
  const [text, setText]          = useState("");
  const [error, setError]        = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [tmdbId]); // eslint-disable-line

  async function load() {
    setLoading(true);
    const res  = await fetch(`/api/movie-comments?tmdb_id=${tmdbId}`);
    const data = await res.json();
    setComments(data.comments ?? []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!verdict)                 return setError("Pick a verdict");
    if (text.trim().length < 3)   return setError("Write at least 3 characters");

    setSubmitting(true);

    const res = await fetch("/api/movie-comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tmdb_id: tmdbId, username, verdict, text }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to post");
      return;
    }
    setText("");
    setVerdict(null);
    await load();
    window.dispatchEvent(new CustomEvent("voltv-comments-updated", { detail: tmdbId }));
  }

  const initial = (username[0] ?? "?").toUpperCase();

  return (
    <section id="comments" className="space-y-4 scroll-mt-20">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">
          💬 Reviews <span className="text-[#505060] text-sm font-normal">({comments.length})</span>
        </h2>
      </div>

      {/* Write box — matches reference */}
      <form onSubmit={handleSubmit} className="card p-4 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Link href={`/profile/${username}`} className="flex items-center gap-3 group">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={username}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E50914] to-[#8B5CF6] flex items-center justify-center text-sm font-bold text-white shrink-0">
                {initial}
              </div>
            )}
            <span className="text-white font-medium text-sm group-hover:text-[#E50914] transition-colors">@{username}</span>
          </Link>

          {/* Verdict pills */}
          <div className="flex items-center bg-[#12121A] rounded-full p-1 border border-white/5 ml-auto">
            {VERDICTS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVerdict(v.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  verdict === v.id ? v.active : "text-[#A0A0B0] hover:text-white"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write your review here…"
          rows={3}
          maxLength={1000}
          className="w-full bg-transparent text-white text-sm placeholder:text-[#505060] resize-none outline-none border-b border-white/10 focus:border-white/30 pb-2"
        />

        <div className="flex items-center justify-between">
          {error ? (
            <span className="text-xs text-[#E50914]">{error}</span>
          ) : (
            <span className="text-xs text-[#505060]">{text.length}/1000</span>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="bg-white hover:bg-gray-200 disabled:opacity-60 text-black text-sm font-semibold px-5 py-1.5 rounded-full transition-colors"
          >
            {submitting ? "Posting…" : "Post"}
          </button>
        </div>
      </form>

      {/* List */}
      {loading ? (
        <p className="text-sm text-[#505060] text-center py-6">Loading…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-[#505060] text-center py-6">
          No reviews yet — be the first.
        </p>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => {
            const v    = verdictOf(c);
            const meta = VERDICTS.find((x) => x.id === v)!;
            return (
              <div key={c.id} className="card p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <Link
                    href={`/profile/${c.username}`}
                    className="flex items-center gap-3 flex-1 min-w-0 group"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#E50914] to-[#8B5CF6] flex items-center justify-center text-sm font-bold shrink-0">
                      {c.username[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate group-hover:text-[#E50914] transition-colors">@{c.username}</div>
                      <div className="text-xs text-[#505060]">{timeAgo(c.createdAt)}</div>
                    </div>
                  </Link>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${meta.active}`}>
                    {labelFor(v)}
                  </span>
                </div>
                <p className="text-sm text-[#A0A0B0] leading-relaxed whitespace-pre-wrap">
                  {c.text}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
