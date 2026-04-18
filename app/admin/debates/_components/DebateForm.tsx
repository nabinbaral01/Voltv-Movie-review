"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search, Swords, X, Plus, Calendar } from "lucide-react";
import { toast } from "@/components/ui/Toast";
import PosterDownloadButton from "@/components/movie/PosterDownloadButton";

type Movie = {
  id:           string;
  title:        string;
  poster_url:   string | null;
  release_year: number | null;
  genres:       string[];
  voltv_score:  number | null;
};

const CATEGORIES = [
  { value: "today_release", label: "Today's Release", hint: "Movies out this week" },
  { value: "anime",         label: "Anime",           hint: "Animated / anime titles" },
  { value: "classic",       label: "Classic",         hint: "All-time greats" },
  { value: "blockbuster",   label: "Blockbuster",     hint: "Big-budget tentpoles" },
  { value: "indie",         label: "Indie",           hint: "Independent cinema" },
  { value: "general",       label: "General",         hint: "Anything else" },
];

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export default function DebateForm() {
  const router = useRouter();
  const [pending, startT] = useTransition();
  const [submitting, setSubmitting] = useState(false);

  const [category, setCategory] = useState("today_release");
  const [question, setQuestion] = useState("");
  const [optionA,  setOptionA]  = useState("");
  const [optionB,  setOptionB]  = useState("");
  const [date,     setDate]     = useState(todayISO());
  const [movieA,   setMovieA]   = useState<Movie | null>(null);
  const [movieB,   setMovieB]   = useState<Movie | null>(null);

  async function submit() {
    if (!movieA || !movieB) return toast.error("Pick both movies");
    if (!question.trim())   return toast.error("Write a question");
    if (!optionA.trim() || !optionB.trim()) return toast.error("Fill both option labels");

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/debates", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question, option_a: optionA, option_b: optionB,
          movie_a_id: movieA.id, movie_b_id: movieB.id,
          category, debate_date: date,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed");
      toast.success("Debate created");
      setQuestion(""); setOptionA(""); setOptionB("");
      setMovieA(null); setMovieB(null);
      startT(() => router.refresh());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-[14px] border border-[#1E1E2E] bg-[#0E0E15] overflow-hidden">
      <header className="px-4 py-3 border-b border-[#1E1E2E] flex items-center gap-2">
        <div className="w-7 h-7 rounded-[8px] bg-gradient-to-br from-[#E50914] to-[#8B5CF6] flex items-center justify-center">
          <Swords size={14} className="text-white" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">New debate</h2>
          <p className="text-[10px] text-[#505060]">Pick a category, two movies, and a question</p>
        </div>
      </header>

      <div className="p-4 space-y-5">
        {/* Category pills */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[#505060] font-semibold">Category</label>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                title={c.hint}
                className={`text-[11px] font-semibold px-2.5 h-7 rounded-[8px] border transition-colors ${
                  category === c.value
                    ? "border-[#8B5CF6]/40 bg-[#8B5CF6]/15 text-[#8B5CF6]"
                    : "border-[#1E1E2E] bg-white/[0.02] text-[#A0A0B0] hover:text-white"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Question */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[#505060] font-semibold">Question</label>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Which one would you rewatch tonight?"
            className="w-full mt-2 bg-[#0A0A0F] border border-[#1E1E2E] rounded-[8px] px-3 h-10 text-sm text-white placeholder:text-[#505060] focus:outline-none focus:border-[#8B5CF6]/40"
          />
        </div>

        {/* Movie pickers side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MoviePicker
            side="A"
            selected={movieA}
            setSelected={setMovieA}
            optionLabel={optionA}
            setOptionLabel={setOptionA}
          />
          <MoviePicker
            side="B"
            selected={movieB}
            setSelected={setMovieB}
            optionLabel={optionB}
            setOptionLabel={setOptionB}
          />
        </div>

        {/* Date */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[#505060] font-semibold flex items-center gap-1">
            <Calendar size={11} /> Debate date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-2 bg-[#0A0A0F] border border-[#1E1E2E] rounded-[8px] px-3 h-10 text-sm text-white focus:outline-none focus:border-[#8B5CF6]/40"
          />
        </div>

        <div className="flex justify-end pt-2 border-t border-[#1E1E2E]">
          <button
            onClick={submit}
            disabled={pending || submitting}
            className="h-10 px-5 rounded-[10px] bg-gradient-to-r from-[#E50914] to-[#8B5CF6] text-white text-sm font-semibold disabled:opacity-60 inline-flex items-center gap-1.5"
          >
            <Plus size={14} />
            {submitting ? "Creating…" : "Create debate"}
          </button>
        </div>
      </div>
    </section>
  );
}

function MoviePicker({
  side, selected, setSelected, optionLabel, setOptionLabel,
}: {
  side:           "A" | "B";
  selected:       Movie | null;
  setSelected:    (m: Movie | null) => void;
  optionLabel:    string;
  setOptionLabel: (s: string) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Movie[]>([]);
  const [open, setOpen]   = useState(false);
  const [busy, setBusy]   = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const res  = await fetch(`/api/admin/movies/search?q=${encodeURIComponent(q)}`);
        const json = await res.json();
        setResults(json.data ?? []);
      } finally {
        setBusy(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="rounded-[10px] border border-[#1E1E2E] bg-white/[0.015] p-3">
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] font-bold uppercase tracking-wider ${
          side === "A" ? "text-[#E50914]" : "text-[#8B5CF6]"
        }`}>
          Side {side}
        </span>
        {selected && (
          <button
            onClick={() => setSelected(null)}
            className="text-[10px] text-[#A0A0B0] hover:text-red-400 inline-flex items-center gap-0.5"
          >
            <X size={10} /> Change
          </button>
        )}
      </div>

      {selected ? (
        <div className="flex items-center gap-3">
          <div className="w-12 h-16 rounded-[6px] overflow-hidden bg-[#1E1E2E] shrink-0 relative">
            {selected.poster_url ? (
              <Image src={selected.poster_url} alt={selected.title} fill sizes="48px" className="object-cover" />
            ) : (
              <div className="flex items-center justify-center text-[8px] text-[#505060] h-full">No art</div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-white truncate">{selected.title}</div>
            <div className="text-[10px] text-[#505060]">
              {selected.release_year ?? "—"}
              {selected.voltv_score ? ` · ${selected.voltv_score.toFixed(1)} ★` : ""}
            </div>
            {selected.genres.length > 0 && (
              <div className="text-[9px] text-[#8B5CF6] truncate mt-0.5">{selected.genres.slice(0, 3).join(" · ")}</div>
            )}
          </div>
          {selected.poster_url && (
            <PosterDownloadButton url={selected.poster_url} name={`${selected.title}-poster`} variant="icon" />
          )}
        </div>
      ) : (
        <div ref={boxRef} className="relative">
          <div className="flex items-center gap-2 bg-[#0A0A0F] border border-[#1E1E2E] rounded-[8px] px-2.5 h-9 focus-within:border-[#8B5CF6]/40">
            <Search size={13} className="text-[#505060]" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              placeholder="Search movie…"
              className="flex-1 bg-transparent text-sm text-white placeholder:text-[#505060] focus:outline-none"
            />
            {busy && <span className="text-[10px] text-[#505060]">…</span>}
          </div>
          {open && results.length > 0 && (
            <div className="absolute z-20 mt-1 left-0 right-0 rounded-[8px] border border-[#1E1E2E] bg-[#0A0A0F] shadow-xl max-h-72 overflow-y-auto">
              {results.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { setSelected(m); setQ(""); setResults([]); setOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-2 py-2 hover:bg-white/[0.04] text-left"
                >
                  <div className="w-8 h-10 rounded-[4px] overflow-hidden bg-[#1E1E2E] shrink-0 relative">
                    {m.poster_url ? (
                      <Image src={m.poster_url} alt={m.title} fill sizes="32px" className="object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-white truncate">{m.title}</div>
                    <div className="text-[9px] text-[#505060]">
                      {m.release_year ?? "—"}
                      {m.genres.length > 0 ? ` · ${m.genres.slice(0, 2).join(" · ")}` : ""}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <input
        value={optionLabel}
        onChange={(e) => setOptionLabel(e.target.value)}
        placeholder={`Vote label for side ${side} (e.g. "${selected?.title ?? "Pick this one"}")`}
        className="w-full mt-3 bg-[#0A0A0F] border border-[#1E1E2E] rounded-[8px] px-2.5 h-9 text-xs text-white placeholder:text-[#505060] focus:outline-none focus:border-[#8B5CF6]/40"
      />
    </div>
  );
}
