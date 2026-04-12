"use client";

import DebateCard from "@/components/feed/DebateCard";
import type { DailyDebate } from "@/types";

export default function DebateClientWrapper({ debate }: { debate: DailyDebate }) {
  async function handleVote(choice: "a" | "b") {
    await fetch("/api/debates/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ debate_id: debate.id, choice }),
    });
  }

  return <DebateCard debate={debate} onVote={handleVote} />;
}
