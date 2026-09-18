import { describe, expect, it } from "vitest";
import { levelForXp, xpToNextLevel, applyCompletion } from "@/education/progress";
import { createDefaultSave } from "@/types/save";
import type { Lesson } from "@/types/curriculum";

const lesson: Lesson = {
  id: "l1",
  world: "world-0",
  title: "t",
  story: "s",
  learningObjectives: [],
  explanation: "e",
  examples: [],
  concepts: ["print"],
  prerequisites: [],
  challenge: {
    id: "c1",
    title: "t",
    instructions: "i",
    starterCode: "",
    hints: ["a", "b", "c", "d", "e"],
    tests: [],
    xp: 20,
    successMessage: "ok",
  },
};

describe("levelForXp", () => {
  it("starts at level 1 with 0 xp", () => {
    expect(levelForXp(0)).toBe(1);
  });
  it("levels up once the threshold is crossed (100 for level 1->2)", () => {
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2);
  });
  it("matches xpToNextLevel's accounting", () => {
    const { current, needed } = xpToNextLevel(150);
    expect(needed).toBe(200); // level 2 threshold
    expect(current).toBe(50);
  });
});

describe("applyCompletion", () => {
  it("awards xp and marks the lesson complete exactly once", () => {
    const save = createDefaultSave("Ana");
    const after = applyCompletion(save, { lesson, hintsUsed: 1, attempts: 2, succeeded: true });
    expect(after.xp).toBe(20);
    expect(after.completedLessons).toEqual(["l1"]);

    const again = applyCompletion(after, { lesson, hintsUsed: 0, attempts: 1, succeeded: true });
    expect(again.xp).toBe(20); // no double-award
    expect(again.completedLessons).toEqual(["l1"]);
  });

  it("never mutates the input save", () => {
    const save = createDefaultSave("Ana");
    applyCompletion(save, { lesson, hintsUsed: 0, attempts: 1, succeeded: true });
    expect(save.xp).toBe(0);
    expect(save.completedLessons).toEqual([]);
  });

  it("tracks mastery per concept even on failure", () => {
    const save = createDefaultSave("Ana");
    const after = applyCompletion(save, { lesson, hintsUsed: 2, attempts: 1, succeeded: false });
    expect(after.mastery.print).toEqual({ attempts: 1, successes: 0, hintsUsed: 2 });
    expect(after.xp).toBe(0);
  });
});
