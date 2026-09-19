import { describe, expect, it } from "vitest";
import { buildMapNodes, stepSelection } from "@/education/worldMap";
import type { World } from "@/types/curriculum";

const world = (id: string, order: number, lessonIds: string[]): World =>
  ({
    id,
    order,
    title: `Mundo ${order}`,
    subtitle: "",
    lessons: lessonIds.map((l) => ({ id: l })),
    boss: { id: `${id}-boss` },
  }) as unknown as World;

const worlds = [world("world-0", 0, ["a", "b"]), world("world-1", 1, ["c"]), world("world-2", 2, ["d"])];

describe("buildMapNodes", () => {
  it("opens only the first world on a fresh save", () => {
    const nodes = buildMapNodes(worlds, { completedLessons: [], completedBosses: [] });
    expect(nodes.map((n) => n.unlocked)).toEqual([true, false, false]);
    expect(nodes[1].lockedBy).toBe("Mundo 0");
    expect(nodes[0].lockedBy).toBeUndefined();
  });

  it("opens the next world exactly when the previous boss is defeated", () => {
    const nodes = buildMapNodes(worlds, { completedLessons: ["a", "b"], completedBosses: ["world-0-boss"] });
    expect(nodes.map((n) => n.unlocked)).toEqual([true, true, false]);
    expect(nodes[0].completed).toBe(true);
    expect(nodes[1].completed).toBe(false);
  });

  it("counts finished lessons per world", () => {
    const nodes = buildMapNodes(worlds, { completedLessons: ["a", "c"], completedBosses: [] });
    expect(nodes.map((n) => [n.lessonsDone, n.lessonsTotal])).toEqual([[1, 2], [1, 1], [0, 1]]);
  });

  it("falls back to the world title for places it does not know", () => {
    const nodes = buildMapNodes([world("world-9", 9, [])], { completedLessons: [], completedBosses: [] });
    expect(nodes[0].place).toBe("Mundo 9");
  });
});

describe("stepSelection", () => {
  it("moves and clamps at both ends", () => {
    expect(stepSelection(5, 0, -1)).toBe(0);
    expect(stepSelection(5, 0, 1)).toBe(1);
    expect(stepSelection(5, 4, 1)).toBe(4);
  });
});
