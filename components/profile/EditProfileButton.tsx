"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import EditProfileModal from "./EditProfileModal";

interface Props {
  initial: {
    username: string;
    bio: string | null;
    avatar_url: string | null;
    banner_url: string | null;
    trailer_url: string | null;
    personality_type: string | null;
  };
}

export default function EditProfileButton({ initial }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="h-9 px-4 rounded-[8px] border border-[#1E1E2E] bg-white/[0.02] hover:bg-white/[0.06] text-sm text-white flex items-center gap-1.5 transition-colors"
      >
        <Pencil size={14} />
        Edit Profile
      </button>
      {open && (
        <EditProfileModal initial={initial} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
