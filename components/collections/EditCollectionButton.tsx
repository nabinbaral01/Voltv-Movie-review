"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/Toast";

interface Props {
  collection: {
    id:          string;
    title:       string;
    description: string | null;
    is_public:   boolean;
  };
}

export default function EditCollectionButton({ collection }: Props) {
  const router = useRouter();
  const [open,        setOpen]        = useState(false);
  const [title,       setTitle]       = useState(collection.title);
  const [description, setDescription] = useState(collection.description ?? "");
  const [isPublic,    setIsPublic]    = useState(collection.is_public);
  const [saving,      setSaving]      = useState(false);
  const [deleting,    setDeleting]    = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function save() {
    if (!title.trim()) { toast.error("Title required"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/collections/${collection.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          title:       title.trim(),
          description: description.trim() || null,
          is_public:   isPublic,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      toast.success("Collection updated");
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this collection? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/collections/${collection.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Collection deleted");
      router.push("/collections");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
      setDeleting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm h-9 px-3 rounded-full border border-white/15 text-white hover:border-white/30 hover:bg-white/[0.04] transition-colors inline-flex items-center gap-1.5"
      >
        <Pencil size={13} /> Edit
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center pt-20 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[#12121A] border border-[#1E1E2E] rounded-2xl p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white tracking-tight">Edit collection</h2>
              <button onClick={() => setOpen(false)} className="p-1 text-[#A0A0B0] hover:text-white" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#A0A0B0]">Name</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#E50914]/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#A0A0B0]">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={500}
                className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#E50914]/50 resize-none"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-[#0A0A0F] rounded-lg border border-[#1E1E2E]">
              <div>
                <p className="text-sm font-medium text-white">{isPublic ? "Public" : "Private"}</p>
                <p className="text-xs text-[#505060] mt-0.5">
                  {isPublic ? "Visible to everyone on VOLTV" : "Only you can see this"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPublic((v) => !v)}
                className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
                  isPublic ? "bg-[#22C55E]" : "bg-[#2A2A40]"
                }`}
                aria-label="Toggle public/private"
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    isPublic ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={remove}
                disabled={deleting || saving}
                className="text-sm h-9 px-3 rounded-lg text-[#E50914] hover:bg-[#E50914]/10 transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 size={14} /> {deleting ? "Deleting…" : "Delete"}
              </button>
              <div className="flex-1" />
              <button
                onClick={() => setOpen(false)}
                disabled={saving}
                className="text-sm h-9 px-4 rounded-lg border border-[#1E1E2E] text-[#A0A0B0] hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving || !title.trim()}
                className="btn-primary text-sm h-9 px-4 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
