import type { Challenge } from "@/types/curriculum";
import { explainError } from "@/python/errorTranslate";
import type { PyodideRunner } from "@/python/pyodideRunner";

const MARKER = "BYTEQUEST_TEST";

export interface TestOutcome {
  description: string;
  passed: boolean;
  reason?: string;
}

export interface ValidationResult {
  allPassed: boolean;
  results: TestOutcome[];
  runtimeError?: { friendly: string; raw: string };
  timedOut: boolean;
  playerStdout: string;
}

function indent(code: string): string {
  return code
    .split("\n")
    .map((line) => "    " + line)
    .join("\n");
}

// Player code is compiled from a string literal and exec'd inside a redirect_stdout block, so its printed
// output becomes the `_bq_stdout` string every hidden test can assert against, and anything it defines
// (variables/functions) lands in this script's globals for the tests. Compiling instead of nesting the source
// inside `with:` keeps the player's spacing intact (multi-line strings) and tracebacks point at the *player's*
// line numbers, which the "read the error" lesson depends on.
export function buildScript(userCode: string, tests: Challenge["tests"]): string {
  const testBlocks = tests
    .map(
      (test, i) => `
try:
${indent(test.code)}
    print("${MARKER}${i}:PASS")
except AssertionError as e:
    print("${MARKER}${i}:FAIL:" + (str(e) or "condição não satisfeita"))
except Exception as e:
    print("${MARKER}${i}:FAIL:" + type(e).__name__ + ": " + str(e))
`,
    )
    .join("\n");

  return `import io as _bq_io, contextlib as _bq_contextlib
_bq_buffer = _bq_io.StringIO()
_bq_code = ${JSON.stringify(userCode)}
try:
    with _bq_contextlib.redirect_stdout(_bq_buffer):
        exec(compile(_bq_code, "<seu código>", "exec"), globals())
except BaseException:
    print(_bq_buffer.getvalue(), end="")
    raise
_bq_stdout = _bq_buffer.getvalue()
print(_bq_stdout, end="")
${testBlocks}`;
}

export function splitStdout(stdout: string, testCount: number): { playerStdout: string; outcomes: Map<number, TestOutcome> } {
  const lines = stdout.split("\n");
  const playerLines: string[] = [];
  const outcomes = new Map<number, TestOutcome>();

  for (const line of lines) {
    if (!line.startsWith(MARKER)) {
      playerLines.push(line);
      continue;
    }
    const rest = line.slice(MARKER.length);
    const [indexStr, status, ...reasonParts] = rest.split(":");
    const index = Number(indexStr);
    if (Number.isNaN(index) || index >= testCount) continue;
    outcomes.set(index, { description: "", passed: status === "PASS", reason: reasonParts.join(":") });
  }
  return { playerStdout: playerLines.join("\n").trim(), outcomes };
}

export async function validateChallenge(
  runner: PyodideRunner,
  challenge: Challenge,
  userCode: string,
): Promise<ValidationResult> {
  const script = buildScript(userCode, challenge.tests);
  const run = await runner.run(script);

  if (run.timedOut) {
    return { allPassed: false, results: [], timedOut: true, playerStdout: "" };
  }

  if (!run.ok && !run.stdout.includes(MARKER)) {
    return {
      allPassed: false,
      results: [],
      runtimeError: explainError(run.stderr),
      timedOut: false,
      playerStdout: run.stdout.trim(),
    };
  }

  const { playerStdout, outcomes } = splitStdout(run.stdout, challenge.tests.length);
  const results: TestOutcome[] = challenge.tests.map((test, i) => ({
    description: test.description,
    passed: outcomes.get(i)?.passed ?? false,
    reason: outcomes.get(i)?.reason,
  }));

  return {
    allPassed: results.length > 0 && results.every((r) => r.passed),
    results,
    timedOut: false,
    playerStdout,
  };
}
