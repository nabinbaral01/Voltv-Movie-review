import { prisma } from "@/lib/prisma";
import { BLUE_TICK_XP_THRESHOLD } from "@/lib/xp-system";

async function main() {
  const T = BLUE_TICK_XP_THRESHOLD;
  const grant = await prisma.user.updateMany({
    where: { xp_points: { gte: T }, is_blue_tick: false },
    data:  { is_blue_tick: true },
  });
  const revoke = await prisma.user.updateMany({
    where: { xp_points: { lt: T }, is_blue_tick: true },
    data:  { is_blue_tick: false },
  });
  console.log(`granted: ${grant.count}, revoked: ${revoke.count}`);
}

main().finally(() => prisma.$disconnect());
