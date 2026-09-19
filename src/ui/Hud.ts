import { xpToNextLevel } from "@/education/progress";
import type { SaveData } from "@/types/save";

export class Hud {
  private root: HTMLDivElement;
  private levelEl: HTMLSpanElement;
  private barFill: HTMLDivElement;
  private xpEl: HTMLSpanElement;
  private mapBtn: HTMLButtonElement;
  private settingsBtn: HTMLButtonElement;

  constructor(parent: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "bq-hud";
    this.root.innerHTML = `
      <span data-role="level">Nv. 1</span>
      <div class="bq-hud__bar"><div class="bq-hud__bar-fill" data-role="fill"></div></div>
      <span data-role="xp">0/100 XP</span>
      <button class="bq-hud__map" data-action="map" hidden>Mapa (M)</button>
      <button class="bq-hud__settings" data-action="settings" aria-label="Configurações">⚙</button>
    `;
    parent.appendChild(this.root);
    this.levelEl = this.root.querySelector('[data-role="level"]')!;
    this.barFill = this.root.querySelector('[data-role="fill"]')!;
    this.xpEl = this.root.querySelector('[data-role="xp"]')!;
    this.mapBtn = this.root.querySelector('[data-action="map"]')!;
    this.settingsBtn = this.root.querySelector('[data-action="settings"]')!;
  }

  setSettingsHandler(open: (() => void) | null): void {
    this.settingsBtn.onclick = open ? () => open() : null;
  }

  /** Shows the "Mapa" button wired to `open`, or hides it for scenes where it makes no sense (null). */
  setMapHandler(open: (() => void) | null): void {
    this.mapBtn.hidden = !open;
    this.mapBtn.onclick = open ? () => open() : null;
  }

  show(): void {
    this.root.classList.add("visible");
  }

  private lastLevel = 0;

  update(save: SaveData): void {
    const { current, needed } = xpToNextLevel(save.xp);
    if (this.lastLevel && save.level > this.lastLevel) {
      this.root.classList.remove("levelup");
      void this.root.offsetWidth; // restart the animation
      this.root.classList.add("levelup");
    }
    this.lastLevel = save.level;
    this.levelEl.textContent = `Nv. ${save.level}`;
    this.xpEl.textContent = `${current}/${needed} XP`;
    this.barFill.style.width = `${Math.min(100, (current / needed) * 100)}%`;
  }
}
