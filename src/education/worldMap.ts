import type { World } from "@/types/curriculum";
import type { SaveData } from "@/types/save";

/** Where each curriculum world happens in the realm (shown on the map; data-driven worlds fall back to their title). */
const PLACES: Record<string, string> = {
  "world-0": "Academia de Python",
  "world-1": "Vale das Variáveis",
  "world-2": "A Forja",
  "world-3": "Cavernas da Condição",
  "world-4": "Floresta dos Loops",
};

export interface MapNode {
  id: string;
  title: string;
  subtitle: string;
  place: string;
  unlocked: boolean;
  completed: boolean;
  lessonsDone: number;
  lessonsTotal: number;
  /** Title of the world whose boss must fall before this one opens. */
  lockedBy?: string;
}

/** A world opens once the previous world's boss is defeated; the first is always open. */
export function buildMapNodes(worlds: World[], save: Pick<SaveData, "completedLessons" | "completedBosses">): MapNode[] {
  return worlds.map((w, i) => {
    const prev = worlds[i - 1];
    const unlocked = !prev || save.completedBosses.includes(prev.boss.id);
    return {
      id: w.id,
      title: w.title,
      subtitle: w.subtitle,
      place: PLACES[w.id] ?? w.title,
      unlocked,
      completed: save.completedBosses.includes(w.boss.id),
      lessonsDone: w.lessons.filter((l) => save.completedLessons.includes(l.id)).length,
      lessonsTotal: w.lessons.length,
      lockedBy: unlocked ? undefined : prev?.title,
    };
  });
}

/** Move the map cursor one node, clamped to the ends. */
export function stepSelection(count: number, current: number, dir: -1 | 1): number {
  return Math.min(count - 1, Math.max(0, current + dir));
}
