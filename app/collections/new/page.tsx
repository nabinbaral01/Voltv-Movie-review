"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Topbar from "@/components/layout/Topbar";
import Sidebar, { BottomNav } from "@/components/layout/Sidebar";
import { toast } from "@/components/ui/Toast";
import { Search, X, Film } from "lucide-react";

interface TmdbMovie {
  id:            number;
  title:         string;
  release_date?: string;
  poster_path:   string | null;
}

export default function NewCollectionPage() {
  const router = useRouter();
  const [name,        setName]        = useState("");
  const [description, setDescription] = useState("");
  const [isPublic,    setIsPublic]    = useState(false);
  const [loading,     setLoading]     = useState(false);

  // Movie picker
  const [query,     setQuery]     = useState("");
  const [results,   setResults]   = useState<TmdbMovie[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked,    setPicked]    = useState<TmdbMovie[]>([]);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res  = await fetch(`/api/movies/search?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        const list = (json.data?.results ?? json.data ?? []) as TmdbMovie[];
        setResults(list.slice(0, 8));
      } catch { setResults([]); } finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  function addPick(m: TmdbMovie) {
    if (picked.some((p) => p.id === m.id)) return;
    setPicked((prev) => [...prev, m]);
    setQuery("");
    setResults([]);
  }

  function removePick(id: number) {
    setPicked((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: name.trim(), description: description.trim(), is_public: isPublic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");

      const collectionId = data.data.id as string;

      // Add picked movies (best-effort, sequential to keep position order)
      for (const m of picked) {
        try {
          await fetch(`/api/movies/${m.id}`);
          await fetch(`/api/collections/${collectionId}/movies`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ tmdb_id: m.id }),
          });
        } catch { /* continue */ }
      }

      toast.success(`Collection created${picked.length ? ` with ${picked.length} film${picked.length === 1 ? "" : "s"}` : ""}!`);
      router.push(`/collections/${collectionId}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create collection");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Topbar />
      <div className="flex pt-14">
        <div className="hidden lg:block w-[240px] shrink-0"><Sidebar /></div>
        <main className="flex-1 max-w-xl mx-auto px-4 py-12 pb-24 lg:pb-8">
          <h1 className="font-display text-3xl text-white mb-8">NEW COLLECTION</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#A0A0B0] mb-2">
                Collection Name <span className="text-[#E50914]">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Nolan Masterclass"
                maxLength={100}
                className="w-full bg-[#1A1A28] border border-[#2A2A40] rounded-lg px-4 py-3 text-white placeholder-[#505060] focus:outline-none focus:border-[#E50914]/50"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#A0A0B0] mb-2">
                Description <span className="text-[#505060] font-normal">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this collection about?"
                maxLength={500}
                rows={3}
                className="w-full bg-[#1A1A28] border border-[#2A2A40] rounded-lg px-4 py-3 text-white placeholder-[#505060] focus:outline-none focus:border-[#E50914]/50 resize-none"
              />
            </div>

            {/* Movie picker */}
            <div>
              <label className="block text-sm font-medium text-[#A0A0B0] mb-2">
                Add movies <span className="text-[#505060] font-normal">(optional — you can add more later)</span>
              </label>

              {/* Picked chips */}
              {picked.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {picked.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-2 pl-1 pr-2 py-1 bg-[#1A1A28] border border-[#2A2A40] rounded-full text-sm text-white"
                    >
                      <div className="w-6 h-9 rounded overflow-hidden bg-[#0A0A0F] shrink-0">
                        {m.poster_path && (
                          <Image
                            src={`https://image.tmdb.org/t/p/w92${m.poster_path}`}
                            alt=""
                            width={24}
                            height={36}
                            className="object-cover"
                          />
                        )}
                      </div>
                      <span className="max-w-[160px] truncate">{m.title}</span>
                      <button
                        type="button"
                        onClick={() => removePick(m.id)}
                        className="text-[#A0A0B0] hover:text-white"
                        aria-label="Remove"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#505060]" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search TMDB..."
                  className="w-full pl-9 pr-3 py-2.5 bg-[#1A1A28] border border-[#2A2A40] rounded-lg text-sm text-white placeholder:text-[#505060] focus:outline-none focus:border-[#E50914]/50"
                />
                {(searching || results.length > 0) && (
                  <div className="absolute z-10 left-0 right-0 mt-1 bg-[#12121A] border border-[#2A2A40] rounded-lg p-1 max-h-72 overflow-y-auto shadow-xl">
                    {searching && <p className="text-xs text-[#505060] p-2">Searching...</p>}
                    {results.map((m) => {
                      const alreadyPicked = picked.some((p) => p.id === m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => addPick(m)}
                          disabled={alreadyPicked}
                          className="w-full flex items-center gap-3 p-2 hover:bg-white/[0.04] rounded text-left disabled:opacity-40"
                        >
                          <div className="w-8 h-12 rounded bg-[#1A1A28] overflow-hidden shrink-0 flex items-center justify-center">
                            {m.poster_path ? (
                              <Image
                                src={`https://image.tmdb.org/t/p/w92${m.poster_path}`}
                                alt=""
                                width={32}
                                height={48}
                                className="object-cover"
                              />
                            ) : <Film size={12} className="text-[#505060]" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-white truncate">{m.title}</div>
                            <div className="text-xs text-[#505060]">{m.release_date?.slice(0, 4) ?? "—"}</div>
                          </div>
                          {alreadyPicked && <span className="text-xs text-[#22C55E]">Added</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-[#1A1A28] rounded-lg border border-[#2A2A40]">
              <div>
                <p className="text-sm font-medium text-white">Make public</p>
                <p className="text-xs text-[#505060] mt-0.5">Visible to all VOLTV users</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPublic((v) => !v)}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  isPublic ? "bg-[#E50914]" : "bg-[#2A2A40]"
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    isPublic ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="btn-secondary flex-1 py-3 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="btn-primary flex-1 py-3 rounded-lg text-sm disabled:opacity-50"
              >
                {loading ? "Creating…" : `Create Collection${picked.length ? ` (${picked.length})` : ""}`}
              </button>
            </div>
          </form>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
