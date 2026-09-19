import { describe, expect, it } from "vitest";
import { explainError, trimTraceback } from "@/python/errorTranslate";

const nameError = [
  "Traceback (most recent call last):",
  '  File "/lib/python314.zip/_pyodide/_base.py", line 619, in eval_code_async',
  "    await CodeRunner(",
  "  File \"<exec>\", line 7, in <module>",
  '  File "<seu código>", line 3, in <module>',
  "NameError: name 'x' is not defined",
].join("\n");

const syntaxError = [
  "Traceback (most recent call last):",
  '  File "/lib/python314.zip/_pyodide/_base.py", line 619, in eval_code_async',
  "    await CodeRunner(",
  '  File "<exec>", line 7, in <module>',
  '  File "<seu código>", line 1',
  "    for i in range(3)",
  "                     ^",
  "SyntaxError: expected ':'",
].join("\n");

describe("trimTraceback", () => {
  it("keeps the header, the player's frame and the final error line, and drops Pyodide's frames", () => {
    expect(trimTraceback(nameError)).toBe(
      ["Traceback (most recent call last):", '  File "<seu código>", line 3, in <module>', "NameError: name 'x' is not defined"].join("\n"),
    );
  });

  it("keeps the source line and caret that belong to the player's SyntaxError frame", () => {
    const out = trimTraceback(syntaxError);
    expect(out).toContain('File "<seu código>", line 1');
    expect(out).toContain("    for i in range(3)");
    expect(out).toContain("SyntaxError: expected ':'");
    expect(out).not.toContain("_pyodide");
    expect(out).not.toContain("<exec>");
  });

  it("leaves a message without frames untouched", () => {
    expect(trimTraceback("Something odd")).toBe("Something odd");
  });
});

describe("explainError", () => {
  it("pairs a PT-BR explanation with the trimmed traceback", () => {
    const e = explainError(nameError);
    expect(e.friendly).toMatch(/Nome não definido/);
    expect(e.raw).not.toContain("_pyodide");
  });
});
