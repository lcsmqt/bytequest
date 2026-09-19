import { gameState } from "@/game/systems/GameState";

/** Sync save settings to CSS/DOM (font scale is a CSS variable; motion is read live via reduceMotion()). */
export function applySettings(): void {
  document.documentElement.style.setProperty("--bq-font-scale", String(gameState.current.settings.fontScale));
}

export function updateSettings(patch: Partial<typeof gameState.current.settings>): void {
  Object.assign(gameState.current.settings, patch);
  applySettings();
  gameState.persist();
}
