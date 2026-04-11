// ─────────────────────────────────────
// VOLTV — XP & Level System
// ─────────────────────────────────────

import { prisma } from "@/lib/prisma";
import { XP_REWARDS } from "@/types";

export type XPAction = keyof typeof XP_REWARDS;

export interface XPResult {
  xp_gained: number;
  new_total: number;
  leveled_up: boolean;
  new_level: number;
  new_title: string;
}

const LEVEL_THRESHOLDS = [
  { min: 0,    level: 1, title: "Cinephile" },
  { min: 500,  level: 2, title: "Critic"    },
  { min: 2000, level: 3, title: "Auteur"    },
  { min: 5000, level: 4, title: "Legend"    },
] as const;

export const BLUE_TICK_XP_THRESHOLD = 100;

function getLevelInfo(xp: number): { level: number; title: string } {
  let current: { min: number; level: number; title: string } = LEVEL_THRESHOLDS[0];
  for (const tier of LEVEL_THRESHOLDS) {
    if (xp >= tier.min) current = tier;
  }
  return { level: current.level, title: current.title };
}

export async function awardXP(userId: string, action: XPAction): Promise<XPResult> {
  const xpGained = XP_REWARDS[action];

  const user = await prisma.user.update({
    where: { id: userId },
    data:  { xp_points: { increment: xpGained } },
    select: { xp_points: true, level: true, is_blue_tick: true },
  });

  const prevLevel = user.level;
  const newInfo   = getLevelInfo(user.xp_points);
  const leveledUp = newInfo.level > prevLevel;

  const shouldHaveTick = user.xp_points >= BLUE_TICK_XP_THRESHOLD;
  const tickChanged    = shouldHaveTick !== user.is_blue_tick;

  if (leveledUp || tickChanged) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        ...(leveledUp    ? { level: newInfo.level }      : {}),
        ...(tickChanged  ? { is_blue_tick: shouldHaveTick } : {}),
      },
    });
  }

  return {
    xp_gained: xpGained,
    new_total:  user.xp_points,
    leveled_up: leveledUp,
    new_level:  newInfo.level,
    new_title:  newInfo.title,
  };
}
