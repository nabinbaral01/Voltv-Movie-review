"use client";

import { useEffect, useState } from "react";

export interface Me {
  username:     string;
  avatar_url:   string | null;
  xp_points:    number;
  streak_count: number;
  is_admin:     boolean;
  is_blue_tick: boolean;
}

// Module-level cache so Topbar + Sidebar share a single fetch per page load
let cached: Me | null | undefined;
let inflight: Promise<Me | null> | null = null;

export function useMe(): { me: Me | null; loading: boolean } {
  const [me, setMe]           = useState<Me | null>(cached ?? null);
  const [loading, setLoading] = useState(cached === undefined);

  useEffect(() => {
    if (cached !== undefined) { setMe(cached); setLoading(false); return; }
    if (!inflight) {
      inflight = fetch("/api/user/me")
        .then((r) => r.ok ? r.json() : { user: null })
        .then((j) => { cached = (j.user ?? null) as Me | null; return cached as Me | null; })
        .catch(() => { cached = null; return null; });
    }
    inflight!.then((u) => { setMe(u); setLoading(false); });
  }, []);

  return { me, loading };
}
