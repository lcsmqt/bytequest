import Phaser from "phaser";
import { BYTE, PIP, registerAnims } from "../sprites";
import npcSizes from "../npcSheets.json";
import enemySizes from "../enemySheets.json";

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

  preload(): void {
    // Canonical BYTEQUEST reference art (see Imagens/) — cropped + chroma-keyed once into
    // public/assets/characters. Procedural placeholders below stay for tiles/props with no
    // reference art yet.
    this.load.image("byte", "assets/characters/byte.png");
    this.load.image("pyron", "assets/characters/pyron.png");
    this.load.image("pip", "assets/characters/pip.png");
    // Animation sheets (idle/walk/cast/hurt/victory + Pip moods) cut from the reference sheets.
    this.load.spritesheet("byte-sheet", "assets/characters/byte-sheet.png", { frameWidth: BYTE.w, frameHeight: BYTE.h });
    for (const [name, size] of Object.entries(enemySizes)) {
      this.load.spritesheet(`enemy-${name}`, `assets/enemies/${name}-sheet.png`, { frameWidth: size.w, frameHeight: size.h });
    }
    for (const [name, size] of Object.entries(npcSizes)) {
      this.load.spritesheet(`${name}-sheet`, `assets/characters/${name}-sheet.png`, { frameWidth: size.w, frameHeight: size.h });
    }
    this.load.spritesheet("pip-sheet", "assets/characters/pip-sheet.png", { frameWidth: PIP.w, frameHeight: PIP.h });
    for (const name of ["lyra", "sir-boolean", "loopus"]) this.load.image(name, `assets/characters/${name}.png`);
  }

  create(): void {
    // Character art is downscaled at runtime: smooth filtering there (backdrops stay nearest-neighbour).
    for (const key of ["byte-sheet", "pip-sheet", ...Object.keys(npcSizes).map((n) => `${n}-sheet`), ...Object.keys(enemySizes).map((n) => `enemy-${n}`)]) this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    registerAnims(this);
    drawTexture(this, "floor", TILE, TILE, (g) => {
      g.fillStyle(0x141c2b, 1).fillRect(0, 0, TILE, TILE);
      g.lineStyle(1, 0x1c2740, 1).strokeRect(0, 0, TILE, TILE);
    });

    drawTexture(this, "wall", TILE, TILE, (g) => {
      g.fillStyle(0x0a0e17, 1).fillRect(0, 0, TILE, TILE);
      g.fillStyle(0x2c3a55, 1).fillRect(0, 0, TILE, 4);
    });

    // Rune monoliths replace the old terminals: locked = dormant slate, active = cyan, done = gold (deciphered).
    for (const [key, color] of [
      ["rune-locked", 0x2c3a55],
      ["rune-active", 0x4fd8ff],
      ["rune-done", 0xffd24c],
    ] as const) {
      drawTexture(this, key, 28, 44, (g) => {
        g.fillStyle(0x131b2b, 1).fillRoundedRect(1, 1, 26, 42, { tl: 12, tr: 12, bl: 2, br: 2 });
        g.lineStyle(2, color, 1).strokeRoundedRect(1, 1, 26, 42, { tl: 12, tr: 12, bl: 2, br: 2 });
        g.lineStyle(2, color, 1).lineBetween(11, 12, 11, 34).lineBetween(11, 12, 19, 18).lineBetween(19, 18, 11, 24).lineBetween(11, 24, 19, 32);
      });
    }

    // Effect textures: soft radial glow (additive) and a tiny spark for particle emitters.
    drawTexture(this, "glow", 64, 64, (g) => {
      for (let r = 32; r > 0; r -= 4) g.fillStyle(0xffffff, 0.05).fillCircle(32, 32, r);
    });
    drawTexture(this, "spark", 4, 4, (g) => {
      g.fillStyle(0xffffff, 1).fillCircle(2, 2, 2);
    });

    // Boss variant for illustrated (backdrop) worlds: a larger crimson monolith instead of a plain gate.
    drawTexture(this, "boss-rune", 36, 56, (g) => {
      g.fillStyle(0x1a0f14, 1).fillRoundedRect(1, 1, 34, 54, { tl: 16, tr: 16, bl: 2, br: 2 });
      g.lineStyle(2, 0xff5c5c, 1).strokeRoundedRect(1, 1, 34, 54, { tl: 16, tr: 16, bl: 2, br: 2 });
      g.lineStyle(3, 0xff5c5c, 1).lineBetween(13, 16, 13, 42).lineBetween(13, 16, 24, 22).lineBetween(24, 22, 13, 30).lineBetween(13, 30, 24, 42);
    });

    drawTexture(this, "boss-gate", 64, 80, (g) => {
      g.fillStyle(0x1a0f14, 1).fillRoundedRect(0, 0, 64, 80, 4);
      g.lineStyle(3, 0xff5c5c, 1).strokeRoundedRect(0, 0, 64, 80, 4);
    });

    this.scene.start("Menu");
  }
}

export const TILE_SIZE = TILE;
