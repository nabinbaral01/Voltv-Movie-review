"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";
import { X, Camera, User as UserIcon } from "lucide-react";

interface Props {
  initial: {
    username: string;
    bio: string | null;
    avatar_url: string | null;
    banner_url: string | null;
    trailer_url: string | null;
    personality_type: string | null;
  };
  onClose: () => void;
}

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export default function EditProfileModal({ initial, onClose }: Props) {
  const router = useRouter();
  const [username, setUsername] = useState(initial.username);
  const [bio,      setBio]      = useState(initial.bio ?? "");
  const [avatar,   setAvatar]   = useState(initial.avatar_url ?? "");
  const [banner,   setBanner]   = useState(initial.banner_url ?? "");
  const [pType,    setPType]    = useState(initial.personality_type ?? "");
  const [saving,   setSaving]   = useState(false);
  const [uploading, setUploading] = useState<"avatar" | "banner" | null>(null);

  const trimmedUsername = username.trim();
  const usernameChanged = trimmedUsername !== initial.username;
  const usernameValid   = USERNAME_RE.test(trimmedUsername);
  const usernameError   = usernameChanged && !usernameValid
    ? "3–20 chars • letters, numbers, underscore"
    : "";

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(kind: "avatar" | "banner", file: File) {
    setUploading(kind);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
      const res  = await fetch("/api/user/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      const url = json.data.url as string;
      if (kind === "avatar") setAvatar(url);
      else                   setBanner(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  async function save() {
    if (usernameChanged && !usernameValid) {
      toast.error(usernameError || "Invalid username");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          ...(usernameChanged ? { username: trimmedUsername } : {}),
          bio,
          avatar_url:       avatar,
          banner_url:       banner,
          personality_type: pType,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update");
      }
      toast.success("Profile updated");
      onClose();
      if (usernameChanged) router.push(`/profile/${trimmedUsername}`);
      else                 router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[900] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-[#0A0A0F] sm:rounded-2xl rounded-t-2xl border border-[#1E1E2E] shadow-2xl max-h-[95vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E1E2E] shrink-0">
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full text-[#A0A0B0] hover:bg-white/[0.06] transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
          <h2 className="text-base font-semibold text-white">Edit profile</h2>
          <button
            onClick={save}
            disabled={saving || !!usernameError}
            className="h-8 px-4 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* Banner + overlapping avatar */}
          <div className="relative">
            <div className="relative w-full h-32 sm:h-40 bg-gradient-to-br from-[#E50914]/40 via-[#1A1A28] to-[#8B5CF6]/40 overflow-hidden">
              {banner && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={banner} alt="" className="w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 bg-black/30" />
              <button
                type="button"
                onClick={() => bannerInputRef.current?.click()}
                disabled={uploading === "banner"}
                className="absolute inset-0 flex items-center justify-center gap-2 text-white text-sm font-medium disabled:opacity-60"
              >
                <span className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                  <Camera size={18} />
                </span>
                {uploading === "banner" && <span className="ml-1">Uploading…</span>}
              </button>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadFile("banner", f);
                  e.target.value = "";
                }}
              />
            </div>

            {/* Avatar */}
            <div className="px-4 sm:px-6">
              <div className="relative -mt-12 sm:-mt-14 w-24 h-24 sm:w-28 sm:h-28">
                <div className="w-full h-full rounded-full border-4 border-[#0A0A0F] overflow-hidden bg-gradient-to-br from-[#E50914] to-[#8B5CF6] flex items-center justify-center text-3xl font-bold text-white">
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon size={36} />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploading === "avatar"}
                  className="absolute inset-0 rounded-full bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white disabled:opacity-100"
                  aria-label="Change avatar"
                >
                  <Camera size={22} />
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadFile("avatar", f);
                    e.target.value = "";
                  }}
                />
                {uploading === "avatar" && (
                  <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center text-white text-[10px] font-medium">
                    Uploading…
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Fields */}
          <div className="px-4 sm:px-6 pt-4 pb-6 space-y-5">
            <Field label="Username" error={usernameError}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#505060] text-base">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.slice(0, 20))}
                  maxLength={20}
                  className={`w-full pl-8 pr-3 h-11 bg-transparent border rounded-[10px] text-base text-white focus:outline-none transition-colors ${
                    usernameError
                      ? "border-red-500/60 focus:border-red-500"
                      : "border-[#1E1E2E] focus:border-[#E50914]/60"
                  }`}
                />
              </div>
            </Field>

            <Field label="Bio" counter={`${bio.length}/500`}>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 500))}
                rows={3}
                placeholder="Tell the world about your taste…"
                className="w-full bg-transparent border border-[#1E1E2E] rounded-[10px] px-3 py-2.5 text-base text-white placeholder:text-[#505060] focus:outline-none focus:border-[#E50914]/60 transition-colors resize-none"
              />
            </Field>

            <Field label="Personality" counter="optional">
              <input
                type="text"
                value={pType}
                onChange={(e) => setPType(e.target.value)}
                maxLength={50}
                placeholder="The Auteur, The Popcorn Critic…"
                className="w-full bg-transparent border border-[#1E1E2E] rounded-[10px] px-3 h-11 text-base text-white placeholder:text-[#505060] focus:outline-none focus:border-[#E50914]/60 transition-colors"
              />
            </Field>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, counter, error, children,
}: {
  label:    string;
  counter?: string;
  error?:   string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-[#A0A0B0] uppercase tracking-wider">{label}</span>
        {counter && !error && (
          <span className="text-xs text-[#505060]">{counter}</span>
        )}
        {error && (
          <span className="text-xs text-red-400">{error}</span>
        )}
      </div>
      {children}
    </label>
  );
}
