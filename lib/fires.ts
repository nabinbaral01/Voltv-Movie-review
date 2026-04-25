import fs from "node:fs/promises";
import path from "node:path";

const FILE = path.join(process.cwd(), "data", "fires.json");

export type FireKind = "movie" | "tv";

export interface FireEntry {
  tmdb_id:    number;
  kind:       FireKind;
  title:      string;
  poster_url: string | null;
  count:      number;
  users:      string[];    // user ids that have fired this item
  updatedAt:  string;
}

export type FireStore = Record<string, FireEntry>; // key = `${kind}:${tmdb_id}`

export function fireKey(tmdbId: number, kind: FireKind): string {
  return `${kind}:${tmdbId}`;
}

export async function readFireStore(): Promise<FireStore> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    return JSON.parse(raw) as FireStore;
  } catch {
    return {};
  }
}

export async function writeFireStore(store: FireStore): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(store, null, 2), "utf8");
}

export function topFires(store: FireStore, limit = 10): FireEntry[] {
  return Object.values(store)
    .filter((e) => e.count > 0)
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.updatedAt.localeCompare(a.updatedAt);
    })
    .slice(0, limit);
}
