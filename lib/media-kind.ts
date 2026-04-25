// TV shows share the Movie table but use an offset tmdb_id so they don't
// collide with real movie ids (TMDB movie/tv namespaces overlap).
// Real TMDB ids are well under 10^8 today, so 10^9 is a safe boundary.
export const TV_TMDB_OFFSET = 1_000_000_000;

export type MediaKind = "movie" | "tv";

export function storageIdFor(tmdbId: number, kind: MediaKind): number {
  return kind === "tv" ? TV_TMDB_OFFSET + tmdbId : tmdbId;
}

export function decodeStorageId(storageId: number): { tmdbId: number; kind: MediaKind } {
  if (storageId >= TV_TMDB_OFFSET) {
    return { tmdbId: storageId - TV_TMDB_OFFSET, kind: "tv" };
  }
  return { tmdbId: storageId, kind: "movie" };
}

export function isStoredTV(storageId: number): boolean {
  return storageId >= TV_TMDB_OFFSET;
}
