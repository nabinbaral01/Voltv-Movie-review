"use client";

import { useState } from "react";
import { toast } from "@/components/ui/Toast";

interface Report {
  id:       string;
  reason:   string;
  reporter: { username: string | null };
  review:   { id: string; content: string; user: { username: string | null } } | null;
}

export default function AdminReportCard({ report }: { report: Report }) {
  const [dismissed, setDismissed] = useState(false);
  const [loading,   setLoading]   = useState(false);

  if (dismissed) return null;

  async function handleAction(action: "resolve_report" | "hide_review") {
    setLoading(true);
    try {
      const body: Record<string, string> = { action, report_id: report.id };
      if (action === "hide_review" && report.review) {
        body.review_id = report.review.id;
        body.reason    = "Admin moderation";
      }
      const res = await fetch("/api/admin", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(action === "resolve_report" ? "Report dismissed" : "Content removed");
      setDismissed(true);
    } catch {
      toast.error("Action failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-4">
      <div className="min-w-0 mb-3">
        <p className="text-xs text-[#A0A0B0] mb-1">
          Reported by{" "}
          <span className="text-white font-medium">@{report.reporter.username}</span>
          {" "}·{" "}
          <span className="capitalize">{report.reason.replace(/_/g, " ")}</span>
        </p>
        {report.review && (
          <p className="text-sm text-white line-clamp-2">
            <span className="text-[#505060]">Review by @{report.review.user.username}: </span>
            {report.review.content.slice(0, 120)}{report.review.content.length > 120 ? "…" : ""}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => handleAction("resolve_report")}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded bg-[#1A1A28] border border-[#2A2A40] text-[#A0A0B0] hover:text-white transition-colors disabled:opacity-50"
        >
          Dismiss
        </button>
        {report.review && (
          <button
            onClick={() => handleAction("hide_review")}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded bg-[#E50914]/10 border border-[#E50914]/20 text-[#E50914] hover:bg-[#E50914]/20 transition-colors disabled:opacity-50"
          >
            Remove Content
          </button>
        )}
      </div>
    </div>
  );
}
