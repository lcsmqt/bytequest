import { describe, expect, it } from "vitest";
import { buildScript, splitStdout } from "@/education/validator";
import type { Challenge } from "@/types/curriculum";

const tests: Challenge["tests"] = [
  { code: "assert x == 1", description: "x is 1" },
  { code: "assert y == 2", description: "y is 2" },
];

describe("buildScript", () => {
  it("wraps the player code in a redirect_stdout block and appends one try/except per test", () => {
    const script = buildScript("x = 1\ny = 2", tests);
    expect(script).toContain("redirect_stdout(_bq_buffer)");
    expect(script).toContain("x = 1");
    expect(script).toContain("y = 2");
    expect(script).toContain("assert x == 1");
    expect(script).toContain("assert y == 2");
    // one PASS marker line generated per test index
    expect(script.match(/:PASS"/g)?.length).toBe(2);
  });

  it("embeds the player code verbatim (spacing and multi-line strings intact) and compiles it under a friendly filename", () => {
    const code = 'msg = """a\n  b"""\nprint(msg)';
    const script = buildScript(code, []);
    expect(script).toContain(`_bq_code = ${JSON.stringify(code)}`);
    expect(script).toContain('compile(_bq_code, "<seu código>", "exec")');
  });
});

describe("splitStdout", () => {
  it("separates player output from test marker lines", () => {
    const raw = "Olá, Pyra!\nBYTEQUEST_TEST0:PASS\nBYTEQUEST_TEST1:FAIL:condição não satisfeita\n";
    const { playerStdout, outcomes } = splitStdout(raw, 2);
    expect(playerStdout).toBe("Olá, Pyra!");
    expect(outcomes.get(0)).toEqual({ description: "", passed: true, reason: "" });
    expect(outcomes.get(1)).toEqual({ description: "", passed: false, reason: "condição não satisfeita" });
  });

  it("ignores out-of-range test indices", () => {
    const raw = "BYTEQUEST_TEST5:PASS\n";
    const { outcomes } = splitStdout(raw, 2);
    expect(outcomes.size).toBe(0);
  });
});
