"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Check, X } from "lucide-react";

export interface CountryOption {
  code:  string;
  label: string;
  flag:  string;
  href:  string;
}

interface Props {
  countries: CountryOption[];
  active:    string | undefined;
  clearHref: string;
}

export default function CountryDropdown({ countries, active, clearHref }: Props) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected = active ? countries.find((c) => c.code === active) : null;
  const filtered = query
    ? countries.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()))
    : countries;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    if (open) {
      document.addEventListener("mousedown", onClick);
      document.addEventListener("keydown", onKey);
    }
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all min-w-[200px]
          ${selected
            ? "bg-gradient-to-r from-[#3B82F6]/20 to-[#8B5CF6]/20 border-[#3B82F6]/40 text-white"
            : "bg-[#12121A] border-[#1E1E2E] text-[#A0A0B0] hover:border-white/20 hover:text-white"
          }`}
      >
        {selected ? (
          <>
            <span className="text-base leading-none">{selected.flag}</span>
            <span className="flex-1 text-left">{selected.label}</span>
          </>
        ) : (
          <span className="flex-1 text-left">Select a country</span>
        )}
        <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {selected && (
        <Link
          href={clearHref}
          onClick={() => setOpen(false)}
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#E50914] text-white flex items-center justify-center hover:scale-110 transition-transform"
          aria-label="Clear country filter"
        >
          <X size={12} />
        </Link>
      )}

      {open && (
        <div className="absolute z-40 mt-2 w-[280px] bg-[#12121A] border border-[#1E1E2E] rounded-xl shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-[#1E1E2E]">
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search country…"
              className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3B82F6]/50"
            />
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-xs text-[#6B6B80] text-center">No match</div>
            ) : (
              filtered.map((c) => {
                const isActive = c.code === active;
                return (
                  <Link
                    key={c.code}
                    href={c.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 text-sm transition-colors
                      ${isActive ? "bg-[#3B82F6]/10 text-white" : "text-[#A0A0B0] hover:bg-white/[0.04] hover:text-white"}`}
                  >
                    <span className="text-base leading-none">{c.flag}</span>
                    <span className="flex-1">{c.label}</span>
                    {isActive && <Check size={14} className="text-[#3B82F6]" />}
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
