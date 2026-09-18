import Phaser from "phaser";

const TILE = 32;

/** Draws every placeholder sprite procedurally — no external art assets for the MVP. */
function drawTexture(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void): void {
  const g = scene.add.graphics();
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  create(): void {
    drawTexture(this, "floor", TILE, TILE, (g) => {
      g.fillStyle(0x141c2b, 1).fillRect(0, 0, TILE, TILE);
      g.lineStyle(1, 0x1c2740, 1).strokeRect(0, 0, TILE, TILE);
    });

    drawTexture(this, "wall", TILE, TILE, (g) => {
      g.fillStyle(0x0a0e17, 1).fillRect(0, 0, TILE, TILE);
      g.fillStyle(0x2c3a55, 1).fillRect(0, 0, TILE, 4);
    });

    drawTexture(this, "player", 24, 32, (g) => {
      g.fillStyle(0x3ee08c, 1).fillRoundedRect(0, 0, 24, 32, 4);
      g.fillStyle(0x06130b, 1).fillRect(6, 10, 4, 4).fillRect(14, 10, 4, 4);
    });

    drawTexture(this, "byte", 20, 20, (g) => {
      g.fillStyle(0xffd24c, 1).fillCircle(10, 10, 9);
      g.fillStyle(0x06130b, 1).fillCircle(6, 9, 2).fillCircle(14, 9, 2);
    });

    for (const [key, color] of [
      ["terminal-locked", 0x2c3a55],
      ["terminal-active", 0x3ee08c],
      ["terminal-done", 0x6a7891],
    ] as const) {
      drawTexture(this, key, 28, 36, (g) => {
        g.fillStyle(0x0d1420, 1).fillRoundedRect(0, 0, 28, 36, 3);
        g.lineStyle(2, color, 1).strokeRoundedRect(0, 0, 28, 36, 3);
        g.fillStyle(color, 1).fillRect(4, 6, 20, 14);
      });
    }

    drawTexture(this, "boss-gate", 64, 80, (g) => {
      g.fillStyle(0x1a0f14, 1).fillRoundedRect(0, 0, 64, 80, 4);
      g.lineStyle(3, 0xff5c5c, 1).strokeRoundedRect(0, 0, 64, 80, 4);
    });

    this.scene.start("Menu");
  }
}

export const TILE_SIZE = TILE;
