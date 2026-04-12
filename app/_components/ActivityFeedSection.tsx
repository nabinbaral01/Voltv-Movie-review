import Link from "next/link";
import Image from "next/image";
import { timeAgo } from "@/utils/formatters";
import { posterUrl } from "@/lib/tmdb";
import type { ActivityItem } from "@/types";

// Placeholder — real data comes from /api/user/activity after auth
const PLACEHOLDER_ACTIVITIES: ActivityItem[] = [];

export default async function ActivityFeedSection() {
  const activities = PLACEHOLDER_ACTIVITIES;

  if (activities.length === 0) {
    return (
      <div className="card p-6 text-center space-y-2">
        <p className="text-2xl">👥</p>
        <p className="font-semibold text-white">Follow critics to see their activity</p>
        <p className="text-sm text-[#505060]">
          When you follow people, their ratings and reviews appear here.
        </p>
        <Link
          href="/discover/people"
          className="inline-block text-sm text-[#E50914] hover:underline mt-1"
        >
          Find people to follow →
        </Link>
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-white">Friend Activity</h2>
      <div className="space-y-2">
        {activities.map((item) => (
          <ActivityRow key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const verb: Record<string, string> = {
    rated_movie:       "rated",
    added_watchlist:   "added to watchlist",
    wrote_review:      "reviewed",
    earned_badge:      "earned a badge",
    debate_vote:       "voted in today's debate",
    created_collection:"created a collection",
    followed_user:     "followed",
  };

  return (
    <div className="card p-3 flex items-center gap-3 hover:border-white/10">
      {/* Avatar */}
      <Link href={`/profile/${item.user.username}`}>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#E50914] to-[#8B5CF6] shrink-0 flex items-center justify-center text-sm font-bold">
          {item.user.username[0]?.toUpperCase()}
        </div>
      </Link>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white">
          <Link href={`/profile/${item.user.username}`} className="font-semibold hover:text-[#E50914]">
            @{item.user.username}
          </Link>
          {" "}
          <span className="text-[#A0A0B0]">{verb[item.activity_type] ?? item.activity_type}</span>
          {item.movie && (
            <>
              {" "}
              <Link href={`/movie/${item.movie.tmdb_id}`} className="font-semibold hover:text-[#E50914]">
                {item.movie.title}
              </Link>
            </>
          )}
        </p>
        <p className="text-xs text-[#505060]">{timeAgo(item.created_at)}</p>
      </div>

      {/* Movie poster thumbnail */}
      {item.movie?.poster_url && (
        <Link href={`/movie/${item.movie.tmdb_id}`} className="shrink-0">
          <div className="relative w-8 h-12 rounded-[4px] overflow-hidden">
            <Image
              src={posterUrl(item.movie.poster_url.replace("https://image.tmdb.org/t/p/w500", ""), "w185")}
              alt={item.movie.title}
              fill
              className="object-cover"
              sizes="32px"
            />
          </div>
        </Link>
      )}
    </div>
  );
}
