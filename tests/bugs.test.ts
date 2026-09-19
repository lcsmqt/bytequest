import { describe, expect, it } from "vitest";
import { activeBugs, applyBugDefeat } from "@/education/bugs";
import { createDefaultSave } from "@/types/save";
import type { Bug, World } from "@/types/curriculum";

const bug = (id: string, xp: number) => ({ id, challenge: { xp } }) as unknown as Bug;
const world = { bugs: [bug("a", 10), bug("b", 15)] } as unknown as World;

describe("activeBugs", () => {
  it("lists every bug on a fresh save and hides defeated ones", () => {
    const save = createDefaultSave("QA");
    expect(activeBugs(world, save).map((b) => b.id)).toEqual(["a", "b"]);
    expect(activeBugs(world, { defeatedBugs: ["a"] }).map((b) => b.id)).toEqual(["b"]);
  });

  it("copes with worlds that have no bugs", () => {
    expect(activeBugs(undefined, createDefaultSave("QA"))).toEqual([]);
    expect(activeBugs({} as World, createDefaultSave("QA"))).toEqual([]);
  });
});

describe("applyBugDefeat", () => {
  it("awards XP, levels up across the threshold and records the bug", () => {
    const save = { ...createDefaultSave("QA"), xp: 95 };
    const next = applyBugDefeat(save, bug("a", 10));
    expect(next.xp).toBe(105);
    expect(next.level).toBe(2);
    expect(next.defeatedBugs).toEqual(["a"]);
    expect(save.defeatedBugs).toEqual([]); // input untouched
  });

  it("pays out only once per bug", () => {
    const once = applyBugDefeat(createDefaultSave("QA"), bug("a", 10));
    expect(applyBugDefeat(once, bug("a", 10))).toBe(once);
  });
});
