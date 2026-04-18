"use client";

import { Download } from "lucide-react";
import { toast } from "@/components/ui/Toast";
import { useState } from "react";

export default function PosterDownloadButton({
  url,
  name,
  variant = "floating",
}: {
  url:      string;
  name:     string;
  variant?: "floating" | "icon" | "pill";
}) {
  const [busy, setBusy] = useState(false);

  async function download(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      const href = `/api/poster?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}`;
      const a = document.createElement("a");
      a.href     = href;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("Downloading…");
    } catch {
      toast.error("Download failed");
    } finally {
      setTimeout(() => setBusy(false), 800);
    }
  }

  if (variant === "icon") {
    return (
      <button
        onClick={download}
        disabled={busy}
        title="Download poster"
        className="h-7 w-7 rounded-[6px] inline-flex items-center justify-center border border-[#1E1E2E] bg-white/[0.04] text-[#A0A0B0] hover:text-white hover:border-[#8B5CF6]/40 disabled:opacity-50 transition-colors"
      >
        <Download size={12} />
      </button>
    );
  }

  if (variant === "pill") {
    return (
      <button
        onClick={download}
        disabled={busy}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[8px] border border-[#1E1E2E] bg-white/[0.04] text-xs text-white hover:bg-white/[0.08] disabled:opacity-50 transition-colors"
      >
        <Download size={13} />
        {busy ? "Saving…" : "Poster"}
      </button>
    );
  }

  return (
    <button
      onClick={download}
      disabled={busy}
      title="Download poster"
      className="absolute top-2 right-2 h-8 w-8 rounded-full inline-flex items-center justify-center bg-black/60 backdrop-blur-sm text-white hover:bg-[#8B5CF6] disabled:opacity-50 transition-colors shadow-lg"
    >
      <Download size={14} />
    </button>
  );
}
