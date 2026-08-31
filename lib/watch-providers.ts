// Where a "Streams on" chip should actually take you.
//
// TMDB's watch/providers payload has no per-service deep link — its `link`
// field points at TMDB's own watch page, which is why every provider chip
// used to open TMDB. JustWatch licenses the real deep links and TMDB does not
// pass them through, so the closest honest thing is to open that service's own
// search for the title. Anything we don't recognise falls back to the TMDB
// page, which is still better than a dead link.

const q = (s: string) => encodeURIComponent(s);

// Ordered: the first match wins, so more specific names come first
// ("Disney+ Hotstar" must not be caught by the Disney+ rule).
const RULES: { match: RegExp; url: (title: string) => string }[] = [
  { match: /hotstar/i,        url: (t) => `https://www.hotstar.com/in/explore?q=${q(t)}` },
  { match: /netflix/i,        url: (t) => `https://www.netflix.com/search?q=${q(t)}` },
  { match: /prime video|amazon/i, url: (t) => `https://www.amazon.com/s?k=${q(t)}&i=instant-video` },
  { match: /disney/i,         url: (t) => `https://www.disneyplus.com/search?q=${q(t)}` },
  { match: /hbo|^max$|\bmax\b/i, url: (t) => `https://play.max.com/search?q=${q(t)}` },
  { match: /hulu/i,           url: (t) => `https://www.hulu.com/search?q=${q(t)}` },
  { match: /apple tv/i,       url: (t) => `https://tv.apple.com/search?term=${q(t)}` },
  { match: /paramount/i,      url: (t) => `https://www.paramountplus.com/search/${q(t)}/` },
  { match: /peacock/i,        url: (t) => `https://www.peacocktv.com/search?q=${q(t)}` },
  { match: /crunchyroll/i,    url: (t) => `https://www.crunchyroll.com/search?q=${q(t)}` },
  { match: /google play/i,    url: (t) => `https://play.google.com/store/search?q=${q(t)}&c=movies` },
  { match: /youtube tv/i,     url: () => `https://tv.youtube.com/` },
  { match: /youtube/i,        url: (t) => `https://www.youtube.com/results?search_query=${q(t)}` },
  { match: /fandango at home|vudu/i, url: (t) => `https://www.fandangoathome.com/search?q=${q(t)}` },
  { match: /tubi/i,           url: (t) => `https://tubitv.com/search/${q(t)}` },
  { match: /starz/i,          url: (t) => `https://www.starz.com/us/en/search?q=${q(t)}` },
  { match: /mubi/i,           url: (t) => `https://mubi.com/en/search?query=${q(t)}` },
  { match: /zee5/i,           url: (t) => `https://www.zee5.com/search?q=${q(t)}` },
  { match: /sonyliv/i,        url: (t) => `https://www.sonyliv.com/search?searchTerm=${q(t)}` },
  { match: /jiocinema/i,      url: (t) => `https://www.jiocinema.com/search/${q(t)}` },
];

// Returns the best destination for a provider chip, or null if there is
// nowhere sensible to send the user.
export function providerUrl(
  providerName: string,
  title: string,
  fallback?: string | null,
): string | null {
  const rule = RULES.find((r) => r.match.test(providerName));
  if (rule) return rule.url(title);
  return fallback ?? null;
}

// True when the chip opens the actual streaming service rather than the
// TMDB fallback — used to label the link honestly.
export function isDirectProviderLink(providerName: string): boolean {
  return RULES.some((r) => r.match.test(providerName));
}
