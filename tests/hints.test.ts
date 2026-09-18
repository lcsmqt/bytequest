import { describe, expect, it } from "vitest";
import { initialHintState, nextHint } from "@/education/hints";
import type { Challenge } from "@/types/curriculum";

const challenge: Challenge = {
  id: "c1",
  title: "t",
  instructions: "i",
  starterCode: "",
  hints: ["ideia", "conceito", "pseudocódigo", "código parcial", "solução completa"],
  tests: [],
  xp: 10,
  successMessage: "ok",
};

describe("nextHint", () => {
  it("walks through levels 1-4 without confirmation", () => {
    let state = initialHintState();
    for (let level = 1; level <= 4; level++) {
      const result = nextHint(challenge, state);
      expect(result.state.level).toBe(level);
      expect(result.text).toBe(challenge.hints[level - 1]);
      state = result.state;
    }
  });

  it("refuses to reveal the full solution without explicit confirm", () => {
    let state = initialHintState();
    for (let i = 0; i < 4; i++) state = nextHint(challenge, state).state;

    const attempt = nextHint(challenge, state);
    expect(attempt.state.level).toBe(4); // unchanged
    expect(attempt.text).toMatch(/confirmar/i);
  });

  it("reveals the solution once confirmed", () => {
    let state = initialHintState();
    for (let i = 0; i < 4; i++) state = nextHint(challenge, state).state;

    const confirmed = nextHint(challenge, state, true);
    expect(confirmed.state.level).toBe(5);
    expect(confirmed.text).toBe(challenge.hints[4]);
    expect(confirmed.state.confirmedSolutionReveal).toBe(true);
  });
});
