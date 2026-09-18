# BYTEQUEST: The Lost Source

Um RPG 8-bit gratuito, no navegador, que ensina Python do zero através do próprio jogo.
Sem cadastro, sem backend, sem serviços pagos.

## Rodando localmente
```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # build de produção em dist/
npm run typecheck
npm test
```

## Stack
Vite + TypeScript + Phaser 4 (jogo) + Pyodide (Python rodando no navegador via WebAssembly,
carregado sob demanda a partir do CDN jsdelivr) + localStorage (progresso salvo localmente).

Veja `ARCHITECTURE.md` para detalhes técnicos e `CURRICULUM.md` para o status do conteúdo
educacional. `PROJECT_STATE.md` é o resumo vivo do projeto (fase atual, decisões, próximos passos).

## Licença
A definir. Ver `THIRD_PARTY_LICENSES.md` quando ativos de terceiros forem adicionados.
