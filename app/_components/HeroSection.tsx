import Image from "next/image";
import Link from "next/link";
import { Play, Plus } from "lucide-react";
import { backdropUrl } from "@/lib/tmdb";
import { extractYear } from "@/utils/formatters";
import type { MovieCard } from "@/types";

export default function HeroSection({ movie }: { movie: MovieCard }) {
  const backdrop = movie.poster_url
    ? backdropUrl(movie.poster_url.replace("https://image.tmdb.org/t/p/w500", "").replace("https://image.tmdb.org/t/p/w1280", ""), "w1280")
    : null;

  return (
    <section className="relative w-full h-[280px] sm:h-[360px] rounded-2xl overflow-hidden">
      {/* Backdrop */}
      {backdrop ? (
        <Image
          src={backdrop}
          alt={movie.title}
          fill
          priority
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 768px"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#1A1A28] to-[#0A0A0F]" />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F] via-[#0A0A0F]/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0F]/80 via-transparent to-transparent" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 p-6 max-w-lg">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-bold text-[#E50914] uppercase tracking-wider">
            🔥 Trending Now
          </span>
          {movie.release_date && (
            <span className="text-xs text-[#505060]">
              {extractYear(movie.release_date)}
            </span>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-3">
          {movie.title}
        </h1>

        <div className="flex items-center gap-3">
          <Link
            href={`/movie/${movie.tmdb_id}`}
            className="btn-primary text-sm h-9 px-4"
          >
            <Play size={14} fill="white" />
            View Movie
          </Link>
          <button className="btn-secondary text-sm h-9 px-4">
            <Plus size={14} />
            Watchlist
          </button>
        </div>
      </div>
    </section>
  );
}
