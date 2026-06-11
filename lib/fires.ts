import { prisma } from "./prisma";

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
  const rows = await prisma.fire.findMany();
  const store: FireStore = {};
  for (const r of rows) {
    store[r.key] = {
      tmdb_id:    r.tmdb_id,
      kind:       r.kind as FireKind,
      title:      r.title,
      poster_url: r.poster_url,
      count:      r.count,
      users:      r.users,
      updatedAt:  r.updated_at.toISOString(),
    };
  }
  return store;
}

// Toggle a user's fire on an item. Returns the new count and whether the user
// now has it fired. Replaces the old read-all / write-all JSON flow.
export async function toggleFire(args: {
  tmdbId: number;
  kind:   FireKind;
  title:  string;
  poster: string | null;
  userId: string;
}): Promise<{ count: number; fired: boolean }> {
  const key      = fireKey(args.tmdbId, args.kind);
  const existing = await prisma.fire.findUnique({ where: { key } });

  const alreadyFired = existing?.users.includes(args.userId) ?? false;
  const users = alreadyFired
    ? (existing!.users.filter((id) => id !== args.userId))
    : [...(existing?.users ?? []), args.userId];
  const count = alreadyFired
    ? Math.max(0, (existing?.count ?? 0) - 1)
    : (existing?.count ?? 0) + 1;

  await prisma.fire.upsert({
    where:  { key },
    create: {
      key,
      tmdb_id:    args.tmdbId,
      kind:       args.kind,
      title:      args.title,
      poster_url: args.poster,
      count,
      users,
    },
    update: {
      title:      args.title,
      poster_url: args.poster ?? existing?.poster_url ?? null,
      count,
      users,
    },
  });

  return { count, fired: !alreadyFired };
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
