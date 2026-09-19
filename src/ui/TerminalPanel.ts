import type { Challenge } from "@/types/curriculum";
import { PyodideRunner } from "@/python/pyodideRunner";
import { validateChallenge } from "@/education/validator";
import { initialHintState, nextHint, type HintState } from "@/education/hints";
import { decipher, runeGlyphs } from "./runes";
import { enterEdit, tabEdit, type Edit } from "./editorKeys";
import { shieldGameKeys } from "./keyShield";

export interface TerminalOutcome {
  hintsUsed: number;
  attempts: number;
}

export interface EnemyView {
  name: string;
  portrait: string;
}

export interface OpenOptions {
  /** A bug encounter: shows the monster in the mission pane; it strikes on a wrong run and falls on a right one. */
  enemy?: EnemyView;
  /** Called after every run that did not pass (wrong output, error or timeout). */
  onFail?: () => void;
}

export class TerminalPanel {
  private root: HTMLDivElement;
  private editor: HTMLTextAreaElement;
  private output: HTMLDivElement;
  private hintBox: HTMLDivElement;
  private storyBox: HTMLDivElement;
  private instructionsBox: HTMLDivElement;
  private titleBox: HTMLSpanElement;
  private runeBox: HTMLDivElement;
  private enemyBox: HTMLDivElement;
  private onFail: (() => void) | null = null;
  private runeWord = "";
  private cancelDecipher: (() => void) | null = null;
  private runner = new PyodideRunner();
  private hintState: HintState = initialHintState();
  private attempts = 0;
  private hintsUsedCount = 0;
  private onComplete: ((outcome: TerminalOutcome) => void) | null = null;
  private onCancel: (() => void) | null = null;
  private currentChallenge: Challenge | null = null;

  get isOpen(): boolean {
    return this.root.classList.contains("open");
  }

  constructor(parent: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "bq-terminal";
    this.root.innerHTML = `
      <div class="bq-terminal__pane">
        <div class="bq-terminal__header">
          <span data-role="title">Runa</span>
          <button class="bq-close" data-action="close" aria-label="Fechar runa">✕</button>
        </div>
        <div class="bq-enemy" data-role="enemy" hidden></div>
        <div class="bq-rune" data-role="rune" aria-label="Inscrição arcana"></div>
        <div class="bq-terminal__story" data-role="story"></div>
        <div class="bq-terminal__instructions" data-role="instructions"></div>
        <div class="bq-hint-list" data-role="hint"></div>
      </div>
      <div class="bq-terminal__pane">
        <div class="bq-terminal__header"><span>Console da Runa · Python</span></div>
        <textarea class="bq-terminal__editor" data-role="editor" spellcheck="false"></textarea>
        <div class="bq-terminal__output" data-role="output">Pronto para executar.</div>
        <div class="bq-terminal__actions">
          <button class="bq-btn bq-btn--primary" data-action="run">▶ Executar (Ctrl+Enter)</button>
          <button class="bq-btn" data-action="hint">💡 Dica</button>
        </div>
      </div>
    `;
    parent.appendChild(this.root);

    this.editor = this.root.querySelector('[data-role="editor"]')!;
    this.output = this.root.querySelector('[data-role="output"]')!;
    this.hintBox = this.root.querySelector('[data-role="hint"]')!;
    this.storyBox = this.root.querySelector('[data-role="story"]')!;
    this.instructionsBox = this.root.querySelector('[data-role="instructions"]')!;
    this.titleBox = this.root.querySelector('[data-role="title"]')!;
    this.runeBox = this.root.querySelector('[data-role="rune"]')!;
    this.enemyBox = this.root.querySelector('[data-role="enemy"]')!;

    this.root.querySelector('[data-action="close"]')!.addEventListener("click", () => this.close());
    this.root.querySelector('[data-action="run"]')!.addEventListener("click", () => void this.runCode());
    this.root.querySelector('[data-action="hint"]')!.addEventListener("click", () => this.showHint());
    shieldGameKeys(this.root);
    this.editor.addEventListener("keydown", (e) => this.onEditorKey(e));
    this.root.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.close();
    });
  }

  open(
    title: string,
    story: string,
    challenge: Challenge,
    onComplete: (outcome: TerminalOutcome) => void,
    onCancel?: () => void,
    rune = "",
    opts: OpenOptions = {},
  ): void {
    this.titleBox.textContent = title;
    this.onFail = opts.onFail ?? null;
    this.enemyBox.hidden = !opts.enemy;
    this.enemyBox.className = "bq-enemy";
    this.enemyBox.innerHTML = opts.enemy ? `<img src="${opts.enemy.portrait}" alt="" /><span>${opts.enemy.name}</span>` : "";
    this.cancelDecipher?.();
    this.runeWord = rune;
    this.runeBox.textContent = runeGlyphs(rune);
    this.runeBox.classList.remove("deciphered");
    this.runeBox.hidden = !rune;
    this.storyBox.textContent = story;
    this.instructionsBox.textContent = challenge.instructions;
    this.editor.value = challenge.starterCode;
    this.output.textContent = "Pronto para executar.";
    this.output.className = "bq-terminal__output";
    this.hintBox.textContent = "";
    this.hintState = initialHintState();
    this.attempts = 0;
    this.hintsUsedCount = 0;
    this.onComplete = onComplete;
    this.onCancel = onCancel ?? null;
    this.currentChallenge = challenge;
    this.root.classList.add("open");
    void this.runner.warmUp((text) => (this.output.textContent = text)).then((ok) => {
      if (ok && this.output.textContent?.startsWith("Carregando")) this.output.textContent = "Pronto para executar.";
    });
    this.editor.focus();
  }

  private onEditorKey(e: KeyboardEvent): void {
    const ed = this.editor;
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      void this.runCode();
    } else if (e.key === "Tab") {
      e.preventDefault();
      this.apply(tabEdit(ed.value, ed.selectionStart, ed.selectionEnd, e.shiftKey));
    } else if (e.key === "Enter" && !e.shiftKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      this.apply(enterEdit(ed.value, ed.selectionStart, ed.selectionEnd));
    }
  }

  /** execCommand keeps Ctrl+Z working; setRangeText is the fallback where it is unavailable. */
  private apply(edit: Edit): void {
    const ed = this.editor;
    ed.setSelectionRange(edit.from, edit.to);
    if (!document.execCommand("insertText", false, edit.insert)) ed.setRangeText(edit.insert, edit.from, edit.to, "end");
    ed.setSelectionRange(edit.selStart, edit.selEnd);
  }

  /** Closing before the challenge is completed counts as a cancel — lets the caller unblock
   * whatever it froze (e.g. player movement) while the panel was open. */
  close(): void {
    this.cancelDecipher?.();
    if (this.onComplete) this.onCancel?.();
    this.onComplete = null;
    this.onCancel = null;
    this.root.classList.remove("open");
  }

  private showHint(): void {
    if (!this.currentChallenge) return;
    const wasConfirmed = this.hintState.confirmedSolutionReveal;
    const { text, state } = nextHint(this.currentChallenge, this.hintState, wasConfirmed);
    if (state.level > this.hintState.level) this.hintsUsedCount += 1;
    this.hintState = state;
    this.hintBox.textContent = `Dica ${state.level || ""}: ${text}`;
  }

  /** Restarts a CSS animation class on the enemy portrait. */
  private enemyReact(cls: "hit" | "down"): void {
    if (this.enemyBox.hidden) return;
    this.enemyBox.classList.remove("hit", "down");
    void this.enemyBox.offsetWidth; // reflow so the animation restarts
    this.enemyBox.classList.add(cls);
  }

  private fail(): void {
    this.enemyReact("hit");
    this.onFail?.();
  }

  private async runCode(): Promise<void> {
    if (!this.currentChallenge) return;
    this.attempts += 1;
    this.output.className = "bq-terminal__output";
    this.output.textContent = "Executando...";

    const result = await validateChallenge(this.runner, this.currentChallenge, this.editor.value);

    if (result.timedOut) {
      this.output.className = "bq-terminal__output error";
      this.output.textContent = "Execução interrompida: possível loop infinito. Revise seu código.";
      this.fail();
      return;
    }
    if (result.runtimeError) {
      this.output.className = "bq-terminal__output error";
      const printed = result.playerStdout ? `${result.playerStdout}\n\n` : "";
      this.output.textContent = `${printed}${result.runtimeError.friendly}\n\n${result.runtimeError.raw}`;
      this.fail();
      return;
    }
    if (result.allPassed) {
      this.output.className = "bq-terminal__output success";
      this.output.textContent = `${result.playerStdout}\n\n✔ ${this.currentChallenge.successMessage}`;
      this.enemyReact("down");
      if (this.runeWord) {
        this.runeBox.classList.add("deciphered");
        this.cancelDecipher = decipher(this.runeBox, this.runeWord);
      }
      const onComplete = this.onComplete;
      this.onComplete = null;
      onComplete?.({ hintsUsed: this.hintsUsedCount, attempts: this.attempts });
      return;
    }
    const failed = result.results.filter((r) => !r.passed);
    this.output.className = "bq-terminal__output error";
    this.output.textContent = `${result.playerStdout}\n\nAinda não é isso:\n${failed.map((f) => `✗ ${f.description}`).join("\n")}`;
    this.fail();
  }
}
