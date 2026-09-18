import type { Challenge } from "@/types/curriculum";
import { PyodideRunner } from "@/python/pyodideRunner";
import { validateChallenge } from "@/education/validator";
import { initialHintState, nextHint, type HintState } from "@/education/hints";

export interface TerminalOutcome {
  hintsUsed: number;
  attempts: number;
}

export class TerminalPanel {
  private root: HTMLDivElement;
  private editor: HTMLTextAreaElement;
  private output: HTMLDivElement;
  private hintBox: HTMLDivElement;
  private storyBox: HTMLDivElement;
  private instructionsBox: HTMLDivElement;
  private titleBox: HTMLSpanElement;
  private runner = new PyodideRunner();
  private hintState: HintState = initialHintState();
  private attempts = 0;
  private hintsUsedCount = 0;
  private onComplete: ((outcome: TerminalOutcome) => void) | null = null;
  private currentChallenge: Challenge | null = null;

  constructor(parent: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "bq-terminal";
    this.root.innerHTML = `
      <div class="bq-terminal__pane">
        <div class="bq-terminal__header">
          <span data-role="title">Missão</span>
          <button class="bq-close" data-action="close" aria-label="Fechar terminal">✕</button>
        </div>
        <div class="bq-terminal__story" data-role="story"></div>
        <div class="bq-terminal__instructions" data-role="instructions"></div>
        <div class="bq-hint-list" data-role="hint"></div>
      </div>
      <div class="bq-terminal__pane">
        <div class="bq-terminal__header"><span>Terminal Python</span></div>
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

    this.root.querySelector('[data-action="close"]')!.addEventListener("click", () => this.close());
    this.root.querySelector('[data-action="run"]')!.addEventListener("click", () => void this.runCode());
    this.root.querySelector('[data-action="hint"]')!.addEventListener("click", () => this.showHint());
    this.editor.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.key === "Enter") void this.runCode();
    });
  }

  open(title: string, story: string, challenge: Challenge, onComplete: (outcome: TerminalOutcome) => void): void {
    this.titleBox.textContent = title;
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
    this.currentChallenge = challenge;
    this.root.classList.add("open");
    void this.runner.warmUp((text) => (this.output.textContent = text));
    this.editor.focus();
  }

  close(): void {
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

  private async runCode(): Promise<void> {
    if (!this.currentChallenge) return;
    this.attempts += 1;
    this.output.className = "bq-terminal__output";
    this.output.textContent = "Executando...";

    const result = await validateChallenge(this.runner, this.currentChallenge, this.editor.value);

    if (result.timedOut) {
      this.output.className = "bq-terminal__output error";
      this.output.textContent = "Execução interrompida: possível loop infinito. Revise seu código.";
      return;
    }
    if (result.runtimeError) {
      this.output.className = "bq-terminal__output error";
      this.output.textContent = `${result.playerStdout ? result.playerStdout + "\n\n" : ""}${result.runtimeError.friendly}\n\n${result.runtimeError.raw}`;
      return;
    }
    if (result.allPassed) {
      this.output.className = "bq-terminal__output success";
      this.output.textContent = `${result.playerStdout}\n\n✔ ${this.currentChallenge.successMessage}`;
      this.onComplete?.({ hintsUsed: this.hintsUsedCount, attempts: this.attempts });
      return;
    }
    const failed = result.results.filter((r) => !r.passed);
    this.output.className = "bq-terminal__output error";
    this.output.textContent = `${result.playerStdout}\n\nAinda não é isso:\n${failed
      .map((f) => `✗ ${f.description}`)
      .join("\n")}`;
  }
}
