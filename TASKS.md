# TASKS

## Next up (Phase 5 — Worlds 1-4)
- [ ] Add vitest coverage: `progress.ts`, `hints.ts`, `validator.ts`, `saveStore.ts` (jsdom env for the last one).
- [ ] Extract a reusable "room scene" base class from `World0Scene` before World 1 duplicates it.
- [ ] `curriculum/worlds/world-1.json` — Vale das Variáveis (variables, types, input, f-strings).
- [ ] `curriculum/worlds/world-2.json` — Cidadela dos Operadores.
- [ ] `curriculum/worlds/world-3.json` — Encruzilhada das Decisões.
- [ ] `curriculum/worlds/world-4.json` — Floresta dos Loops (+ loop-debugging boss: Serpente Infinita).
- [ ] World map / world-select scene (currently World0 → nothing; need a hub once World 1 exists).

## Backlog (not blocking, revisit when relevant)
- Code-split the Phaser bundle (currently one ~1.4MB chunk) if load time becomes a real issue.
- Real code editor (indentation-aware) if plain `<textarea>` proves too rough past World 2.
- `docs/ADDING_CONTENT.md` for non-engineer content authors (spec §36).
- `THIRD_PARTY_LICENSES.md` once any third-party asset/font is actually vendored (currently only
  Google Fonts CDN + Phaser + Pyodide, both already covered in README).
- Accessibility pass: font-scale/reduce-motion/high-contrast settings exist in `SaveData.settings`
  but aren't wired to a settings UI yet.

## Done
- [x] Phase 0–4: scaffold, education engine, Pyodide engine, World 0 playable end-to-end.
