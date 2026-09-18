export class DialogueBox {
  private root: HTMLDivElement;
  private speakerEl: HTMLParagraphElement;
  private textEl: HTMLParagraphElement;
  private lines: string[] = [];
  private index = 0;
  private onDone: (() => void) | null = null;

  constructor(parent: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "bq-dialogue";
    this.root.innerHTML = `
      <p class="bq-dialogue__speaker" data-role="speaker"></p>
      <p class="bq-dialogue__text" data-role="text"></p>
      <p class="bq-dialogue__hint">Espaço / clique para continuar</p>
    `;
    parent.appendChild(this.root);
    this.speakerEl = this.root.querySelector('[data-role="speaker"]')!;
    this.textEl = this.root.querySelector('[data-role="text"]')!;
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
    this.root.classList.add("open");
    this.render();
  }

  advance(): void {
    if (!this.isOpen) return;
    this.index += 1;
    if (this.index >= this.lines.length) {
      this.root.classList.remove("open");
      this.onDone?.();
      return;
    }
    this.render();
  }

  private render(): void {
    this.textEl.textContent = this.lines[this.index] ?? "";
  }
}
