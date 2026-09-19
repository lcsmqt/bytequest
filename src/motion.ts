import { gameState } from "@/game/systems/GameState";

/** Honour the player's "reduzir movimento" setting and the OS-level preference: no shakes, flashes or typewriter. */
export function reduceMotion(): boolean {
  try {
    return gameState.current.settings.reduceMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}
