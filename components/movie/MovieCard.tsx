"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn, formatScore, formatRuntime, extractYear, scoreColor } from "@/utils/formatters";
import { posterUrl } from "@/lib/tmdb";
import PosterActions from "./PosterActions";
import type { MovieCard as MovieCardType } from "@/types";

interface MovieCardProps {
  movie: MovieCardType;
  size?: "sm" | "md" | "lg";
  showScore?: boolean;
  showYear?: boolean;
  className?: string;
  priority?: boolean;
}

export default function MovieCard({
  movie,
  size = "md",
  showScore = true,
  showYear = true,
  className,
  priority,
}: MovieCardProps) {
  const [imageError, setImageError] = useState(false);
  const [hovered, setHovered] = useState(false);

  const sizeClasses = {
    sm: "w-[120px]",
    md: "w-[160px]",
    lg: "w-[200px]",
  };

  const aspectClasses = "aspect-[2/3]";

  return (
    <Link
      href={`/movie/${movie.tmdb_id}`}
      className={cn("flex flex-col gap-2 group", sizeClasses[size], className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Poster */}
      <div
        className={cn(
          "poster-card w-full",
          aspectClasses,
          "bg-[#1A1A28] overflow-hidden"
        )}
      >
        {!imageError && movie.poster_url ? (
          <Image
            src={posterUrl(movie.poster_url.replace("https://image.tmdb.org/t/p/w500", ""), "w342")}
            alt={movie.title}
            fill
            sizes="(max-width: 640px) 120px, (max-width: 1024px) 160px, 200px"
            className={cn(
              "object-cover transition-transform duration-500",
              hovered && "scale-105"
            )}
            onError={() => setImageError(true)}
            priority={priority}
          />
        ) : (
          <PosterFallback title={movie.title} />
        )}

        {/* Hover overlay */}
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent",
            "opacity-0 group-hover:opacity-100 transition-opacity duration-300",
            "flex flex-col justify-end p-2"
          )}
        >
          {showScore && movie.voltv_score !== null && (
            <div className="flex items-center gap-1">
              <span className="text-[#E50914] font-bold text-xs">⚡</span>
              <span className={cn("font-mono font-bold text-sm", scoreColor(movie.voltv_score))}>
                {formatScore(movie.voltv_score)}
              </span>
            </div>
          )}
        </div>

        {/* Upcoming badge */}
        {movie.is_upcoming && (
          <div className="absolute top-2 left-2 bg-[#F5A623] text-black text-[10px] font-bold px-2 py-0.5 rounded-[4px]">
            UPCOMING
          </div>
        )}

        {/* Quick actions — Watched (eye) + Watch Later (plus) + Fire */}
        <PosterActions
          tmdbId={movie.tmdb_id}
          alwaysShowWatched
          title={movie.title}
          posterUrl={movie.poster_url}
        />
      </div>

      {/* Info below poster */}
      <div className="space-y-0.5 px-0.5">
        <p className="text-sm font-semibold text-white leading-tight line-clamp-2 group-hover:text-[#E50914] transition-colors">
          {movie.title}
        </p>
        <div className="flex items-center gap-2 text-xs text-[#505060]">
          {showYear && movie.release_date && (
            <span>{extractYear(movie.release_date)}</span>
          )}
          {movie.runtime && (
            <>
              <span>·</span>
              <span>{formatRuntime(movie.runtime)}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

// Scrollable row of movie cards
export function MovieRow({
  title,
  movies,
  size,
  viewAllHref,
}: {
  title: string;
  movies: MovieCardType[];
  size?: "sm" | "md" | "lg";
  viewAllHref?: string;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-4 md:px-0">
        <h2 className="text-lg font-bold text-white">{title}</h2>
        {viewAllHref && (
          <Link href={viewAllHref} className="text-sm text-[#E50914] hover:underline">
            See all →
          </Link>
        )}
      </div>
      <div className="flex gap-4 overflow-x-auto no-scrollbar px-4 md:px-0 pb-2">
        {movies.map((movie) => (
          <div key={movie.id} className="shrink-0">
            <MovieCard movie={movie} size={size} />
          </div>
        ))}
      </div>
    </section>
  );
}

function PosterFallback({ title }: { title: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-[#1A1A28]">
      <div className="text-center p-2">
        <div className="text-4xl mb-2">🎬</div>
        <p className="text-xs text-[#505060] line-clamp-2">{title}</p>
      </div>
    </div>
  );
}
