"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus, Search, X, Film } from "lucide-react";
import { toast } from "@/components/ui/Toast";

interface TmdbMovie {
  id:           number;
  title:        string;
  release_date?: string;
  poster_path:  string | null;
}

// Session-wide in-memory cache keyed by lowercase query
const searchCache = new Map<string, TmdbMovie[]>();

export default function AddMovieButton({ collectionId }: { collectionId: string }) {
  const router = useRouter();
  const [open,      setOpen]      = useState(false);
  const [query,     setQuery]     = useState("");
  const [results,   setResults]   = useState<TmdbMovie[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding,    setAdding]    = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }

    // Instant hit from session cache
    const hit = searchCache.get(q.toLowerCase());
    if (hit) { setResults(hit); setSearching(false); return; }

    const ac = new AbortController();
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res  = await fetch(`/api/movies/search?q=${encodeURIComponent(q)}`, { signal: ac.signal });
        const json = await res.json();
        const list = ((json.data?.results ?? json.data ?? []) as TmdbMovie[]).slice(0, 10);
        searchCache.set(q.toLowerCase(), list);
        setResults(list);
      } catch { /* aborted or failed */ } finally { setSearching(false); }
    }, 220);
    return () => { clearTimeout(t); ac.abort(); };
  }, [query, open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function add(m: TmdbMovie) {
    setAdding(m.id);
    try {
      // 1) Ensure movie synced to our DB
      await fetch(`/api/movies/${m.id}`);
      // 2) Add to collection
      const res = await fetch(`/api/collections/${collectionId}/movies`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ tmdb_id: m.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      toast.success(`Added "${m.title}"`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setAdding(null);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-primary text-sm h-9 px-4 inline-flex items-center gap-1.5"
      >
        <Plus size={14} /> Add movie
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center pt-20 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="card w-full max-w-lg p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Add a movie</h2>
              <button onClick={() => setOpen(false)} className="p-1 text-[#A0A0B0] hover:text-white" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#505060]" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search TMDB..."
                className="w-full pl-9 pr-3 py-2 bg-[#0A0A0F] border border-[#1E1E2E] rounded-[8px] text-sm text-white placeholder:text-[#505060] focus:outline-none focus:border-[#E50914]/50"
              />
            </div>

            <div className="max-h-96 overflow-y-auto space-y-1">
              {searching && <p className="text-xs text-[#505060] p-2">Searching...</p>}
              {!searching && query.trim().length >= 2 && results.length === 0 && (
                <p className="text-xs text-[#505060] p-2">No matches</p>
              )}
              {results.map((m) => (
                <button
                  key={m.id}
                  onClick={() => add(m)}
                  disabled={adding === m.id}
                  className="w-full flex items-center gap-3 p-2 hover:bg-white/[0.04] rounded-[6px] text-left disabled:opacity-50"
                >
                  <div className="w-9 h-12 rounded bg-[#1A1A28] overflow-hidden shrink-0 flex items-center justify-center">
                    {m.poster_path ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w92${m.poster_path}`}
                        alt=""
                        width={36}
                        height={48}
                        className="object-cover"
                      />
                    ) : <Film size={14} className="text-[#505060]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{m.title}</div>
                    <div className="text-xs text-[#505060]">{m.release_date?.slice(0, 4) ?? "—"}</div>
                  </div>
                  {adding === m.id ? (
                    <span className="text-xs text-[#505060]">Adding…</span>
                  ) : (
                    <Plus size={16} className="text-[#E50914]" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
