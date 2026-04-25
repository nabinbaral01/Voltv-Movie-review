import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type { MovieComment, Verdict, MediaKind } from "@/lib/comments";
import { commentKey } from "@/lib/comments";

const FILE = path.join(process.cwd(), "data", "comments.json");
const VERDICTS: Verdict[] = ["skip", "timepass", "watchit", "masterpiece"];

function parseKind(raw: string | null | undefined): MediaKind {
  return raw === "tv" ? "tv" : "movie";
}

// Only allow safe chars in an explicit scope to keep the JSON key space sane.
function sanitizeScope(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 80) return null;
  return /^[a-zA-Z0-9:_\-]+$/.test(trimmed) ? trimmed : null;
}

type Store = Record<string, MovieComment[]>;

async function readStore(): Promise<Store> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    return JSON.parse(raw) as Store;
  } catch {
    return {};
  }
}

async function writeStore(store: Store) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(store, null, 2), "utf8");
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

  const store = await readStore();
  const list  = store[key] ?? [];

  return NextResponse.json({
    comments: [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    count: list.length,
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

  const comment: MovieComment = {
    id: crypto.randomUUID(),
    tmdb_id: tmdbId || 0,
    username,
    verdict,
    text,
    createdAt: new Date().toISOString(),
  };

  const store = await readStore();
  const key = scope ?? commentKey(tmdbId, kind);
  store[key] = [...(store[key] ?? []), comment];
  await writeStore(store);

  return NextResponse.json({ comment });
}
