// Canonical speaker portraits — cropped from the BYTEQUEST reference art (see Imagens/).
// Unknown speakers (future NPCs without art yet) simply render without a portrait.
const PORTRAITS: Record<string, string> = {
  Byte: "assets/characters/byte.png",
  "Master Pyron": "assets/characters/pyron.png",
  Pip: "assets/characters/pip.png",
  Lyra: "assets/characters/lyra.png",
  "Sir Boolean": "assets/characters/sir-boolean.png",
  Loopus: "assets/characters/loopus.png",
  "Syntax Slime": "assets/enemies/slime-portrait.png",
  "Null Wraith": "assets/enemies/wraith-portrait.png",
  "Logic Imp": "assets/enemies/imp-portrait.png",
  "Exception Bat": "assets/enemies/bat-portrait.png",
  "Index Goblin": "assets/enemies/goblin-portrait.png",
};

import { reduceMotion } from "@/motion";

const CHAR_MS = 16;

export class DialogueBox {
  private root: HTMLDivElement;
  private speakerEl: HTMLParagraphElement;
  private textEl: HTMLParagraphElement;
  private portraitEl: HTMLImageElement;
  private lines: string[] = [];
  private index = 0;
  private onDone: (() => void) | null = null;
  private typer: number | null = null;
  private full = "";

  constructor(parent: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "bq-dialogue";
    this.root.innerHTML = `
      <img class="bq-dialogue__portrait" data-role="portrait" alt="" />
      <div class="bq-dialogue__body">
        <p class="bq-dialogue__speaker" data-role="speaker"></p>
        <p class="bq-dialogue__text" data-role="text"></p>
        <p class="bq-dialogue__hint">Espaço / clique para continuar</p>
      </div>
    `;
    parent.appendChild(this.root);
    this.speakerEl = this.root.querySelector('[data-role="speaker"]')!;
    this.textEl = this.root.querySelector('[data-role="text"]')!;
    this.portraitEl = this.root.querySelector('[data-role="portrait"]')!;
    this.root.addEventListener("click", () => this.advance());
  }

  get isOpen(): boolean {
    return this.root.classList.contains("open");
  }

  say(speaker: string, lines: string[], onDone?: () => void): void {
    this.lines = lines;
    this.index = 0;
    this.onDone = onDone ?? null;
    this.speakerEl.textContent = speaker;
    const portrait = PORTRAITS[speaker];
    this.portraitEl.classList.toggle("hidden", !portrait);
    if (portrait) this.portraitEl.src = portrait;
    this.root.classList.add("open");
    this.render();
  }

  /** First press completes the line being typed; the next one moves on. */
  advance(): void {
    if (!this.isOpen) return;
    if (this.typer !== null) {
      this.finishTyping();
      return;
    }
    this.index += 1;
    if (this.index >= this.lines.length) {
      this.root.classList.remove("open");
      this.portraitEl.classList.remove("talking");
      this.onDone?.();
      return;
    }
    this.render();
  }

  private finishTyping(): void {
    if (this.typer !== null) window.clearInterval(this.typer);
    this.typer = null;
    this.textEl.textContent = this.full;
    this.portraitEl.classList.remove("talking");
  }

  private render(): void {
    this.full = this.lines[this.index] ?? "";
    if (this.typer !== null) window.clearInterval(this.typer);
    this.typer = null;
    if (reduceMotion() || this.full.length < 2) {
      this.portraitEl.classList.remove("talking");
      this.textEl.textContent = this.full;
      return;
    }
    let n = 0;
    this.textEl.textContent = "";
    this.portraitEl.classList.add("talking"); // the portrait bobs while the line is being spoken
    this.typer = window.setInterval(() => {
      n += 1;
      this.textEl.textContent = this.full.slice(0, n);
      if (n >= this.full.length) this.finishTyping();
    }, CHAR_MS);
  }
}
