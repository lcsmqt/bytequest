"""Run every challenge's documented solution (last hint) against its hidden tests with real CPython, using the
same wrapper as src/education/validator.ts. Also checks the starter code does NOT already pass.
Usage: python scripts/verify_lessons.py   (exit 1 on any problem)"""
import contextlib, glob, io, json, re, subprocess, sys, textwrap

MARK = "BYTEQUEST_TEST"


def _child(user_code, tests):
    """Mirror of buildScript(): player code inside redirect_stdout, tests after, results collected per test."""
    ns = {}
    buf = io.StringIO()
    try:
        with contextlib.redirect_stdout(buf):
            exec(compile(user_code, "<player>", "exec"), ns)
    except BaseException as e:  # noqa: BLE001
        return None, f"runtime error: {type(e).__name__}: {e}"
    ns["_bq_stdout"] = buf.getvalue()
    out = []
    for t in tests:
        try:
            exec(textwrap.dedent(t["code"]), ns)
            out.append((t["description"], True, ""))
        except AssertionError as e:
            out.append((t["description"], False, str(e) or "condição não satisfeita"))
        except Exception as e:  # noqa: BLE001
            out.append((t["description"], False, f"{type(e).__name__}: {e}"))
    return out, ""


def run(user_code, tests, timeout=6):
    """Each run is a separate process so infinite loops (intentional in the loop-bug boss) time out like the game's watchdog."""
    src = open(__file__, encoding="utf-8").read().split("def run(")[0]  # helpers only
    payload = json.dumps([user_code, tests])
    code = src + "\nimport json,sys\nprint(json.dumps(_child(*json.loads(sys.stdin.read()))))\n"
    try:
        p = subprocess.run([sys.executable, "-c", code], input=payload, capture_output=True, text=True, timeout=timeout, encoding="utf-8")
    except subprocess.TimeoutExpired:
        return None, "timeout (infinite loop?)"
    if p.returncode:
        return None, "harness crash: " + p.stderr[-200:]
    res, err = json.loads(p.stdout.strip().splitlines()[-1])
    return res, err


def solution(ch):
    last = ch["hints"][-1]
    m = re.match(r"A resposta completa é:\s*(.*)", last, re.S)
    return (m.group(1) if m else last).strip("\n")


problems = 0
for path in sorted(glob.glob("curriculum/worlds/*.json")):
    w = json.load(open(path, encoding="utf-8"))
    items = [(l["id"], l["challenge"]) for l in w["lessons"]] + [(w["boss"]["id"], w["boss"]["challenge"])]
    items += [(b["id"], b["challenge"]) for b in w.get("bugs", [])]
    for ident, ch in items:
        res, err = run(solution(ch), ch["tests"])
        if "NameError" in err:  # the hint shows only the new lines; the starter defines the pre-existing variables
            res, err = run(ch["starterCode"] + "\n" + solution(ch), ch["tests"])
        bad = err or [r for r in res if not r[1]]
        if bad:
            problems += 1
            print(f"FAIL solution  {ident}: {err or [(d, why) for d, ok, why in bad]}")
        pre, perr = run(ch["starterCode"], ch["tests"])
        if not perr and pre and all(ok for _, ok, _ in pre):
            problems += 1
            print(f"FAIL starter already passes  {ident}")
        # every hint must be non-empty and the ladder must end in the full answer
        if len(ch["hints"]) < 3 or any(not h.strip() for h in ch["hints"]):
            problems += 1
            print(f"FAIL hints  {ident}: {len(ch['hints'])} hints")
        print(("ok    " if not bad else "BAD   ") + ident)
print("problems:", problems)
sys.exit(1 if problems else 0)
