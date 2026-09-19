import { gameState } from "@/game/systems/GameState";
import { updateSettings } from "./settings";
import { shieldGameKeys } from "./keyShield";

const GAME_ROOT_ID = "game-root";

export class SettingsPanel {
  private root: HTMLDivElement;
  private motionToggle: HTMLInputElement;
  private fontSelect: HTMLSelectElement;

  constructor(parent: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "bq-modal bq-settings";
    this.root.tabIndex = -1;
    this.root.innerHTML = `
      <div class="bq-modal__box" role="dialog" aria-labelledby="bq-settings-title">
        <h2 id="bq-settings-title" class="bq-settings__title">Configurações</h2>
        <label class="bq-settings__row">
          <span>Reduzir movimento</span>
          <input type="checkbox" data-role="motion" />
        </label>
        <label class="bq-settings__row">
          <span>Tamanho da fonte</span>
          <select data-role="font">
            <option value="0.85">Pequena</option>
            <option value="1">Normal</option>
            <option value="1.15">Grande</option>
            <option value="1.3">Extra grande</option>
          </select>
        </label>
        <div class="bq-settings__actions">
          <button class="bq-btn bq-btn--primary" data-action="close">Fechar</button>
        </div>
      </div>
    `;
    parent.appendChild(this.root);
    shieldGameKeys(this.root);
    this.motionToggle = this.root.querySelector('[data-role="motion"]')!;
    this.fontSelect = this.root.querySelector('[data-role="font"]')!;
    this.motionToggle.addEventListener("change", () => updateSettings({ reduceMotion: this.motionToggle.checked }));
    this.fontSelect.addEventListener("change", () => updateSettings({ fontScale: Number(this.fontSelect.value) }));
    this.root.querySelector('[data-action="close"]')!.addEventListener("click", (e) => this.dismiss(e));
    this.root.addEventListener("click", (e) => {
      if (e.target === this.root) this.dismiss(e);
    });
    this.root.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        this.close();
      }
    });
  }

  get isOpen(): boolean {
    return this.root.classList.contains("open");
  }

  open(): void {
    this.motionToggle.checked = gameState.current.settings.reduceMotion;
    this.fontSelect.value = String(gameState.current.settings.fontScale);
    this.root.classList.add("open");
    document.getElementById(GAME_ROOT_ID)?.style.setProperty("pointer-events", "none");
    this.motionToggle.focus();
  }

  /** Stop the click from falling through to the Phaser menu under the modal. */
  private dismiss(e: Event): void {
    e.preventDefault();
    e.stopPropagation();
    this.close();
  }

  close(): void {
    if (!this.isOpen) return;
    this.root.classList.remove("open");
    // Re-enable the canvas after this click/key event finishes — otherwise the same
    // pointer release can hit "Configurações" underneath and reopen the panel.
    requestAnimationFrame(() => document.getElementById(GAME_ROOT_ID)?.style.removeProperty("pointer-events"));
  }
}
