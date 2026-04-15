"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "@/components/ui/Toast";
import {
  X, Search, Film, ImagePlus, Globe2, Link2, UserRound,
  EyeOff, Send, Smile, MapPin, BarChart2, AlertTriangle,
} from "lucide-react";

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
}

export default function ComposeModal({ currentUser }: Props) {
  const router = useRouter();
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TmdbMovie[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<PickedMovie | null>(null);
  const [content, setContent] = useState("");
  const [spoiler, setSpoiler] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => { textRef.current?.focus(); }, []);

  useEffect(() => {
    if (picked || !showSearch) return;
    if (query.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/movies/search?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        const list = (json.data?.results ?? json.data ?? []) as TmdbMovie[];
        setResults(list.slice(0, 6));
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query, picked, showSearch]);

  function autoResize() {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.max(120, Math.min(el.scrollHeight, 300)) + "px";
  }

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
        const res = await fetch("/api/user/upload", { method: "POST", body: fd });
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
        const mRes = await fetch(`/api/movies/${picked.tmdb_id}`);
        const mJson = await mRes.json();
        movieId = mJson?.data?.movie?.id as string | undefined;
        if (!movieId) throw new Error("Could not load movie");
      }
      const rRes = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(movieId ? { movie_id: movieId } : {}),
          content: content.trim(),
          type: "hot_take",
          is_spoiler: spoiler,
          is_anonymous: anonymous,
          visibility,
          media_urls: media.map((m) => m.url),
          media_type: media[0]?.type,
        }),
      });
      const rJson = await rRes.json();
      if (!rRes.ok) throw new Error(rJson.error || "Failed to post");
      toast.success(`Posted! +${rJson.xp_gained ?? 25} XP`);
      router.push(`/profile/${currentUser.username}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to post");
    } finally {
      setSubmitting(false);
    }
  }

  const visIcon = visibility === "public" ? <Globe2 size={13} /> : visibility === "unlisted" ? <Link2 size={13} /> : <UserRound size={13} />;
  const visLabel = visibility === "public" ? "Everyone can see" : visibility === "unlisted" ? "Unlisted" : "Followers only";
  const canPost = !submitting && !uploading && (content.trim().length >= 3 || media.length > 0);
  const charPct = Math.min((content.length / 2000) * 100, 100);

  return (
    <div className="fixed inset-0 z-[900] flex items-start justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#0A0A0F]/80 backdrop-blur-sm" onClick={() => router.back()} />

      {/* Modal */}
      <div className="relative w-full max-w-[600px] mt-[5vh] sm:mt-[10vh] mx-4 bg-[#0F0F18] border border-[#1E1E2E] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-[53px] border-b border-[#1E1E2E]">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/[0.08] transition-colors"
          >
            <X size={20} />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#505060]">Drafts</span>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 pt-4 pb-3 max-h-[60vh] overflow-y-auto">
          <div className="flex gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E50914] to-[#8B5CF6] shrink-0 flex items-center justify-center font-bold text-sm overflow-hidden">
              {anonymous ? (
                <EyeOff size={18} className="text-white" />
              ) : currentUser.avatar_url ? (
                <Image src={currentUser.avatar_url} alt="" width={40} height={40} className="object-cover w-full h-full" />
              ) : (
                currentUser.username[0]?.toUpperCase()
              )}
            </div>

            {/* Content area */}
            <div className="flex-1 min-w-0">
              {/* Visibility pill */}
              <div className="mb-2">
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as Visibility)}
                  className="appearance-none pl-6 pr-6 py-1 rounded-full text-xs font-semibold bg-transparent text-[#E50914] border border-[#E50914]/30 hover:bg-[#E50914]/10 focus:outline-none cursor-pointer transition-colors"
                  style={{ backgroundImage: "none" }}
                >
                  <option value="public">Everyone</option>
                  <option value="unlisted">Unlisted</option>
                  <option value="followers">Followers only</option>
                </select>
                <span className="absolute pointer-events-none" style={{ marginLeft: "-100%", opacity: 0 }}>{visIcon}</span>
              </div>

              {/* Textarea */}
              <textarea
                ref={textRef}
                value={content}
                onChange={(e) => { setContent(e.target.value.slice(0, 2000)); autoResize(); }}
                placeholder="What's happening?"
                className="w-full bg-transparent text-lg text-white placeholder:text-[#505060] focus:outline-none resize-none leading-relaxed"
                style={{ minHeight: "120px" }}
              />

              {/* Tagged movie */}
              {picked && (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.03] border border-[#1E1E2E] mb-3">
                  <div className="w-8 h-12 rounded overflow-hidden bg-[#1A1A28] shrink-0">
                    {picked.poster_path && (
                      <Image src={`https://image.tmdb.org/t/p/w92${picked.poster_path}`} alt={picked.title} width={32} height={48} className="object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{picked.title}</div>
                    <div className="text-xs text-[#505060]">{picked.year}</div>
                  </div>
                  <button onClick={() => setPicked(null)} className="p-1 text-[#A0A0B0] hover:text-white">
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Movie search dropdown */}
              {showSearch && !picked && (
                <div className="mb-3">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#505060]" />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search for a movie..."
                      className="w-full pl-9 pr-3 py-2 bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl text-sm text-white placeholder:text-[#505060] focus:outline-none focus:border-[#E50914]/50"
                      autoFocus
                    />
                  </div>
                  {(searching || results.length > 0) && (
                    <div className="mt-1 bg-[#0F0F18] border border-[#1E1E2E] rounded-xl p-1 max-h-52 overflow-y-auto">
                      {searching && <div className="p-2 text-xs text-[#505060]">Searching...</div>}
                      {results.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            setPicked({ tmdb_id: m.id, title: m.title, poster_path: m.poster_path, year: m.release_date?.slice(0, 4) ?? "—" });
                            setShowSearch(false);
                            setQuery("");
                            setResults([]);
                          }}
                          className="w-full flex items-center gap-2 p-2 hover:bg-white/[0.04] rounded-lg text-left"
                        >
                          <div className="w-7 h-10 rounded overflow-hidden bg-[#1A1A28] shrink-0 flex items-center justify-center">
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

              {/* Media preview */}
              {media.length > 0 && (
                <div className={`grid gap-1.5 rounded-xl overflow-hidden mb-3 ${media.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                  {media.map((m, i) => (
                    <div key={i} className="relative aspect-video bg-[#0A0A0F] rounded-xl overflow-hidden border border-[#1E1E2E]">
                      {m.type === "video" ? (
                        <video src={m.url} className="w-full h-full object-cover" controls />
                      ) : (
                        <Image src={m.url} alt="" fill sizes="500px" className="object-cover" />
                      )}
                      <button
                        onClick={() => setMedia((x) => x.filter((_, j) => j !== i))}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/80 flex items-center justify-center text-white hover:bg-black"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Audience line */}
              <div className="flex items-center gap-1.5 text-xs text-[#E50914] pb-3 border-b border-[#1E1E2E]">
                {visIcon}
                <span>{visLabel}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer toolbar */}
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <ToolBtn icon={<ImagePlus size={18} />} label="Media" disabled={uploading || media.length >= 4} onClick={() => fileRef.current?.click()} />
            <input ref={fileRef} type="file" accept="image/*,video/mp4,video/webm,video/quicktime" multiple hidden onChange={onPickFile} />
            <ToolBtn icon={<Film size={18} />} label="Tag movie" onClick={() => setShowSearch(!showSearch)} active={showSearch || !!picked} />
            <ToolBtn
              icon={<AlertTriangle size={18} />}
              label="Spoiler"
              onClick={() => setSpoiler(!spoiler)}
              active={spoiler}
            />
            <ToolBtn
              icon={<EyeOff size={18} />}
              label="Anonymous"
              onClick={() => setAnonymous(!anonymous)}
              active={anonymous}
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Character counter */}
            {content.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="relative w-5 h-5">
                  <svg className="w-5 h-5 -rotate-90" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="8" fill="none" stroke="#1E1E2E" strokeWidth="2" />
                    <circle
                      cx="10" cy="10" r="8" fill="none"
                      stroke={charPct > 90 ? "#E50914" : charPct > 75 ? "#F59E0B" : "#E50914"}
                      strokeWidth="2"
                      strokeDasharray={`${charPct * 0.5} 50`}
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                {content.length > 1800 && (
                  <span className={`text-xs font-mono ${content.length > 1950 ? "text-[#E50914]" : "text-[#505060]"}`}>
                    {2000 - content.length}
                  </span>
                )}
                <div className="w-px h-6 bg-[#1E1E2E]" />
              </div>
            )}

            <button
              onClick={submit}
              disabled={!canPost}
              className="h-9 px-5 rounded-full text-sm font-bold text-white bg-[#E50914] hover:bg-[#C50812] disabled:opacity-40 disabled:hover:bg-[#E50914] transition-colors flex items-center gap-1.5"
            >
              {uploading ? "Uploading..." : submitting ? "Posting..." : "Post"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolBtn({
  icon, label, onClick, disabled, active,
}: {
  icon: React.ReactNode; label: string;
  onClick?: () => void; disabled?: boolean; active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors disabled:opacity-30 ${
        active ? "text-[#E50914] bg-[#E50914]/10" : "text-[#E50914] hover:bg-[#E50914]/10"
      }`}
    >
      {icon}
    </button>
  );
}
