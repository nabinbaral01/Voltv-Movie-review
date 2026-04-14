import { NextRequest, NextResponse } from "next/server";
import { getTrending } from "@/lib/tmdb";
import { getCache, setCache, CacheKeys, TTL } from "@/lib/redis";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const window = (searchParams.get("window") ?? "week") as "day" | "week";

  const cacheKey = `${CacheKeys.trending(window)}:${page}`;
  const cached = await getCache(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const data = await getTrending(window, page);
    await setCache(cacheKey, data, TTL.trending);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch trending" }, { status: 500 });
  }
}
