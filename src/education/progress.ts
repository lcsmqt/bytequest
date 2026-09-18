import type { Lesson } from "@/types/curriculum";
import type { SaveData } from "@/types/save";

/** Simple increasing curve: level N needs N*100 total XP. */
export function levelForXp(xp: number): number {
  let level = 1;
  let threshold = 100;
  let remaining = xp;
  while (remaining >= threshold) {
    remaining -= threshold;
    level += 1;
    threshold = level * 100;
  }
  return level;
}

export function xpToNextLevel(xp: number): { current: number; needed: number } {
  const level = levelForXp(xp);
  let consumed = 0;
  for (let l = 1; l < level; l++) consumed += l * 100;
  return { current: xp - consumed, needed: level * 100 };
}

export interface CompletionInput {
  lesson: Lesson;
  hintsUsed: number;
  attempts: number;
  succeeded: boolean;
}

/** Mutates a shallow copy of the save with XP, level and per-concept mastery updated. Never mutates the input. */
export function applyCompletion(save: SaveData, { lesson, hintsUsed, attempts, succeeded }: CompletionInput): SaveData {
  const next: SaveData = structuredClone(save);

  if (succeeded && !next.completedLessons.includes(lesson.id)) {
    next.completedLessons.push(lesson.id);
    next.xp += lesson.challenge.xp;
    next.level = levelForXp(next.xp);
  }

  for (const concept of lesson.concepts) {
    const current = next.mastery[concept] ?? { attempts: 0, successes: 0, hintsUsed: 0 };
    next.mastery[concept] = {
      attempts: current.attempts + attempts,
      successes: current.successes + (succeeded ? 1 : 0),
      hintsUsed: current.hintsUsed + hintsUsed,
    };
  }

  return next;
}

export function masteryPercent(save: SaveData, concept: string): number {
  const m = save.mastery[concept];
  if (!m || m.attempts === 0) return 0;
  return Math.round((m.successes / m.attempts) * 100);
}

export function worldProgressPercent(save: SaveData, worldLessonIds: string[]): number {
  if (worldLessonIds.length === 0) return 0;
  const done = worldLessonIds.filter((id) => save.completedLessons.includes(id)).length;
  return Math.round((done / worldLessonIds.length) * 100);
}
