"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "@/components/ui/Toast";

export default function DeleteDebateButton({ id, question }: { id: string; question: string }) {
  const router = useRouter();
  const [pending, startT] = useTransition();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm(`Delete debate: "${question}"?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/debates/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed");
      }
      toast.success("Debate deleted");
      startT(() => router.refresh());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={remove}
      disabled={pending || busy}
      title="Delete debate"
      className="h-7 w-7 rounded-[6px] inline-flex items-center justify-center border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50"
    >
      <Trash2 size={12} />
    </button>
  );
}
