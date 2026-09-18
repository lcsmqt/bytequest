import type { World, Lesson } from "@/types/curriculum";

// Vite glob-imports every world JSON file so adding a new world/lesson never touches engine code.
const modules = import.meta.glob("/curriculum/worlds/*.json", { eager: true }) as Record<string, { default: World }>;

let cache: World[] | null = null;

export function loadWorlds(): World[] {
  cache ??= Object.values(modules)
    .map((m) => m.default)
    .sort((a, b) => a.order - b.order);
  return cache;
}

export function getWorld(worldId: string): World | undefined {
  return loadWorlds().find((w) => w.id === worldId);
}

export function getLesson(lessonId: string): Lesson | undefined {
  for (const world of loadWorlds()) {
    const found = world.lessons.find((l) => l.id === lessonId);
    if (found) return found;
  }
  return undefined;
}

export function lessonsAvailable(lesson: Lesson, completedLessons: string[]): boolean {
  return lesson.prerequisites.every((p) => completedLessons.includes(p));
}
