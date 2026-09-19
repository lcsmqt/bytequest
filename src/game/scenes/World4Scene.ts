import Phaser from "phaser";
import { RoomScene, type Backdrop, type Point } from "./RoomScene";
import { NPC_SHEETS } from "../sprites";
import forestMask from "../maps/forest-of-loops.mask.txt?raw";
import { DRIFT, GLINT, glow, mist, sparks, summoningCircle } from "../effects";

// World px == backdrop px (1344x1024). Coordinates were read off the Forest of Loops mockup.
const SPAWN: Point = { x: 441, y: 523 };

/**
 * Forest of Loops — a spiral trail winding round a runestone grove, ending at the swirling portal.
 * The spiral is the level design: walking the path *is* the loop.
 */
export class World4Scene extends RoomScene {
  constructor() {
    super({ key: "World4", worldId: "world-4" });
  }

  protected override introLines(): string[] {
    return [
      "A Floresta dos Loops repete padrões sem parar.",
      "Alguns desses padrões nunca deveriam ter sido infinitos.",
      "Aproxime-se de uma runa e pressione E (ou Espaço) para interagir.",
    ];
  }

  protected override backdrop(): Backdrop {
    return { key: "forest-of-loops", url: "assets/worlds/forest-of-loops.png", mask: forestMask, cell: 16 };
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
    return { x: 300, y: 560 }; // trail fork, clear of Loopus and outside interact range from spawn
  }

  protected override stationPositions(): Point[] {
    return [
      { x: 560, y: 620 }, // grove of runestones
      { x: 1090, y: 920 }, // riverside trail, south-east
      { x: 1060, y: 240 }, // north-east spiral
    ];
  }

  protected override bossPosition(): Point {
    return { x: 650, y: 262 }; // foot of the portal steps
  }

  protected override bugSpawns(): Point[] {
    return [{ x: 700, y: 650 }, { x: 888, y: 570 }];
  }

  protected override buildDecorations(): void {
    summoningCircle(this, SPAWN.x, SPAWN.y);
    this.buildPortal();
    // runestones pulse cyan, each on its own beat
    [[566, 500], [770, 542], [585, 566], [450, 302], [849, 311], [1128, 801], [1300, 783], [1234, 57], [176, 494]].forEach(([x, y], i) =>
      glow(this, x, y, 0x4fd8ff, 1.5, 1500 + i * 190),
    );
    glow(this, 270, 810, 0xffc060, 1.6, 900); // lantern
    for (const [x, y, w, h] of [[235, 10, 60, 80], [245, 640, 50, 90], [1300, 340, 40, 60], [1200, 960, 60, 50]]) mist(this, new Phaser.Geom.Rectangle(x, y, w, h), 0xcff4ff, 0.3);
    for (const rect of [new Phaser.Geom.Rectangle(200, 180, 110, 320), new Phaser.Geom.Rectangle(1050, 390, 100, 180), new Phaser.Geom.Rectangle(1100, 600, 150, 380), new Phaser.Geom.Rectangle(740, 880, 120, 60)]) {
      sparks(this, rect, 0xffffff, GLINT);
    }
    for (const rect of [new Phaser.Geom.Rectangle(450, 400, 420, 300), new Phaser.Geom.Rectangle(0, 300, 300, 200), new Phaser.Geom.Rectangle(1000, 60, 260, 240)]) {
      sparks(this, rect, 0xd8ff7a, DRIFT); // pollen / fireflies
    }
    this.spawnNpc({ at: { x: 325, y: 445 }, sheet: NPC_SHEETS.loopus, name: "Loopus", lines: [
        "Sou Loopus, guardião desta floresta. Aqui a natureza se repete e a vida evolui — é a beleza dos loops.",
        "Um for percorre o que você já conhece. Um while continua até a condição mudar. Cuidado: sem mudança, ele nunca termina!",
      ], roam: 80 });
  }

  /** A cyan spiral turning over the portal mouth: the mockup's swirl, animated. */
  private buildPortal(): void {
    const x = 661;
    const y = 146;
    glow(this, x, y, 0x40b0ff, 5, 1800);
    const g = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    g.lineStyle(3, 0x9ff4ff, 0.9);
    g.beginPath();
    for (let t = 0; t <= Math.PI * 5; t += 0.15) g.lineTo(Math.cos(t) * t * 3, Math.sin(t) * t * 3);
    g.strokePath();
    const spiral = this.add.container(x, y, [g]);
    this.tweens.add({ targets: spiral, angle: 360, duration: 5000, repeat: -1 });
    sparks(this, new Phaser.Geom.Rectangle(x - 40, y - 10, 80, 90), 0x80f0ff, { speedY: { min: -30, max: -10 }, lifespan: 1600, frequency: 150, scale: { start: 1.6, end: 0 } });
  }
}
