"use client";

import { useState } from "react";
import Image from "next/image";
import { Play, X } from "lucide-react";

interface Props {
  backdrop:  string | null;
  videoId:   string | null;
  title:     string;
}

export default function TrailerHero({ backdrop, videoId, title }: Props) {
  const [playing, setPlaying] = useState(false);

  return (
    <>
      <div className="relative w-full h-[320px] sm:h-[420px] overflow-hidden">
        {backdrop ? (
          <Image
            src={backdrop}
            alt={title}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1A1A28] to-[#0A0A0F]" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F] via-[#0A0A0F]/40 to-transparent pointer-events-none" />

        {videoId && (
          <button
            onClick={() => setPlaying(true)}
            aria-label="Play trailer"
            className="group absolute inset-0 w-full h-full flex items-center justify-center cursor-pointer focus:outline-none"
          >
            <span className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
            <span className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#E50914]/90 hover:bg-[#E50914] flex items-center justify-center shadow-xl shadow-black/50 group-hover:scale-110 transition-transform">
              <Play size={28} className="text-white ml-1" fill="white" />
            </span>
            <span className="absolute bottom-3 left-4 sm:bottom-4 sm:left-6 text-xs sm:text-sm text-white/80 font-semibold tracking-wide drop-shadow">
              ▶ Watch Trailer
            </span>
          </button>
        )}
      </div>

      {playing && videoId && (
        <div
          className="fixed inset-0 z-[950] bg-black/90 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setPlaying(false)}
        >
          <button
            onClick={() => setPlaying(false)}
            aria-label="Close trailer"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white z-10"
          >
            <X size={22} />
          </button>
          <div
            className="w-full max-w-5xl aspect-video mx-4 rounded-xl overflow-hidden shadow-2xl"
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
