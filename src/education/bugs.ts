import type { Bug, World } from "@/types/curriculum";
import type { SaveData } from "@/types/save";
import { levelForXp } from "./progress";

/** Bugs of a world that are still roaming (defeated ones stay gone). */
export function activeBugs(world: World | undefined, save: Pick<SaveData, "defeatedBugs">): Bug[] {
  return (world?.bugs ?? []).filter((b) => !save.defeatedBugs.includes(b.id));
}

/** Records a bug victory: XP + level, once per bug. Returns a new save; never mutates the input. */
export function applyBugDefeat(save: SaveData, bug: Bug): SaveData {
  if (save.defeatedBugs.includes(bug.id)) return save;
  const xp = save.xp + bug.challenge.xp;
  return { ...save, xp, level: levelForXp(xp), defeatedBugs: [...save.defeatedBugs, bug.id] };
}
