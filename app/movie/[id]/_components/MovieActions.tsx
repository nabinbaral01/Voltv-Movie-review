"use client";

import { useState } from "react";
import { Play, Plus, Bookmark, Star, Ticket } from "lucide-react";
import Button from "@/components/ui/Button";
import RatingModal from "@/components/movie/RatingModal";
import { toast } from "@/components/ui/Toast";
import type { RatingInput } from "@/types";

interface MovieActionsProps {
  movieId:   string;
  tmdbId:    number;
  trailerUrl?: string | null;
}

export default function MovieActions({ movieId, tmdbId, trailerUrl }: MovieActionsProps) {
  const [ratingOpen,   setRatingOpen]   = useState(false);
  const [watchlisting, setWatchlisting] = useState(false);
  const [showTrailer,  setShowTrailer]  = useState(false);

  async function handleRatingSubmit(rating: RatingInput) {
    const res = await fetch("/api/ratings", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ movie_id: movieId, ...rating }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Failed to submit rating");
    }
    const data = await res.json();
    toast.success("Rating submitted!", `+${data.xp_gained} XP`);
    toast.xp(data.xp_gained, "Rated a movie");
  }

  async function handleWatchlist() {
    setWatchlisting(true);
    try {
      const res = await fetch("/api/watchlist", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ movie_id: movieId, status: "want_to_watch" }),
      });
      if (res.ok) {
        toast.success("Added to watchlist!", "+10 XP");
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Failed to add to watchlist");
      }
    } finally {
      setWatchlisting(false);
    }
  }

  const youtubeId = trailerUrl?.match(/(?:v=|youtu\.be\/)([^&?\s]+)/)?.[1];

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setRatingOpen(true)} size="lg" icon={<Star size={16} />}>
          Rate This
        </Button>

        <Button
          variant="secondary"
          size="lg"
          icon={<Bookmark size={16} />}
          loading={watchlisting}
          onClick={handleWatchlist}
        >
          Watchlist
        </Button>

        {youtubeId && (
          <Button
            variant="ghost"
            size="lg"
            icon={<Play size={16} />}
            onClick={() => setShowTrailer(true)}
          >
            Trailer
          </Button>
        )}

        <Button
          variant="gold"
          size="lg"
          icon={<Ticket size={16} />}
          onClick={() => toast.info("Theatre tickets — coming soon!")}
        >
          🎟️ Book -20%
        </Button>
      </div>

      {/* Rating Modal */}
      <RatingModal
        open={ratingOpen}
        onClose={() => setRatingOpen(false)}
        movieTitle=""
        onSubmit={handleRatingSubmit}
      />

      {/* Trailer Modal */}
      {showTrailer && youtubeId && (
        <div
          className="fixed inset-0 z-[1000] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowTrailer(false)}
        >
          <div className="w-full max-w-3xl aspect-video">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1`}
              className="w-full h-full rounded-xl"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </>
  );
}
