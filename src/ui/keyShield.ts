/**
 * Phaser registers Space / E / arrow keys as *captured* on `window` (it calls preventDefault on them), which
 * silently eats those characters in any DOM input above the canvas — the Python editor could not type a space.
 * Stopping keydown at the overlay keeps typed keys away from the game entirely. keyup is left alone on
 * purpose: a key held while the overlay opened must still be released inside Phaser.
 */
export function shieldGameKeys(el: HTMLElement): void {
  el.addEventListener("keydown", (e) => e.stopPropagation());
}
