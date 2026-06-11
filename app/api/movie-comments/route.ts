import { NextRequest, NextResponse } from "next/server";
import type { Verdict, MediaKind } from "@/lib/comments";
import { commentKey, toMovieComment } from "@/lib/comments";
import { prisma } from "@/lib/prisma";

const VERDICTS: Verdict[] = ["skip", "timepass", "watchit", "masterpiece"];

function parseKind(raw: string | null | undefined): MediaKind {
  return raw === "tv" ? "tv" : "movie";
}

// Only allow safe chars in an explicit scope to keep the key space sane.
function sanitizeScope(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 80) return null;
  return /^[a-zA-Z0-9:_\-]+$/.test(trimmed) ? trimmed : null;
}

export async function GET(req: NextRequest) {
  const scopeParam = sanitizeScope(req.nextUrl.searchParams.get("scope"));
  const tmdbId     = req.nextUrl.searchParams.get("tmdb_id");

  let key: string;
  if (scopeParam) {
    key = scopeParam;
  } else {
    if (!tmdbId) return NextResponse.json({ error: "tmdb_id or scope required" }, { status: 400 });
    const kind = parseKind(req.nextUrl.searchParams.get("kind"));
    key = commentKey(Number(tmdbId), kind);
  }

  const rows = await prisma.movieComment.findMany({
    where:   { scope: key },
    orderBy: { created_at: "desc" },
  });

  return NextResponse.json({
    comments: rows.map(toMovieComment),
    count: rows.length,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const tmdbId   = Number(body.tmdb_id);
  const kind     = parseKind(body.kind);
  const scope    = sanitizeScope(body.scope);
  const username = String(body.username ?? "").trim().slice(0, 32);
  const verdict  = String(body.verdict ?? "") as Verdict;
  const text     = String(body.text ?? "").trim().slice(0, 1000);

  if (!username || !text || !VERDICTS.includes(verdict)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  if (!scope && !tmdbId) {
    return NextResponse.json({ error: "tmdb_id or scope required" }, { status: 400 });
  }

  const key = scope ?? commentKey(tmdbId, kind);

  const row = await prisma.movieComment.create({
    data: {
      scope:   key,
      tmdb_id: tmdbId || 0,
      username,
      verdict,
      text,
    },
  });

  return NextResponse.json({ comment: toMovieComment(row) });
}
