import { cn } from "@/utils/formatters";

type BadgeVariant = "default" | "red" | "gold" | "green" | "blue" | "purple" | "common" | "rare" | "epic" | "legendary";

interface BadgeProps {
  variant?: BadgeVariant;
  size?: "sm" | "md";
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default:   "bg-white/10 text-[#A0A0B0] border border-white/10",
  red:       "bg-[#E50914]/20 text-[#E50914] border border-[#E50914]/30",
  gold:      "bg-[#F5A623]/20 text-[#F5A623] border border-[#F5A623]/30",
  green:     "bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30",
  blue:      "bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/30",
  purple:    "bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/30",
  common:    "bg-white/10 text-[#A0A0B0] border border-white/10",
  rare:      "bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/30",
  epic:      "bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/30",
  legendary: "bg-gradient-to-r from-[#F5A623]/20 to-[#E50914]/20 text-[#F5A623] border border-[#F5A623]/30",
};

export default function Badge({ variant = "default", size = "sm", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium rounded-[6px]",
        size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-2.5 py-1",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

// Tier badge
export function TierBadge({ tier }: { tier: "free" | "pro" | "legend" }) {
  if (tier === "free") return null;
  const config = {
    pro:    { label: "PRO",    variant: "blue"   as const, icon: "💎" },
    legend: { label: "LEGEND", variant: "gold"   as const, icon: "👑" },
  };
  const c = config[tier];
  return (
    <Badge variant={c.variant} size="sm">
      {c.icon} {c.label}
    </Badge>
  );
}

// Level badge
export function LevelBadge({ xp }: { xp: number }) {
  let label: string;
  let variant: BadgeVariant;

  if (xp >= 5000) { label = "👑 Legend";   variant = "gold";   }
  else if (xp >= 2000) { label = "🎥 Auteur";    variant = "purple"; }
  else if (xp >= 500)  { label = "🎭 Critic";    variant = "blue";   }
  else                 { label = "🎬 Cinephile"; variant = "default";}

  return <Badge variant={variant}>{label}</Badge>;
}
