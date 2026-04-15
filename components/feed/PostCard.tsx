"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Heart, MessageCircle, Repeat2, Bookmark, Share2, MoreHorizontal, Eye,
  EyeOff, Globe2, Link2, UserRound, Pencil, Trash2,
} from "lucide-react";
import { toast } from "@/components/ui/Toast";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import ReplyModal from "./ReplyModal";

export interface FeedPost {
  id:         string;
  content:    string;
  type:       "hot_take" | "full_review";
  is_spoiler: boolean;
  is_anonymous?: boolean;
  visibility?:   "public" | "unlisted" | "followers";
  media_urls?:   string[];
  media_type?:   "image" | "video" | null;
  edited_at?:    Date | string | null;
  likes_count:   number;
  reposts_count: number;
  replies_count: number;
  created_at: Date | string;
  user: {
    username:          string;
    avatar_url:        string | null;
    is_blue_tick:      boolean;
    subscription_tier: string;
  };
  movie: {
    tmdb_id:      number;
    title:        string;
    poster_url:   string | null;
    release_date: Date | string | null;
  } | null;
}

interface Props {
  post:         FeedPost;
  initialLiked?:      boolean;
  initialReposted?:   boolean;
  initialBookmarked?: boolean;
  isOwner?:     boolean;
}

export default function PostCard({
  post,
  initialLiked      = false,
  initialReposted   = false,
  initialBookmarked = false,
  isOwner           = false,
}: Props) {
  const router = useRouter();
  const [revealed, setRevealed] = useState(false);
  const blurred = post.is_spoiler && !revealed;

  const [liked,      setLiked]      = useState(initialLiked);
  const [likes,      setLikes]      = useState(post.likes_count);
  const [reposted,   setReposted]   = useState(initialReposted);
  const [reposts,    setReposts]    = useState(post.reposts_count);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [showReply,  setShowReply]  = useState(false);
  const [replies,    setReplies]    = useState(post.replies_count);
  const [deleted,    setDeleted]    = useState(false);
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [editing,    setEditing]    = useState(false);
  const [editText,   setEditText]   = useState(post.content);
  const [visibility, setVisibility] = useState(post.visibility ?? "public");

  const anonymous   = !!post.is_anonymous;
  const displayName = anonymous ? "Anonymous" : post.user.username;
  const profileHref = anonymous ? "#" : `/profile/${post.user.username}`;
  const when = relativeTime(new Date(post.created_at));
  const year = post.movie?.release_date ? new Date(post.movie.release_date).getFullYear() : null;
  const media = post.media_urls ?? [];

  async function toggle(path: string, apply: () => void, rollback: () => void,
    key: "liked" | "reposted" | "bookmarked") {
    apply();
    try {
      const res  = await fetch(path, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      if (key === "liked"      && typeof json.liked      === "boolean") setLiked(json.liked);
      if (key === "reposted"   && typeof json.reposted   === "boolean") setReposted(json.reposted);
      if (key === "bookmarked" && typeof json.bookmarked === "boolean") setBookmarked(json.bookmarked);
    } catch (e) {
      rollback();
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  function onLike() {
    const next = !liked;
    toggle(`/api/reviews/${post.id}/like`,
      () => { setLiked(next);  setLikes((n) => n + (next ? 1 : -1)); },
      () => { setLiked(!next); setLikes((n) => n + (next ? -1 : 1)); }, "liked");
  }
  function onRepost() {
    const next = !reposted;
    toggle(`/api/reviews/${post.id}/repost`,
      () => { setReposted(next);  setReposts((n) => n + (next ? 1 : -1)); },
      () => { setReposted(!next); setReposts((n) => n + (next ? -1 : 1)); }, "reposted");
  }
  function onBookmark() {
    const next = !bookmarked;
    toggle(`/api/reviews/${post.id}/bookmark`,
      () => setBookmarked(next), () => setBookmarked(!next), "bookmarked");
  }

  async function onShare() {
    const url = post.movie
      ? `${location.origin}/movie/${post.movie.tmdb_id}#p-${post.id}`
      : `${location.origin}/feed#p-${post.id}`;
    try {
      if (navigator.share) await navigator.share({ title: `@${displayName} on VOLTV`, text: post.content, url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    } catch { /* cancelled */ }
  }

  function onReplied() { setReplies((n) => n + 1); setShowReply(false); router.refresh(); }

  async function saveEdit() {
    try {
      const res  = await fetch(`/api/reviews/${post.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body:   JSON.stringify({ content: editText.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setEditing(false);
      toast.success("Updated");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function changeVisibility(v: "public" | "unlisted" | "followers") {
    const prev = visibility;
    setVisibility(v); setMenuOpen(false);
    try {
      const res = await fetch(`/api/reviews/${post.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body:   JSON.stringify({ visibility: v }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`Now ${v}`);
    } catch {
      setVisibility(prev); toast.error("Failed");
    }
  }

  async function hidePost() {
    if (!confirm("Hide this post? It won't be visible to anyone.")) return;
    setMenuOpen(false);
    try {
      const res = await fetch(`/api/reviews/${post.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body:   JSON.stringify({ is_hidden: true }),
      });
      if (!res.ok) throw new Error("Failed");
      setDeleted(true);
      toast.success("Hidden");
    } catch { toast.error("Failed"); }
  }

  async function deletePost() {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    setMenuOpen(false);
    try {
      const res = await fetch(`/api/reviews/${post.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setDeleted(true);
      toast.success("Deleted");
      router.refresh();
    } catch { toast.error("Failed"); }
  }

  if (deleted) return null;

  const VisIcon = visibility === "public" ? Globe2 : visibility === "unlisted" ? Link2 : UserRound;

  return (
    <>
      <article id={`p-${post.id}`} className="relative border-b border-[#1E1E2E] px-4 py-3 hover:bg-white/[0.015] transition-colors">
        <div
          className={"transition-all duration-200 " + (blurred ? "blur-md select-none pointer-events-none" : "")}
          aria-hidden={blurred}
        >
          <div className="flex gap-3">
            <Link href={profileHref} className="shrink-0" onClick={(e) => { if (anonymous) e.preventDefault(); }}>
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-[#E50914] to-[#8B5CF6] flex items-center justify-center font-bold text-sm">
                {anonymous ? (
                  <EyeOff size={16} className="text-white" />
                ) : post.user.avatar_url ? (
                  <Image src={post.user.avatar_url} alt={post.user.username} width={40} height={40} className="object-cover w-full h-full" />
                ) : post.user.username[0]?.toUpperCase()}
              </div>
            </Link>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-sm">
                <Link
                  href={profileHref}
                  onClick={(e) => { if (anonymous) e.preventDefault(); }}
                  className="font-bold text-white hover:underline truncate"
                >
                  {displayName}
                </Link>
                {!anonymous && post.user.is_blue_tick && <VerifiedBadge size={16} />}
                {!anonymous && <span className="text-[#505060] truncate">@{post.user.username}</span>}
                <span className="text-[#505060]">·</span>
                <span className="text-[#505060] whitespace-nowrap">{when}</span>
                {post.edited_at && <span className="text-[#505060] text-xs">· edited</span>}
                <VisIcon size={11} className="text-[#505060]" />

                <div className="ml-auto relative">
                  <button
                    onClick={() => setMenuOpen((o) => !o)}
                    className="text-[#505060] hover:text-white p-1"
                    aria-label="More"
                  >
                    <MoreHorizontal size={14} />
                  </button>
                  {menuOpen && isOwner && (
                    <div className="absolute right-0 top-6 z-20 w-48 card p-1 text-sm">
                      <button onClick={() => { setEditing(true); setMenuOpen(false); }} className="w-full text-left px-3 py-2 rounded hover:bg-white/[0.04] flex items-center gap-2">
                        <Pencil size={13} /> Edit
                      </button>
                      <div className="border-t border-[#1E1E2E] my-1" />
                      <div className="px-3 py-1 text-[10px] uppercase tracking-wide text-[#505060]">Visibility</div>
                      <button onClick={() => changeVisibility("public")}    className={`w-full text-left px-3 py-1.5 rounded hover:bg-white/[0.04] flex items-center gap-2 ${visibility === "public" ? "text-[#E50914]" : ""}`}><Globe2 size={13} /> Public</button>
                      <button onClick={() => changeVisibility("unlisted")}  className={`w-full text-left px-3 py-1.5 rounded hover:bg-white/[0.04] flex items-center gap-2 ${visibility === "unlisted" ? "text-[#E50914]" : ""}`}><Link2 size={13} /> Unlisted</button>
                      <button onClick={() => changeVisibility("followers")} className={`w-full text-left px-3 py-1.5 rounded hover:bg-white/[0.04] flex items-center gap-2 ${visibility === "followers" ? "text-[#E50914]" : ""}`}><UserRound size={13} /> Followers only</button>
                      <div className="border-t border-[#1E1E2E] my-1" />
                      <button onClick={hidePost}   className="w-full text-left px-3 py-2 rounded hover:bg-white/[0.04] flex items-center gap-2 text-[#A0A0B0]"><EyeOff size={13} /> Hide</button>
                      <button onClick={deletePost} className="w-full text-left px-3 py-2 rounded hover:bg-white/[0.04] flex items-center gap-2 text-[#E50914]"><Trash2 size={13} /> Delete</button>
                    </div>
                  )}
                </div>
              </div>

              {editing ? (
                <div className="mt-1 space-y-2">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value.slice(0, 2000))}
                    rows={3}
                    className="w-full p-2 bg-[#0A0A0F] border border-[#1E1E2E] rounded-[8px] text-sm text-white resize-none focus:outline-none focus:border-[#E50914]/50"
                  />
                  <div className="flex gap-2">
                    <button onClick={saveEdit} className="btn-primary h-8 px-3 text-xs">Save</button>
                    <button onClick={() => { setEditing(false); setEditText(post.content); }} className="h-8 px-3 text-xs text-[#A0A0B0] hover:text-white">Cancel</button>
                  </div>
                </div>
              ) : (
                post.content && (
                  <p className="mt-1 text-[15px] text-white whitespace-pre-wrap break-words leading-snug">
                    {post.content}
                  </p>
                )
              )}

              {media.length > 0 && (
                <div className={`mt-2 grid gap-1 rounded-[12px] overflow-hidden ${media.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                  {media.map((url, i) => (
                    <div key={i} className="relative aspect-video bg-[#0A0A0F] border border-[#1E1E2E] rounded-[8px] overflow-hidden">
                      {post.media_type === "video" ? (
                        <video src={url} className="w-full h-full object-cover" controls />
                      ) : (
                        <Image src={url} alt="" fill sizes="400px" className="object-cover" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {post.movie && (
                <Link
                  href={`/movie/${post.movie.tmdb_id}`}
                  className="mt-2 flex gap-3 rounded-2xl overflow-hidden border border-[#1E1E2E] hover:border-white/20 transition-colors"
                >
                  <div className="relative w-20 aspect-[2/3] bg-[#1A1A28] shrink-0">
                    {post.movie.poster_url && (
                      <Image src={post.movie.poster_url} alt={post.movie.title} fill sizes="80px" className="object-cover" />
                    )}
                  </div>
                  <div className="py-2 pr-3 flex-1 min-w-0 flex flex-col justify-center">
                    <div className="text-[10px] uppercase tracking-wide text-[#505060]">Movie</div>
                    <div className="text-sm font-semibold text-white truncate">{post.movie.title}</div>
                    {year && <div className="text-xs text-[#505060]">{year}</div>}
                  </div>
                </Link>
              )}

              <div className="flex items-center justify-between max-w-md mt-2 text-[#505060] text-xs">
                <ActionButton onClick={() => setShowReply(true)} icon={<MessageCircle size={15} />} count={replies} hoverColor="#3B82F6" />
                <ActionButton onClick={onRepost}   active={reposted}   icon={<Repeat2 size={15} />} count={reposts} activeColor="#22c55e" hoverColor="#22c55e" />
                <ActionButton onClick={onLike}     active={liked}      icon={<Heart size={15} fill={liked ? "#E50914" : "none"} />} count={likes} activeColor="#E50914" hoverColor="#E50914" />
                <ActionButton onClick={onBookmark} active={bookmarked} icon={<Bookmark size={15} fill={bookmarked ? "#3B82F6" : "none"} />} activeColor="#3B82F6" hoverColor="#3B82F6" />
                <ActionButton onClick={onShare}    icon={<Share2 size={15} />} hoverColor="#ffffff" />
              </div>
            </div>
          </div>
        </div>

        {blurred && (
          <button
            onClick={() => setRevealed(true)}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/30 rounded-[8px] hover:bg-black/40 transition-colors"
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/70 border border-white/15 text-white text-sm font-semibold">
              <Eye size={14} />
              Spoiler — tap to reveal
            </div>
            <span className="text-xs text-[#A0A0B0]">contains plot details</span>
          </button>
        )}
      </article>

      {showReply && (
        <ReplyModal
          parent={{
            id:       post.id,
            content:  post.content,
            username: displayName,
            avatar_url: anonymous ? null : post.user.avatar_url,
          }}
          onClose={() => setShowReply(false)}
          onReplied={onReplied}
        />
      )}
    </>
  );
}

function ActionButton({
  onClick, icon, count, active, activeColor, hoverColor,
}: {
  onClick:     () => void;
  icon:        React.ReactNode;
  count?:      number;
  active?:     boolean;
  activeColor?:string;
  hoverColor:  string;
}) {
  const [hovered, setHovered] = useState(false);
  const color = hovered ? hoverColor : active ? activeColor : undefined;
  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center gap-1.5 transition-colors"
      style={{ color }}
    >
      <span className="p-1.5 rounded-full transition-colors" style={{ color }}>
        {icon}
      </span>
      {count !== undefined && count > 0 && <span className="text-xs tabular-nums">{count}</span>}
    </button>
  );
}

function relativeTime(d: Date): string {
  const diff = Date.now() - d.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)   return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60)   return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24)   return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
