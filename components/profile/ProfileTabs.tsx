"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import PostCard, { type FeedPost } from "@/components/feed/PostCard";

interface MediaMovie {
  id:         string;
  tmdb_id:    number;
  title:      string;
  poster_url: string | null;
}

interface Props {
  posts:   FeedPost[];
  replies: FeedPost[];
  likes:   FeedPost[];
  media:   MediaMovie[];
  isOwner?: boolean;
}

type Tab = "posts" | "replies" | "media" | "likes";

const TABS: { id: Tab; label: string }[] = [
  { id: "posts",   label: "Posts"   },
  { id: "replies", label: "Replies" },
  { id: "media",   label: "Media"   },
  { id: "likes",   label: "Likes"   },
];

export default function ProfileTabs({ posts, replies, likes, media, isOwner = false }: Props) {
  const [tab, setTab] = useState<Tab>("posts");

  const countFor = (t: Tab) =>
    t === "posts"   ? posts.length
  : t === "replies" ? replies.length
  : t === "media"   ? media.length
  :                   likes.length;

  return (
    <div className="mt-4">
      {/* Sticky tab bar */}
      <div className="sticky top-14 z-20 bg-[#0A0A0F]/95 backdrop-blur border-b border-[#1E1E2E] flex">
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-3 text-sm font-medium transition-colors relative
                ${active ? "text-white" : "text-[#A0A0B0] hover:text-white hover:bg-white/[0.03]"}`}
            >
              <span>{t.label}</span>
              <span className="ml-1.5 text-xs text-[#505060]">{countFor(t.id)}</span>
              {active && (
                <span className="absolute left-1/2 -translate-x-1/2 bottom-0 h-[3px] w-14 rounded-full bg-[#E50914]" />
              )}
            </button>
          );
        })}
      </div>

      <div className="pt-3">
        {tab === "posts" && <PostList posts={posts} empty="No posts yet." isOwner={isOwner} />}
        {tab === "replies" && <PostList posts={replies} empty="No replies yet." isOwner={isOwner} />}
        {tab === "likes" && <PostList posts={likes} empty="No liked posts yet." />}
        {tab === "media" && <MediaGrid movies={media} />}
      </div>
    </div>
  );
}

function PostList({ posts, empty, isOwner = false }: { posts: FeedPost[]; empty: string; isOwner?: boolean }) {
  if (posts.length === 0) {
    return <div className="card p-8 text-center text-sm text-[#505060]">{empty}</div>;
  }
  return (
    <div className="card p-0 overflow-hidden">
      {posts.map((p) => (
        <PostCard key={p.id} post={p} isOwner={isOwner} />
      ))}
    </div>
  );
}

function MediaGrid({ movies }: { movies: MediaMovie[] }) {
  if (movies.length === 0) {
    return <div className="card p-8 text-center text-sm text-[#505060]">No media yet.</div>;
  }
  return (
    <div className="grid grid-cols-3 gap-1">
      {movies.map((m) => (
        <Link
          key={m.id}
          href={`/movie/${m.tmdb_id}`}
          className="relative aspect-square bg-[#1A1A28] overflow-hidden group"
        >
          {m.poster_url ? (
            <Image
              src={m.poster_url}
              alt={m.title}
              fill
              sizes="(max-width: 640px) 33vw, 200px"
              className="object-cover group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xl">🎬</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
            <span className="text-xs font-semibold text-white line-clamp-2">{m.title}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
