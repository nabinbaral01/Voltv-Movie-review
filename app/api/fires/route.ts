import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { readFireStore, writeFireStore, fireKey, topFires, type FireKind } from "@/lib/fires";

function parseKind(raw: unknown): FireKind {
  return raw === "tv" ? "tv" : "movie";
}

// GET /api/fires?limit=10  → top items
// GET /api/fires?tmdb_id=X&kind=movie  → single item + whether viewer has fired
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const tmdbIdRaw = sp.get("tmdb_id");
  const store = await readFireStore();

  if (tmdbIdRaw) {
    const tmdbId = Number(tmdbIdRaw);
    const kind   = parseKind(sp.get("kind"));
    const entry  = store[fireKey(tmdbId, kind)];
    const user   = await getSessionUser();
    const fired  = !!(user && entry && entry.users.includes(user.id));
    return NextResponse.json({
      count: entry?.count ?? 0,
      fired,
    });
  }

  const limit = Math.min(50, Math.max(1, Number(sp.get("limit")) || 10));
  return NextResponse.json({ entries: topFires(store, limit) });
}

// POST /api/fires  { tmdb_id, kind, title, poster_url }
// Toggles the current user's fire on the item.
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const tmdbId = Number(body.tmdb_id);
  const kind   = parseKind(body.kind);
  const title  = typeof body.title === "string" ? body.title.slice(0, 200) : "";
  const poster = typeof body.poster_url === "string" ? body.poster_url.slice(0, 500) : null;

  if (!Number.isFinite(tmdbId) || tmdbId <= 0) {
    return NextResponse.json({ error: "tmdb_id required" }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }

  const store = await readFireStore();
  const key = fireKey(tmdbId, kind);
  const entry = store[key] ?? {
    tmdb_id:    tmdbId,
    kind,
    title,
    poster_url: poster,
    count:      0,
    users:      [],
    updatedAt:  new Date().toISOString(),
  };

  // Keep latest metadata fresh
  entry.title = title;
  if (poster) entry.poster_url = poster;

  const alreadyFired = entry.users.includes(user.id);
  if (alreadyFired) {
    entry.users = entry.users.filter((id) => id !== user.id);
    entry.count = Math.max(0, entry.count - 1);
  } else {
    entry.users.push(user.id);
    entry.count += 1;
  }
  entry.updatedAt = new Date().toISOString();
  store[key] = entry;
  await writeFireStore(store);

  return NextResponse.json({ count: entry.count, fired: !alreadyFired });
}
