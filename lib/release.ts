// Release gating.
//
// A title counts as unreleased only when we know its release date and that date
// is still in the future. An unknown date is treated as released, so obscure or
// incompletely-catalogued titles are never locked out by accident.

export function isUnreleased(releaseDate: Date | string | null | undefined): boolean {
  if (!releaseDate) return false;
  const ts = new Date(releaseDate).getTime();
  if (Number.isNaN(ts)) return false;
  return ts > Date.now();
}

// "18 Dec 2026" — used for the "Coming <date>" badge on unreleased titles.
export function formatReleaseDate(releaseDate: Date | string): string {
  const d = new Date(releaseDate);
  if (Number.isNaN(d.getTime())) return "soon";
  return d.toLocaleDateString("en-GB", {
    day:      "numeric",
    month:    "short",
    year:     "numeric",
    timeZone: "UTC",
  });
}

export const UNRELEASED_RATING_ERROR =
  "This title hasn't been released yet — you can add it to your watchlist instead";

export const UNRELEASED_WATCHED_ERROR =
  "This title hasn't been released yet — add it to your watchlist instead";
