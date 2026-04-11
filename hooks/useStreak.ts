"use client";

import { useState, useEffect } from "react";

interface StreakData {
  streak_count:    number;
  streak_at_risk:  boolean;
  shields:         number;
}

export function useStreak(): StreakData & { loading: boolean } {
  const [data,    setData]    = useState<StreakData>({ streak_count: 0, streak_at_risk: false, shields: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/streak/check")
      .then((r) => r.json())
      .then((d) => { setData(d.data ?? data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return { ...data, loading };
}
