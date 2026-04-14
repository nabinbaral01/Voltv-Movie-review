"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { cn } from "@/utils/formatters";
import type { RatingInput } from "@/types";

interface RatingModalProps {
  open: boolean;
  onClose: () => void;
  movieTitle: string;
  moviePoster?: string | null;
  existingRating?: RatingInput | null;
  onSubmit: (rating: RatingInput) => Promise<void>;
}

const DIMENSIONS = [
  { key: "story"     as const, label: "Story",     emoji: "📖", desc: "Plot, screenplay, narrative" },
  { key: "direction" as const, label: "Direction",  emoji: "🎬", desc: "Pacing, visuals, craft" },
  { key: "acting"    as const, label: "Acting",     emoji: "🎭", desc: "Performances, chemistry" },
  { key: "visuals"   as const, label: "Visuals",    emoji: "🎨", desc: "Cinematography, VFX, art" },
  { key: "rewatch"   as const, label: "Rewatch",    emoji: "🔄", desc: "Would you watch again?" },
] as const;

const VERDICTS = [
  { key: "skip"        as const, label: "💀 Skip It",     desc: "Not worth the time", color: "border-gray-600 hover:border-gray-400 hover:bg-gray-900/40 data-[selected]:border-gray-400 data-[selected]:bg-gray-900/60" },
  { key: "timepass"    as const, label: "😐 Timepass",    desc: "Fine, nothing special", color: "border-amber-800 hover:border-amber-500 hover:bg-amber-950/40 data-[selected]:border-amber-500 data-[selected]:bg-amber-950/60" },
  { key: "watchit"     as const, label: "✅ Watch It",     desc: "Solid, worth your time", color: "border-blue-800 hover:border-blue-500 hover:bg-blue-950/40 data-[selected]:border-blue-500 data-[selected]:bg-blue-950/60" },
  { key: "masterpiece" as const, label: "🔥 Masterpiece", desc: "One of the best", color: "border-red-800 hover:border-[#E50914] hover:bg-red-950/40 data-[selected]:border-[#E50914] data-[selected]:bg-red-950/60" },
] as const;

type VerdictKey = "skip" | "timepass" | "watchit" | "masterpiece";

export default function RatingModal({
  open,
  onClose,
  movieTitle,
  existingRating,
  onSubmit,
}: RatingModalProps) {
  const [scores, setScores] = useState({
    story:     existingRating?.story     ?? 7,
    direction: existingRating?.direction ?? 7,
    acting:    existingRating?.acting    ?? 7,
    visuals:   existingRating?.visuals   ?? 7,
    rewatch:   existingRating?.rewatch   ?? 7,
  });
  const [verdict, setVerdict] = useState<VerdictKey | null>(
    existingRating?.voltv_verdict ?? null
  );
  const [submitting, setSubmitting] = useState(false);

  const avgScore = Object.values(scores).reduce((a, b) => a + b, 0) / 5;

  async function handleSubmit() {
    if (!verdict) return;
    setSubmitting(true);
    try {
      await onSubmit({ ...scores, voltv_verdict: verdict });
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Rate "${movieTitle}"`}
      size="md"
    >
      <div className="p-5 space-y-6">
        {/* Average display */}
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl font-bold font-mono text-[#F5A623]">
              {avgScore.toFixed(1)}
            </div>
            <div className="text-xs text-[#505060] mt-1">Average VOLTV Score</div>
          </div>
        </div>

        {/* 5-dimension sliders */}
        <div className="space-y-4">
          {DIMENSIONS.map((dim) => (
            <div key={dim.key}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span>{dim.emoji}</span>
                  <span className="text-sm font-medium text-white">{dim.label}</span>
                  <span className="text-xs text-[#505060]">— {dim.desc}</span>
                </div>
                <span className="font-mono font-bold text-[#F5A623] text-sm w-6 text-right">
                  {scores[dim.key]}
                </span>
              </div>
              <div className="relative h-2 bg-[#1A1A28] rounded-full">
                <div
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#E50914] to-[#F5A623] rounded-full transition-all"
                  style={{ width: `${scores[dim.key] * 10}%` }}
                />
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={scores[dim.key]}
                  onChange={(e) => setScores((s) => ({ ...s, [dim.key]: Number(e.target.value) }))}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
                  aria-label={dim.label}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-[#505060]">1</span>
                <span className="text-[10px] text-[#505060]">10</span>
              </div>
            </div>
          ))}
        </div>

        {/* Verdict selection */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-[#A0A0B0] uppercase tracking-wide">
            Your Verdict *
          </label>
          <div className="grid grid-cols-2 gap-2">
            {VERDICTS.map((v) => (
              <button
                key={v.key}
                data-selected={verdict === v.key ? true : undefined}
                onClick={() => setVerdict(v.key)}
                className={cn(
                  "p-3 rounded-[10px] border text-left transition-all duration-150",
                  v.color
                )}
              >
                <div className="font-semibold text-sm text-white">{v.label}</div>
                <div className="text-xs text-[#505060] mt-0.5">{v.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={!verdict}
          loading={submitting}
          fullWidth
          size="lg"
        >
          {existingRating ? "Update Rating" : "Submit Rating"} (+5 XP)
        </Button>
      </div>
    </Modal>
  );
}
