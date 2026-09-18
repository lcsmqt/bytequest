import { xpToNextLevel } from "@/education/progress";
import type { SaveData } from "@/types/save";

export class Hud {
  private root: HTMLDivElement;
  private levelEl: HTMLSpanElement;
  private barFill: HTMLDivElement;
  private xpEl: HTMLSpanElement;

  constructor(parent: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "bq-hud";
    this.root.innerHTML = `
      <span data-role="level">Nv. 1</span>
      <div class="bq-hud__bar"><div class="bq-hud__bar-fill" data-role="fill"></div></div>
      <span data-role="xp">0/100 XP</span>
    `;
    parent.appendChild(this.root);
    this.levelEl = this.root.querySelector('[data-role="level"]')!;
    this.barFill = this.root.querySelector('[data-role="fill"]')!;
    this.xpEl = this.root.querySelector('[data-role="xp"]')!;
  }

  update(save: SaveData): void {
    const { current, needed } = xpToNextLevel(save.xp);
    this.levelEl.textContent = `Nv. ${save.level}`;
    this.xpEl.textContent = `${current}/${needed} XP`;
    this.barFill.style.width = `${Math.min(100, (current / needed) * 100)}%`;
  }
}
