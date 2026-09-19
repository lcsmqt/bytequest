import Phaser from "phaser";
import { RoomScene, type Backdrop, type Point } from "./RoomScene";
import { NPC_SHEETS } from "../sprites";
import valleyMask from "../maps/variable-valley.mask.txt?raw";
import { DRIFT, GLINT, RISE, glow, mist, sparks, summoningCircle, torch } from "../effects";

// World px == backdrop px (1344x1024, 42x32 tiles). Coordinates below were read off the mockup.
const SPAWN: Point = { x: 566, y: 540 };

/**
 * Variable Valley — the mockup (Imagens/) is the backdrop; collisions come from an auto-generated
 * mask (scripts/gen_mask.py). Everything alive here (glows, mist, fireflies, spawn circle) is
 * Phaser effects layered on the static art.
 */
export class World1Scene extends RoomScene {
  constructor() {
    super({ key: "World1", worldId: "world-1" });
  }

  protected override introLines(): string[] {
    return [
      "Bem-vindo ao Vale das Variáveis.",
      "Os cristais daqui esqueceram os valores que guardavam.",
      "Aproxime-se de uma runa e pressione E (ou Espaço) para interagir.",
    ];
  }

  protected override backdrop(): Backdrop {
    return { key: "variable-valley", url: "assets/worlds/variable-valley.png", mask: valleyMask, cell: 16 };
  }

  protected override roomSize(): { w: number; h: number } {
    return { w: 42, h: 32 };
  }

  protected override worldScale(): number {
    return 2.2;
  }

  protected override cameraZoom(): number {
    return 1;
  }

  protected override spawnPoint(): Point {
    return SPAWN;
  }

  protected override pyronPosition(): Point {
    return { x: 720, y: 520 }; // overlook near the bridge, away from spawn
  }

  protected override stationPositions(): Point[] {
    return [
      { x: 340, y: 240 }, // int crystal plateau
      { x: 465, y: 265 }, // below the float plateau
      { x: 940, y: 340 }, // string crystal plateau
    ];
  }

  protected override bossPosition(): Point {
    return { x: 1170, y: 270 }; // foot of the cave stairs
  }

  protected override bugSpawns(): Point[] {
    return [{ x: 840, y: 560 }, { x: 1048, y: 424 }];
  }

  protected override buildDecorations(): void {
    summoningCircle(this, SPAWN.x, SPAWN.y);
    this.buildCrystals();
    this.buildWater();
    for (const rect of [new Phaser.Geom.Rectangle(0, 780, 330, 244), new Phaser.Geom.Rectangle(960, 760, 384, 264), new Phaser.Geom.Rectangle(820, 300, 160, 120)]) {
      sparks(this, rect, 0xe8ff7a, DRIFT); // fireflies in the woods
    }
    for (const [x, y] of [[1115, 115], [1222, 125]] as const) torch(this, x, y);
    this.spawnNpc({ at: { x: 1100, y: 695 }, sheet: NPC_SHEETS.lyra, name: "Lyra", lines: [
        "Sou Lyra, guardiã dos cristais do Vale. Cada um guarda um tipo de dado: int, float, string e bool.",
        "Os cristais esqueceram seus valores. Decifre as runas e devolva a memória a eles!",
      ], roam: 70 });
  }

  /** int / float / string / bool crystals pulse and shed sparks in their own colour. */
  private buildCrystals(): void {
    const crystals: [number, number, number][] = [
      [232, 150, 0xff5c8a],
      [585, 85, 0x4f9dff],
      [1010, 215, 0x5cff7a],
      [1125, 600, 0xb15cff],
    ];
    crystals.forEach(([x, y, tint], i) => {
      glow(this, x, y, tint, 2.6, 1600 + i * 250);
      sparks(this, new Phaser.Geom.Rectangle(x - 26, y + 20, 52, 1), tint, RISE);
    });
  }

  /** Waterfall spray + light glints on the rivers. */
  private buildWater(): void {
    for (const [x, y, w, h] of [[735, 110, 70, 60], [560, 320, 70, 40], [145, 715, 70, 40]]) mist(this, new Phaser.Geom.Rectangle(x, y, w, h));
    for (const rect of [new Phaser.Geom.Rectangle(440, 780, 420, 220), new Phaser.Geom.Rectangle(740, 180, 110, 170)]) sparks(this, rect, 0xffffff, GLINT);
  }
}
