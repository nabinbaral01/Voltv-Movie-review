import Image from "next/image";
import Link from "next/link";
import { LevelBadge } from "@/components/ui/Badge";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import FollowButton from "@/components/profile/FollowButton";
import { formatCount } from "@/utils/formatters";

export interface FollowListUser {
  id:                string;
  username:          string;
  avatar_url:        string | null;
  bio:               string | null;
  xp_points:         number;
  is_blue_tick:      boolean;
  followersCount:    number;
  amFollowing:       boolean;
}

interface Props {
  users:           FollowListUser[];
  currentUserId:   string | null;
  emptyMessage:    string;
}

export default function FollowsList({ users, currentUserId, emptyMessage }: Props) {
  if (users.length === 0) {
    return (
      <div className="card p-8 text-center text-sm text-[#505060]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {users.map((u) => (
        <div key={u.id} className="card p-4 flex items-center gap-3">
          <Link href={`/profile/${u.username}`} className="shrink-0">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-[#E50914] to-[#8B5CF6] flex items-center justify-center text-white font-bold">
              {u.avatar_url ? (
                <Image src={u.avatar_url} alt={u.username} width={48} height={48} className="object-cover w-full h-full" />
              ) : (
                u.username[0]?.toUpperCase()
              )}
            </div>
          </Link>

          <div className="flex-1 min-w-0">
            <Link href={`/profile/${u.username}`} className="block">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-white truncate">@{u.username}</span>
                {u.is_blue_tick && <VerifiedBadge size={14} />}
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <LevelBadge xp={u.xp_points} />
                <span className="text-xs text-[#505060]">{formatCount(u.followersCount)} followers</span>
              </div>
              {u.bio && (
                <p className="text-xs text-[#A0A0B0] mt-1 line-clamp-1">{u.bio}</p>
              )}
            </Link>
          </div>

          {currentUserId && currentUserId !== u.id && (
            <div className="shrink-0">
              <FollowButton username={u.username} initialFollowing={u.amFollowing} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
