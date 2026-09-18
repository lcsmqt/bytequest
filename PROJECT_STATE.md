# PROJECT_STATE

## Current phase
Phase 4 (First Playable World) — vertical slice for World 0 is playable end-to-end.

## Completed systems
- Vite + TypeScript + Phaser 4 scaffold (`npm run dev`, `npm run build`, `npm run typecheck`).
- Pyodide execution engine: dedicated Web Worker (`src/python/pyWorker.ts`), lazy CDN load
  (jsdelivr, pinned `PYODIDE_VERSION` in `src/python/pyodideVersion.ts`), stdout/stderr capture,
  timeout watchdog via `worker.terminate()` (`src/python/pyodideRunner.ts`).
- PT-BR error translation layer (`src/python/errorTranslate.ts`) — friendly message + raw traceback kept.
- Curriculum data schema + loader (`src/types/curriculum.ts`, `src/education/curriculumLoader.ts`)
  — `import.meta.glob` over `curriculum/worlds/*.json`, add a world with zero engine changes.
- Hidden-test validator (`src/education/validator.ts`) — runs player code + `assert`-based tests
  in one Pyodide call, player stdout isolated via `_bq_stdout`.
- Progressive hint engine (5 levels, level 5 requires re-confirm) — `src/education/hints.ts`.
- XP/level/mastery tracking — `src/education/progress.ts`.
- Versioned localStorage save system — `src/data/saveStore.ts`, `src/types/save.ts`.
- World 0 ("O Primeiro Shell") fully implemented: 3 lessons (print, comments, reading errors) +
  boss (Terminal Corrompido) — `curriculum/worlds/world-0.json`, `src/game/scenes/World0Scene.ts`.
- Menu → name prompt → playable room → NPC (BYTE) → terminal stations → XP/save loop verified
  live in-browser (Playwright): syntax-error feedback and output-mismatch feedback both confirmed working.

## Key architectural decisions
- Phaser **4** (stable, npm `phaser@^4.2.1`), not 3 — per spec.
- Pyodide is loaded from jsdelivr CDN inside a Worker, not the npm package — avoids bundling
  ~10MB+ into the app and keeps the main thread free. Version pinned, bump `PYODIDE_VERSION` when convenient.
- Timeout/watchdog strategy is worker termination, not a SharedArrayBuffer interrupt buffer —
  the latter needs COOP/COEP headers, unavailable on plain static hosting (GitHub Pages). Documented
  as a `ponytail:`-style upgrade path in `pyodideRunner.ts`.
- No code editor dependency (CodeMirror/Monaco) yet — a plain `<textarea>` styled as a terminal.
  Add a real editor (syntax highlighting) only if playtesting shows it's needed.
- Placeholder art is 100% procedural (`Phaser.GameObjects.Graphics` → generated textures in
  `BootScene`) — no external/copyrighted assets, per spec.
- Two `tsconfig` files: `tsconfig.json` (DOM lib, app code) and `tsconfig.worker.json`
  (WebWorker lib, just `pyWorker.ts`) — TS won't let one program mix `dom` + `webworker` libs.

## Known issues
- Bundle is ~1.4MB (mostly Phaser) — no code-splitting yet; fine for MVP, revisit if load time matters.
- Hidden-test string matching is exact-substring (`assert 'x' in _bq_stdout`) — a near-miss like a
  missing space fails the whole test, which is correct-but-strict; acceptable for now.
- Only World 0 exists. Worlds 1–18 + final project are not started.
- No automated tests yet (Phase 4 prioritized the playable loop); Phase 5 should add vitest
  coverage for `progress.ts`, `validator.ts`, `hints.ts`, `saveStore.ts` before content scales up.

## Next tasks
See TASKS.md.
