"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X, Send } from "lucide-react";
import { toast } from "@/components/ui/Toast";

interface ParentRef {
  id:         string;
  content:    string;
  username:   string;
  avatar_url: string | null;
}

interface Props {
  parent:    ParentRef;
  onClose:   () => void;
  onReplied: () => void;
}

export default function ReplyModal({ parent, onClose, onReplied }: Props) {
  const [content,    setContent]    = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  async function submit() {
    if (content.trim().length < 1) { toast.error("Write something"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          content:   content.trim(),
          parent_id: parent.id,
          type:      "hot_take",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      toast.success("Reply posted");
      onReplied();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center pt-20 px-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-lg p-4 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Reply</h2>
          <button onClick={onClose} className="text-[#A0A0B0] hover:text-white p-1" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Parent preview */}
        <div className="flex gap-3 pb-3 border-b border-[#1E1E2E]">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-[#E50914] to-[#8B5CF6] flex items-center justify-center font-bold text-sm shrink-0">
            {parent.avatar_url ? (
              <Image src={parent.avatar_url} alt="" width={40} height={40} className="object-cover w-full h-full" />
            ) : parent.username[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white">@{parent.username}</div>
            <p className="text-sm text-[#A0A0B0] line-clamp-3 whitespace-pre-wrap">{parent.content}</p>
            <p className="mt-2 text-xs text-[#505060]">Replying to @{parent.username}</p>
          </div>
        </div>

        <textarea
          autoFocus
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, 2000))}
          rows={4}
          placeholder="Post your reply"
          className="w-full p-2 bg-[#0A0A0F] border border-[#1E1E2E] rounded-[8px] text-sm text-white placeholder:text-[#505060] focus:outline-none focus:border-[#E50914]/50 resize-none"
        />

        <div className="flex items-center justify-between">
          <span className="text-xs text-[#505060]">{content.length}/2000</span>
          <button
            onClick={submit}
            disabled={submitting || content.trim().length < 1}
            className="btn-primary text-sm h-9 px-4 flex items-center gap-1.5 disabled:opacity-50"
          >
            <Send size={14} />
            {submitting ? "Posting..." : "Reply"}
          </button>
        </div>
      </div>
    </div>
  );
}
