"use client";

import { useState } from "react";
import Image from "next/image";
import { Play, X } from "lucide-react";

interface Props {
  videoId: string;
  bannerUrl: string | null;
}

export default function TrailerBanner({ videoId, bannerUrl }: Props) {
  const [playing, setPlaying] = useState(false);
  const thumbUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  return (
    <>
      {/* Thumbnail + play button */}
      <button
        onClick={() => setPlaying(true)}
        className="absolute inset-0 w-full h-full group cursor-pointer"
      >
        <Image
          src={bannerUrl ?? thumbUrl}
          alt="Cover"
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-[#E50914] flex items-center justify-center shadow-lg shadow-black/40 group-hover:scale-110 transition-transform">
            <Play size={24} className="text-white ml-1" fill="white" />
          </div>
        </div>
        <span className="absolute bottom-3 left-4 text-xs text-white/70 font-medium">
          ▶ Watch Trailer
        </span>
      </button>

      {/* Fullscreen overlay player */}
      {playing && (
        <div
          className="fixed inset-0 z-[950] bg-black/90 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setPlaying(false)}
        >
          <button
            onClick={() => setPlaying(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
          >
            <X size={22} />
          </button>
          <div
            className="w-full max-w-4xl aspect-video mx-4 rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
              className="w-full h-full border-0"
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </>
  );
}
