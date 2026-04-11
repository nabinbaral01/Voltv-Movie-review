"use client";

import { useState, useEffect } from "react";
import type { Rating, WatchStatus } from "@/types";

interface MovieUserData {
  rating:       Rating | null;
  watch_status: WatchStatus | null;
  loading:      boolean;
}

export function useMovieUserData(movieId: string): MovieUserData {
  const [data, setData]     = useState<MovieUserData>({ rating: null, watch_status: null, loading: true });

  useEffect(() => {
    if (!movieId) return;

    async function load() {
      try {
        const [ratingRes, watchRes] = await Promise.all([
          fetch(`/api/ratings?movie_id=${movieId}`),
          fetch(`/api/watchlist?movie_id=${movieId}`),
        ]);
        const ratingData = await ratingRes.json();
        const watchData  = await watchRes.json();

        setData({
          rating:       ratingData.data ?? null,
          watch_status: watchData.data?.status ?? null,
          loading:      false,
        });
      } catch {
        setData((d) => ({ ...d, loading: false }));
      }
    }

    load();
  }, [movieId]);

  return data;
}
