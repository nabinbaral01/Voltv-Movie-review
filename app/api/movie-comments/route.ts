import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type { MovieComment, Verdict } from "@/lib/comments";

const FILE = path.join(process.cwd(), "data", "comments.json");
const VERDICTS: Verdict[] = ["skip", "timepass", "watchit", "masterpiece"];

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
  const tmdbId = req.nextUrl.searchParams.get("tmdb_id");
  if (!tmdbId) return NextResponse.json({ error: "tmdb_id required" }, { status: 400 });

  const store = await readStore();
  const list = store[tmdbId] ?? [];

  return NextResponse.json({
    comments: [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    count: list.length,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const tmdbId   = Number(body.tmdb_id);
  const username = String(body.username ?? "").trim().slice(0, 32);
  const verdict  = String(body.verdict ?? "") as Verdict;
  const text     = String(body.text ?? "").trim().slice(0, 1000);

  if (!tmdbId || !username || !text || !VERDICTS.includes(verdict)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const comment: MovieComment = {
    id: crypto.randomUUID(),
    tmdb_id: tmdbId,
    username,
    verdict,
    text,
    createdAt: new Date().toISOString(),
  };

  const store = await readStore();
  const key = String(tmdbId);
  store[key] = [...(store[key] ?? []), comment];
  await writeStore(store);

  return NextResponse.json({ comment });
}
