"use client";

import { useState, useEffect } from "react";
import { ThumbsUp, Flag, ChevronDown } from "lucide-react";
import { cn, timeAgo, truncate } from "@/utils/formatters";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";
import type { Review } from "@/types";

type Tab = "hot_takes" | "reviews" | "spoilers";

interface DiscussionTabsProps {
  movieId:    string;
  movieTitle: string;
}

export default function DiscussionTabs({ movieId, movieTitle }: DiscussionTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("hot_takes");
  const [reviews,   setReviews]   = useState<Review[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [writing,   setWriting]   = useState(false);
  const [content,   setContent]   = useState("");
  const [isSpoiler, setIsSpoiler] = useState(false);

  useEffect(() => {
    loadReviews();
  }, [activeTab, movieId]);

  async function loadReviews() {
    setLoading(true);
    try {
      const type = activeTab === "spoilers" ? "full_review&spoiler=true"
                 : activeTab === "reviews"  ? "full_review"
                 : "hot_take";
      const res  = await fetch(`/api/reviews?movie_id=${movieId}&type=${type}`);
      const data = await res.json();
      setReviews(data.data ?? []);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!content.trim() || content.length < 10) {
      toast.error("Review too short", "Minimum 10 characters");
      return;
    }
    setWriting(true);
    try {
      const res = await fetch("/api/reviews", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          movie_id:    movieId,
          content:     content.trim(),
          type:        activeTab === "reviews" ? "full_review" : "hot_take",
          is_spoiler:  isSpoiler,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Failed to post");
        return;
      }
      toast.success("Posted!", "+25 XP");
      setContent("");
      loadReviews();
    } finally {
      setWriting(false);
    }
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "hot_takes", label: "🔥 Hot Takes" },
    { id: "reviews",   label: "📝 Reviews"   },
    { id: "spoilers",  label: "🤫 Spoilers"  },
  ];

  return (
    <div className="space-y-4">
      {/* Tab Bar */}
      <div className="flex gap-0 border-b border-[#1E1E2E]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all",
              activeTab === tab.id
                ? "border-[#E50914] text-white"
                : "border-transparent text-[#505060] hover:text-[#A0A0B0]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Write box */}
      {activeTab !== "spoilers" && (
        <div className="card p-3 space-y-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={activeTab === "reviews"
              ? `Write a full review for ${movieTitle}...`
              : "Drop a hot take (min 10 chars)..."}
            maxLength={activeTab === "reviews" ? 2000 : 280}
            rows={activeTab === "reviews" ? 4 : 2}
            className="w-full bg-transparent text-sm text-white placeholder:text-[#505060] resize-none outline-none"
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-[#505060] cursor-pointer">
              <input
                type="checkbox"
                checked={isSpoiler}
                onChange={(e) => setIsSpoiler(e.target.checked)}
                className="accent-[#E50914]"
              />
              Contains spoilers
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#505060]">
                {content.length}/{activeTab === "reviews" ? 2000 : 280}
              </span>
              <button
                onClick={handleSubmit}
                disabled={writing || content.length < 10}
                className="btn-primary text-xs h-8 px-3"
              >
                {writing ? "Posting..." : "Post (+25 XP)"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spoiler warning */}
      {activeTab === "spoilers" && (
        <div className="card p-3 border-amber-900/30 bg-amber-950/20 text-amber-400 text-sm">
          ⚠️ Spoiler content ahead — each review is blurred until you click to reveal.
        </div>
      )}

      {/* Reviews list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map((i) => <ReviewSkeleton key={i} />)}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-[#505060] text-sm">
            {activeTab === "hot_takes"
              ? "No hot takes yet — drop yours!"
              : activeTab === "reviews"
              ? "Be the first to write a full review"
              : "No spoiler reviews yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              blur={activeTab === "spoilers"}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewCard({ review, blur }: { review: Review; blur: boolean }) {
  const [revealed,   setRevealed]   = useState(false);
  const [liked,      setLiked]      = useState(review.is_liked ?? false);
  const [likeCount,  setLikeCount]  = useState(review.likes_count);
  const [expanded,   setExpanded]   = useState(false);

  const shouldBlur = (blur || review.is_spoiler) && !revealed;
  const isLong     = review.content.length > 300;
  const displayText = (!expanded && isLong)
    ? truncate(review.content, 280)
    : review.content;

  async function handleLike() {
    setLiked(!liked);
    setLikeCount((c) => liked ? c - 1 : c + 1);
    await fetch(`/api/reviews/${review.id}/like`, { method: "POST" });
  }

  return (
    <div className="card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#E50914] to-[#8B5CF6] flex items-center justify-center text-sm font-bold shrink-0">
          {review.user?.username?.[0]?.toUpperCase() ?? "U"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">
              @{review.user?.username ?? "user"}
            </span>
            {review.user?.subscription_tier === "legend" && (
              <span className="text-xs text-[#F5A623]">👑</span>
            )}
            {review.user?.subscription_tier === "pro" && (
              <span className="text-xs text-[#3B82F6]">💎</span>
            )}
          </div>
          <span className="text-xs text-[#505060]">{timeAgo(review.created_at)}</span>
        </div>
        {review.is_spoiler && (
          <span className="text-xs bg-amber-900/40 text-amber-400 px-2 py-0.5 rounded-[4px]">
            Spoiler
          </span>
        )}
      </div>

      {/* Content */}
      <div
        className={cn(
          "text-sm text-[#A0A0B0] leading-relaxed transition-all",
          shouldBlur && "spoiler-blur"
        )}
        onClick={() => shouldBlur && setRevealed(true)}
      >
        {shouldBlur ? (
          <span>Click to reveal spoiler content...</span>
        ) : (
          <>
            {displayText}
            {isLong && !expanded && (
              <button
                onClick={() => setExpanded(true)}
                className="text-[#E50914] hover:underline ml-1 text-sm"
              >
                Read more
              </button>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 pt-1">
        <button
          onClick={handleLike}
          className={cn(
            "flex items-center gap-1.5 text-xs transition-colors",
            liked ? "text-[#E50914]" : "text-[#505060] hover:text-[#A0A0B0]"
          )}
        >
          <ThumbsUp size={13} fill={liked ? "currentColor" : "none"} />
          {likeCount}
        </button>
        <button className="flex items-center gap-1.5 text-xs text-[#505060] hover:text-[#A0A0B0] transition-colors">
          <Flag size={13} />
          Report
        </button>
      </div>
    </div>
  );
}

function ReviewSkeleton() {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-9 h-9 rounded-full" />
        <div className="space-y-1 flex-1">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  );
}
