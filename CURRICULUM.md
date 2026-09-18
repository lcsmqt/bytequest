# CURRICULUM

Full 19-world plan and content-design principles are the master spec in `Core.txt` (§4–§7, §22).
This file tracks **implementation status only** — keep it short, update per world shipped.

| World | Title (PT-BR) | Concepts | Status |
|---|---|---|---|
| 0 | O Primeiro Shell | print, comentários, leitura de erros | ✅ Done (3 lessons + boss) |
| 1 | Vale das Variáveis | variáveis, tipos, input(), f-strings | ⬜ Not started |
| 2 | Cidadela dos Operadores | operadores aritméticos/lógicos/comparação | ⬜ Not started |
| 3 | Encruzilhada das Decisões | if/elif/else, and/or/not | ⬜ Not started |
| 4 | Floresta dos Loops | for, while, range, break/continue | ⬜ Not started |
| 5 | Porto das Strings | indexação, slicing, métodos de string | ⬜ Not started |
| 6 | Reino das Coleções | list, tuple, set, dict | ⬜ Not started |
| 7 | Montanhas das Funções | def, parâmetros, escopo, DRY | ⬜ Not started |
| 8 | Abismo dos Erros | try/except, tracebacks, debugging | ⬜ Not started |
| 9 | Biblioteca dos Módulos | import, stdlib (random/math/datetime/...) | ⬜ Not started |
| 10 | Arquivos de Dados | with, arquivos, JSON | ⬜ Not started |
| 11 | Cavernas das Comprehensions | list/dict/set comprehensions | ⬜ Not started |
| 12 | Cidade dos Objetos | classes, OOP, herança | ⬜ Not started |
| 13 | Arena dos Algoritmos | busca, ordenação, Big-O intuitivo | ⬜ Not started |
| 14 | Distrito da Maestria Python | enumerate/zip/lambda/generators/decorators | ⬜ Not started |
| 15 | Fortaleza dos Testes | assert, testes unitários | ⬜ Not started |
| 16 | Subterrâneo do Banco de Dados | SQLite, SQL básico | ⬜ Not started |
| 17 | Torre da Rede | HTTP, JSON APIs (mock/determinístico) | ⬜ Not started |
| 18 | Ilhas Assíncronas | async/await, asyncio (introdutório) | ⬜ Not started |
| Final | O Núcleo Fonte | projeto final integrador | ⬜ Not started |

## Adding a world
1. Create `curriculum/worlds/world-N.json` following the `World` type in `src/types/curriculum.ts`.
2. `order` controls sort order; `id` must be unique and match what `lessons[].world` references.
3. Each lesson's `prerequisites` gates when a station unlocks (`lessonsAvailable()`).
4. Hidden tests are Python `assert` statements — see any lesson in `world-0.json` for the pattern
   (`_bq_stdout` holds captured print output; any player-defined variable is also in scope).
5. No scene/engine code changes needed — `curriculumLoader.ts` globs every world file automatically.
   A new world's *room* (scene) still needs its own `WorldNScene.ts` file today; extracting a
   generic room-builder shared by all worlds is a good Phase 5 task once World 1 exists to compare against.
