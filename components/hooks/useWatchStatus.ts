"use client";

import { useEffect, useState } from "react";

type StatusMap = {
  watched:       Set<number>;
  want_to_watch: Set<number>;
};

type Listener = (m: StatusMap) => void;

let cached:   StatusMap | null = null;
let inflight: Promise<StatusMap> | null = null;
const listeners = new Set<Listener>();

function notify() {
  if (!cached) return;
  listeners.forEach((l) => l(cached!));
}

function load(): Promise<StatusMap> {
  if (cached)   return Promise.resolve(cached);
  if (inflight) return inflight;
  inflight = fetch("/api/watchlist/all", { cache: "no-store" })
    .then((r) => r.ok ? r.json() : { watched: [], want_to_watch: [] })
    .then((j) => {
      cached = {
        watched:       new Set<number>(j.watched ?? []),
        want_to_watch: new Set<number>(j.want_to_watch ?? []),
      };
      inflight = null;
      notify();
      return cached;
    })
    .catch(() => {
      cached = { watched: new Set(), want_to_watch: new Set() };
      inflight = null;
      notify();
      return cached;
    });
  return inflight;
}

export function setLocalWatchStatus(tmdbId: number, status: "watched" | "want_to_watch" | null) {
  if (!cached) cached = { watched: new Set(), want_to_watch: new Set() };
  cached.watched.delete(tmdbId);
  cached.want_to_watch.delete(tmdbId);
  if (status === "watched")       cached.watched.add(tmdbId);
  if (status === "want_to_watch") cached.want_to_watch.add(tmdbId);
  notify();
}

export function useWatchStatus(tmdbId: number) {
  const [status, setStatus] = useState<"watched" | "want_to_watch" | null>(null);

  useEffect(() => {
    if (cached) {
      if (cached.watched.has(tmdbId))            setStatus("watched");
      else if (cached.want_to_watch.has(tmdbId)) setStatus("want_to_watch");
      else                                       setStatus(null);
    }
    const listener: Listener = (m) => {
      if (m.watched.has(tmdbId))            setStatus("watched");
      else if (m.want_to_watch.has(tmdbId)) setStatus("want_to_watch");
      else                                  setStatus(null);
    };
    listeners.add(listener);
    load();
    return () => { listeners.delete(listener); };
  }, [tmdbId]);

  return status;
}
