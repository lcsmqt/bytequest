# ARCHITECTURE

## Stack
Vite + TypeScript (strict) + Phaser 4 (game/render layer) + Pyodide (Python-in-browser, via CDN)
+ localStorage (save data). No backend. No paid services.

## Directory layout
```
src/
  game/
    scenes/     Phaser scenes (Boot, Menu, World0, ...)
    systems/    GameState (in-memory save holder + mutation API)
  education/    curriculum loader, validator, hints, XP/mastery — pure logic, no Phaser/DOM
  python/       Pyodide worker + main-thread runner + PT-BR error translation
  ui/           DOM overlays that sit above the Phaser canvas (terminal, dialogue, HUD, modals)
  data/         localStorage save read/write + migration
  types/        shared TS interfaces (curriculum schema, save schema)
  config.ts     single place for game name/title and tunable constants
curriculum/
  worlds/       one JSON file per world; engine never hardcodes lesson content
docs/           content-authoring guide (planned)
tests/          vitest, logic-only (no Phaser rendering required)
```

## Python execution
1. `TerminalPanel` (UI) calls `PyodideRunner.run(code)` (main thread).
2. `PyodideRunner` owns a `Worker` running `pyWorker.ts`. First call lazy-loads Pyodide from
   jsdelivr (`pyodideVersion.ts`) — nothing downloads until a player opens a terminal.
3. `pyWorker.ts` captures stdout/stderr via `pyodide.setStdout/setStderr`, runs the code, and
   posts `{stdout, stderr, ok}` back.
4. Watchdog: `PyodideRunner.run` races the worker response against `PYTHON_EXEC_TIMEOUT_MS`
   (5s default). On timeout it calls `worker.terminate()` and drops the worker — the next run
   spawns a fresh one. This is the whole infinite-loop defense; see `PROJECT_STATE.md` for the
   documented upgrade path (interrupt buffer + cross-origin isolation) if a graceful stop is ever needed.
5. `validator.ts` builds one combined script: player code (stdout captured to a `_bq_stdout`
   Python variable via `contextlib.redirect_stdout`) + each hidden test wrapped in
   `try/except` printing a sentinel-prefixed PASS/FAIL line. One Pyodide call validates everything.
6. `errorTranslate.ts` maps common exception types to a PT-BR sentence; the raw traceback is
   always shown alongside it (spec requires never hiding the real error).

## Curriculum data
`curriculum/worlds/*.json` follow the `World` schema in `src/types/curriculum.ts`
(`World → Lesson[] → Challenge`, plus a `Boss`). `curriculumLoader.ts` uses
`import.meta.glob("/curriculum/worlds/*.json")` — adding a world is adding a JSON file, no
engine/scene code changes required (see `curriculum/README.md` once written, per spec §36).

Hidden tests are plain Python `assert` statements run in the same namespace as the player's
code, so they can check `_bq_stdout` (captured print output) or any variable/function the
player defined — the convention generalizes to every future world without validator changes.

## Save data
`src/types/save.ts` defines `SaveData` with `saveVersion`. `saveStore.ts` reads/writes
`localStorage` and has a `migrate()` seam for when the shape changes — bump
`CURRENT_SAVE_VERSION` and add a case, never mutate old saves silently.

## Game loop (World 0, the template for every later world)
`BootScene` (generate placeholder textures) → `MenuScene` (name prompt via DOM modal) →
`World0Scene`: a single room, arcade-physics player movement, a stationary NPC (BYTE) that
opens an intro dialogue, N lesson "terminal" props (locked/active/done texture depending on
`lessonsAvailable()` + save state) and one boss gate. Interacting opens `TerminalPanel`; on
success `GameState.completeLesson()` updates XP/mastery and persists immediately.

## Why not X
- **CodeMirror/Monaco**: a styled `<textarea>` is enough for World 0's one-liners; add a real
  editor only once lessons need real editing ergonomics (indentation help, multi-function files).
- **SharedArrayBuffer interrupt for Pyodide**: needs COOP/COEP response headers, which plain
  static hosting (GitHub Pages) doesn't send. Worker-terminate is simpler and free.
- **A backend**: everything (progress, saves, code execution) runs client-side; nothing here
  needs a server for the MVP, per the free-first requirement.
