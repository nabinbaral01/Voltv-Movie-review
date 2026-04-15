"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "@/components/ui/Toast";
import { Search, Film, X, Send, ImagePlus, Globe2, Link2, UserRound, EyeOff } from "lucide-react";

interface TmdbMovie {
  id: number;
  title: string;
  release_date?: string;
  poster_path: string | null;
}

interface PickedMovie {
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  year: string;
}

type Visibility = "public" | "unlisted" | "followers";

interface MediaItem { url: string; type: "image" | "video"; }

interface Props {
  currentUser: { username: string; avatar_url: string | null };
  redirectAfter?: string;
}

export default function PostComposer({ currentUser, redirectAfter }: Props) {
  const router = useRouter();
  const [query,      setQuery]      = useState("");
  const [results,    setResults]    = useState<TmdbMovie[]>([]);
  const [searching,  setSearching]  = useState(false);
  const [picked,     setPicked]     = useState<PickedMovie | null>(null);
  const [content,    setContent]    = useState("");
  const [spoiler,    setSpoiler]    = useState(false);
  const [anonymous,  setAnonymous]  = useState(false);
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [media,      setMedia]      = useState<MediaItem[]>([]);
  const [uploading,  setUploading]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (picked) return;
    if (query.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res  = await fetch(`/api/movies/search?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        const list = (json.data?.results ?? json.data ?? []) as TmdbMovie[];
        setResults(list.slice(0, 6));
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query, picked]);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    if (media.length + files.length > 4) { toast.error("Max 4 files"); return; }
    setUploading(true);
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("kind", "post");
        const res  = await fetch("/api/user/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Upload failed");
        setMedia((m) => [...m, { url: json.data.url, type: json.data.media_type }]);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (content.trim().length < 3 && media.length === 0) {
      toast.error("Write something or add media");
      return;
    }

    setSubmitting(true);
    try {
      let movieId: string | undefined;
      if (picked) {
        const mRes  = await fetch(`/api/movies/${picked.tmdb_id}`);
        const mJson = await mRes.json();
        movieId = mJson?.data?.movie?.id as string | undefined;
        if (!movieId) throw new Error("Could not load movie");
      }

      const rRes = await fetch("/api/reviews", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          ...(movieId ? { movie_id: movieId } : {}),
          content:      content.trim(),
          type:         "hot_take",
          is_spoiler:   spoiler,
          is_anonymous: anonymous,
          visibility,
          media_urls:   media.map((m) => m.url),
          media_type:   media[0]?.type,
        }),
      });
      const rJson = await rRes.json();
      if (!rRes.ok) throw new Error(rJson.error || "Failed to post");

      toast.success(`Posted! +${rJson.xp_gained ?? 25} XP`);
      setContent(""); setPicked(null); setQuery(""); setSpoiler(false);
      setAnonymous(false); setVisibility("public"); setMedia([]);
      if (redirectAfter) router.push(redirectAfter);
      else router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to post");
    } finally {
      setSubmitting(false);
    }
  }

  const visIcon   = visibility === "public" ? <Globe2 size={13} /> : visibility === "unlisted" ? <Link2 size={13} /> : <UserRound size={13} />;
  const visLabel  = visibility === "public" ? "Public" : visibility === "unlisted" ? "Unlisted" : "Followers";

  return (
    <div className="card p-4 space-y-3">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E50914] to-[#8B5CF6] shrink-0 flex items-center justify-center font-bold overflow-hidden">
          {anonymous ? (
            <EyeOff size={18} className="text-white" />
          ) : currentUser.avatar_url ? (
            <Image src={currentUser.avatar_url} alt="" width={40} height={40} className="object-cover" />
          ) : currentUser.username[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          {picked ? (
            <div className="flex items-center gap-2 p-2 rounded-[8px] bg-white/[0.03] border border-[#1E1E2E]">
              <div className="w-8 h-12 rounded-[4px] overflow-hidden bg-[#1A1A28] shrink-0">
                {picked.poster_path && (
                  <Image src={`https://image.tmdb.org/t/p/w92${picked.poster_path}`} alt={picked.title} width={32} height={48} className="object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white truncate">{picked.title}</div>
                <div className="text-xs text-[#505060]">{picked.year}</div>
              </div>
              <button onClick={() => setPicked(null)} className="p-1 text-[#A0A0B0] hover:text-white" aria-label="Change movie">
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#505060]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tag a movie (optional) — or just post"
                className="w-full pl-9 pr-3 py-2 bg-[#0A0A0F] border border-[#1E1E2E] rounded-[8px] text-sm text-white placeholder:text-[#505060] focus:outline-none focus:border-[#E50914]/50"
              />
              {(searching || results.length > 0) && (
                <div className="absolute z-10 left-0 right-0 mt-1 card p-1 max-h-64 overflow-y-auto">
                  {searching && <div className="p-2 text-xs text-[#505060]">Searching...</div>}
                  {results.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setPicked({
                        tmdb_id: m.id, title: m.title, poster_path: m.poster_path,
                        year: m.release_date?.slice(0, 4) ?? "—",
                      })}
                      className="w-full flex items-center gap-2 p-2 hover:bg-white/[0.04] rounded-[6px] text-left"
                    >
                      <div className="w-7 h-10 rounded-[3px] overflow-hidden bg-[#1A1A28] shrink-0 flex items-center justify-center">
                        {m.poster_path ? (
                          <Image src={`https://image.tmdb.org/t/p/w92${m.poster_path}`} alt="" width={28} height={40} className="object-cover" />
                        ) : <Film size={14} className="text-[#505060]" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm text-white truncate">{m.title}</div>
                        <div className="text-xs text-[#505060]">{m.release_date?.slice(0, 4) ?? "—"}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 2000))}
            rows={3}
            placeholder="What's on your mind?"
            className="w-full p-2 bg-[#0A0A0F] border border-[#1E1E2E] rounded-[8px] text-sm text-white placeholder:text-[#505060] focus:outline-none focus:border-[#E50914]/50 resize-none"
          />

          {media.length > 0 && (
            <div className={`grid gap-1.5 rounded-[8px] overflow-hidden ${media.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
              {media.map((m, i) => (
                <div key={i} className="relative aspect-video bg-[#0A0A0F] rounded-[8px] overflow-hidden border border-[#1E1E2E]">
                  {m.type === "video" ? (
                    <video src={m.url} className="w-full h-full object-cover" controls />
                  ) : (
                    <Image src={m.url} alt="" fill sizes="400px" className="object-cover" />
                  )}
                  <button
                    onClick={() => setMedia((x) => x.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white hover:bg-black"
                    aria-label="Remove"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading || media.length >= 4}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs text-[#A0A0B0] hover:text-white hover:bg-white/[0.04] disabled:opacity-40"
            >
              <ImagePlus size={14} />
              {uploading ? "Uploading..." : "Media"}
            </button>
            <input ref={fileRef} type="file" accept="image/*,video/mp4,video/webm,video/quicktime" multiple hidden onChange={onPickFile} />

            <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs text-[#A0A0B0] hover:text-white cursor-pointer select-none">
              <input type="checkbox" checked={spoiler} onChange={(e) => setSpoiler(e.target.checked)} className="accent-[#E50914]" />
              Spoiler
            </label>
            <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs text-[#A0A0B0] hover:text-white cursor-pointer select-none">
              <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="accent-[#E50914]" />
              Anonymous
            </label>

            <div className="relative">
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as Visibility)}
                className="appearance-none pl-7 pr-6 py-1.5 rounded-full text-xs bg-white/[0.04] text-white border border-[#1E1E2E] focus:outline-none focus:border-[#E50914]/50 cursor-pointer"
              >
                <option value="public">Public</option>
                <option value="unlisted">Unlisted</option>
                <option value="followers">Followers only</option>
              </select>
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#A0A0B0] pointer-events-none">{visIcon}</span>
            </div>

            <span className="ml-auto text-xs text-[#505060]">{content.length}/2000 · {visLabel}</span>
            <button
              onClick={submit}
              disabled={submitting || uploading || (content.trim().length < 3 && media.length === 0)}
              className="btn-primary text-sm h-9 px-4 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send size={14} />
              {submitting ? "Posting..." : "Post"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
