"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Film } from "lucide-react";

interface Movie {
  id: string;
  tmdb_id: number;
  title: string;
  poster_url: string | null;
  release_date: Date | string | null;
}

interface Props {
  title: string;
  emptyText: string;
  items: Movie[];
}

const MIN_COLS = 3;
const MAX_COLS = 30;

export default function ZoomableMovieGrid({ title, emptyText, items }: Props) {
  const [cols, setCols] = useState(6);

  const showTitle = cols <= 8;
  const gap = cols <= 6 ? "6px" : cols <= 12 ? "3px" : "2px";

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[#A0A0B0] uppercase tracking-wide flex items-center gap-2">
          <Film size={14} />
          {title}
          <span className="text-white bg-[#E50914] text-[10px] font-bold px-2 py-0.5 rounded-full ml-1">
            {items.length}
          </span>
        </h2>

        {items.length > 0 && (
          <div className="flex items-center gap-2 bg-[#1A1A28] rounded-full px-2 py-1 border border-[#1E1E2E]">
            <button
              onClick={() => setCols((c) => Math.max(c - 1, MIN_COLS))}
              disabled={cols <= MIN_COLS}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[#A0A0B0] hover:text-white hover:bg-white/[0.06] disabled:opacity-30 transition-colors"
            >
              <Plus size={12} />
            </button>
            <input
              type="range"
              min={MIN_COLS}
              max={MAX_COLS}
              value={MAX_COLS + MIN_COLS - cols}
              onChange={(e) => setCols(MAX_COLS + MIN_COLS - Number(e.target.value))}
              className="w-20 sm:w-28 h-1 accent-[#E50914] cursor-pointer"
            />
            <button
              onClick={() => setCols((c) => Math.min(c + 1, MAX_COLS))}
              disabled={cols >= MAX_COLS}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[#A0A0B0] hover:text-white hover:bg-white/[0.06] disabled:opacity-30 transition-colors"
            >
              <Minus size={12} />
            </button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="card p-4 text-sm text-[#505060]">{emptyText}</div>
      ) : (
        <div
          className="grid transition-all duration-150"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gap,
          }}
        >
          {items.map((m) => (
            <Link
              key={m.id}
              href={`/movie/${m.tmdb_id}`}
              className="group relative"
              title={m.title}
            >
              <div className="w-full aspect-[2/3] rounded-lg overflow-hidden bg-[#1A1A28] border border-[#1E1E2E] group-hover:border-[#E50914]/50 transition-colors">
                {m.poster_url ? (
                  <Image
                    src={m.poster_url}
                    alt={m.title}
                    fill
                    sizes={`${Math.round(100 / cols)}vw`}
                    className="object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <div className="w-full h-full bg-[#2A2A3A] flex items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-1/2 h-1/2 text-[#3A3A4A]">
                      <circle cx="50" cy="38" r="18" fill="currentColor" />
                      <ellipse cx="50" cy="80" rx="30" ry="22" fill="currentColor" />
                    </svg>
                  </div>
                )}
              </div>
              {showTitle && (
                <p className="mt-1 text-[10px] text-white leading-tight line-clamp-1 group-hover:text-[#E50914] transition-colors">
                  {m.title}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
