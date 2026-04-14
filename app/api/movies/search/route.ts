import { NextRequest, NextResponse } from "next/server";
import { searchMovies, searchTV } from "@/lib/tmdb";
import { getCache, setCache, CacheKeys, TTL, rateLimit, isRedisDisabled } from "@/lib/redis";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const query   = searchParams.get("q")?.trim();
  const page    = parseInt(searchParams.get("page") ?? "1", 10);
  const type    = (searchParams.get("type") ?? "movie") as "movie" | "tv" | "anime";
  const country = searchParams.get("country")?.toUpperCase();

  if (!query || query.length < 2) {
    return NextResponse.json({ data: [], total: 0, page: 1, has_more: false });
  }

  // Skip Redis work entirely when no Redis is configured
  if (!isRedisDisabled()) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    const { allowed } = await rateLimit(ip, "search", 60, 60);
    if (!allowed) {
      return NextResponse.json({ error: "Too many searches" }, { status: 429 });
    }

    const cacheKey = `${CacheKeys.search(query.toLowerCase(), page)}:${type}:${country ?? ""}`;
    const cached   = await getCache(cacheKey);
    if (cached) return NextResponse.json({ data: cached });
  }

  try {
    const results = type === "movie"
      ? await searchMovies(query, page)
      : await searchTV(query, page);

    // post-filter
    let items = results.results as Array<{ origin_country?: string[]; genre_ids?: number[]; original_language?: string }>;
    if (type === "anime") {
      items = items.filter((r) =>
        (r.origin_country?.includes("JP") || r.original_language === "ja")
        && (r.genre_ids?.includes(16) ?? true)
      );
    }
    if (country) {
      items = items.filter((r) =>
        r.origin_country?.includes(country) || r.original_language === country.toLowerCase()
      );
    }
    const data = {
      results:       items,
      total_results: items.length,
      total_pages:   results.total_pages,
      page:          results.page,
      has_more:      results.page < results.total_pages,
    };

    if (!isRedisDisabled()) {
      await setCache(`${CacheKeys.search(query.toLowerCase(), page)}:${type}:${country ?? ""}`, data, TTL.search);
    }
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
