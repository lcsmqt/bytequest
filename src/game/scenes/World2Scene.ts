import Phaser from "phaser";
import { RoomScene, type Backdrop, type Point } from "./RoomScene";
import forgeMask from "../maps/function-forge.mask.txt?raw";
import { RISE, glow, sparks, summoningCircle, torch } from "../effects";

// World px == backdrop px (1344x1024). Coordinates were read off the Function Forge mockup.
const SPAWN: Point = { x: 660, y: 640 };

/**
 * The Forge — four elemental anvils ("As Quatro Forjas" of the operators world) around a great furnace.
 * Indoor room: no ambient nature, all heat and light (furnace glow, lava embers, hammer sparks, torches).
 */
export class World2Scene extends RoomScene {
  constructor() {
    super({ key: "World2", worldId: "world-2" });
  }

  protected override introLines(): string[] {
    return [
      "Bem-vindo à Forja. Cada bigorna aqui calcula o poder de uma arma de Pyra.",
      "Sem operadores certos, nada soma, compara ou decide direito.",
      "Aproxime-se de uma runa e pressione E (ou Espaço) para interagir.",
    ];
  }

  protected override backdrop(): Backdrop {
    return { key: "function-forge", url: "assets/worlds/function-forge.png", mask: forgeMask, cell: 16 };
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
    return { x: 520, y: 560 }; // near the central furnace, off the anvil row
  }

  protected override stationPositions(): Point[] {
    return [
      { x: 278, y: 620 }, // fire anvil
      { x: 547, y: 620 }, // ice anvil
      { x: 807, y: 620 }, // lightning anvil
    ];
  }

  protected override bossPosition(): Point {
    return { x: 668, y: 505 }; // foot of the great furnace
  }

  protected override bugSpawns(): Point[] {
    return [{ x: 400, y: 740 }, { x: 930, y: 740 }];
  }

  protected override buildDecorations(): void {
    summoningCircle(this, SPAWN.x, SPAWN.y);
    glow(this, 700, 340, 0xff8a20, 6.5, 1500); // furnace mouth
    glow(this, 437, 600, 0xff7a20, 2.2, 1300); // lava channels
    glow(this, 910, 600, 0xff7a20, 2.2, 1100);
    for (const [x, y, tint] of [[270, 520, 0xff6a30], [540, 520, 0x7fd8ff], [800, 520, 0xffe040], [1058, 520, 0xb060ff]] as const) glow(this, x, y, tint, 2, 1800); // anvil sigils
    for (const [x, y] of [[445, 730], [900, 730]] as const) glow(this, x, y, 0x4fc8ff, 2, 2000); // crystal pedestals
    glow(this, 1090, 250, 0x4fc8ff, 3, 2400); // holo tube
    const embers = { ...RISE, frequency: 90, speedY: { min: -80, max: -30 }, lifespan: 1600 };
    sparks(this, new Phaser.Geom.Rectangle(590, 300, 220, 80), 0xff9a30, embers); // furnace embers
    sparks(this, new Phaser.Geom.Rectangle(420, 580, 40, 50), 0xff8a30, embers); // lava embers
    sparks(this, new Phaser.Geom.Rectangle(890, 580, 40, 50), 0xff8a30, embers);
    sparks(this, new Phaser.Geom.Rectangle(395, 350, 30, 20), 0xffe080, { speed: { min: 40, max: 110 }, angle: { min: 200, max: 340 }, lifespan: 500, frequency: 260, scale: { start: 1.6, end: 0 } }); // smith's hammer
    for (const [x, y] of [[195, 75], [1150, 75], [438, 215], [905, 220], [80, 375], [1258, 375], [508, 905], [838, 905]] as const) torch(this, x, y);
  }
}
