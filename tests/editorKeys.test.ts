import { describe, expect, it } from "vitest";
import { applyEdit, enterEdit, tabEdit } from "@/ui/editorKeys";

const run = (text: string, edit: ReturnType<typeof tabEdit>) => applyEdit(text, edit);

describe("tabEdit", () => {
  it("inserts spaces up to the next 4-column stop", () => {
    expect(run("ab", tabEdit("ab", 2, 2, false))).toBe("ab  ");
    expect(run("", tabEdit("", 0, 0, false))).toBe("    ");
  });

  it("indents every selected line", () => {
    const text = "a\nb\nc";
    expect(run(text, tabEdit(text, 0, 3, false))).toBe("    a\n    b\nc");
  });

  it("Shift+Tab dedents up to one level and never eats non-space characters", () => {
    expect(run("        x", tabEdit("        x", 9, 9, true))).toBe("    x");
    expect(run("  x", tabEdit("  x", 3, 3, true))).toBe("x");
    expect(run("x", tabEdit("x", 1, 1, true))).toBe("x");
  });
});

describe("enterEdit", () => {
  it("keeps the current indentation", () => {
    const text = "    print(1)";
    expect(run(text, enterEdit(text, text.length, text.length))).toBe("    print(1)\n    ");
  });

  it("adds a level after a line ending in a colon", () => {
    const text = "if x:";
    const e = enterEdit(text, text.length, text.length);
    expect(run(text, e)).toBe("if x:\n    ");
    expect(e.selStart).toBe(text.length + 5);
  });

  it("splits a line in the middle without losing the tail", () => {
    const text = "ab";
    expect(run(text, enterEdit(text, 1, 1))).toBe("a\nb");
  });
});
