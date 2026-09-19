import Phaser from "phaser";
import { RoomScene, type Backdrop, type Point } from "./RoomScene";
import { NPC_SHEETS } from "../sprites";
import cavesMask from "../maps/caves-of-condition.mask.txt?raw";
import { RISE, glow, mist, sparks, summoningCircle, torch } from "../effects";

// World px == backdrop px (1344x1024). Coordinates were read off the Caves of Condition mockup.
const SPAWN: Point = { x: 278, y: 470 };

/**
 * Caves of Condition — the IF (green) and ELSE (red) gates, chasm bridges and the serpent shrine.
 * Same recipe as Variable Valley: mockup backdrop + generated collision mask + Phaser ambience.
 */
export class World3Scene extends RoomScene {
  constructor() {
    super({ key: "World3", worldId: "world-3" });
  }

  protected override introLines(): string[] {
    return [
      "Bem-vindo às Cavernas da Condição.",
      "A Encruzilhada das Decisões escolhe caminhos o tempo todo: se a resposta for verdadeira, o portão verde abre — senão, o vermelho.",
      "Aproxime-se de uma runa e pressione E (ou Espaço) para interagir.",
    ];
  }

  protected override backdrop(): Backdrop {
    return { key: "caves-of-condition", url: "assets/worlds/caves-of-condition.png", mask: cavesMask, cell: 16 };
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

  protected override stationPositions(): Point[] {
    return [
      { x: 250, y: 290 }, // path below the green IF gate
      { x: 520, y: 445 }, // green "0" platform
      { x: 830, y: 435 }, // red "0" platform
    ];
  }

  protected override pyronPosition(): Point {
    return { x: 150, y: 540 }; // away from spawn — the default offset was inside interact range
  }

  protected override bossPosition(): Point {
    return { x: 690, y: 215 }; // serpent shrine
  }

  protected override bugSpawns(): Point[] {
    return [{ x: 700, y: 680 }, { x: 960, y: 690 }];
  }

  protected override buildDecorations(): void {
    summoningCircle(this, SPAWN.x, SPAWN.y);
    glow(this, 250, 160, 0x30ff70, 3.2, 2000); // IF gate
    glow(this, 1085, 160, 0xff4040, 3.2, 1700); // ELSE gate
    glow(this, 675, 495, 0xffd24c, 2.4, 2400); // floating python platform
    sparks(this, new Phaser.Geom.Rectangle(1255, 30, 75, 340), 0xff8a30, { ...RISE, frequency: 110, speedY: { min: -70, max: -25 } }); // lava embers
    sparks(
      this,
      [[15, 180], [160, 290], [20, 510], [360, 600], [270, 680], [110, 790], [415, 935], [490, 905], [535, 150], [840, 150], [985, 610], [1060, 640], [915, 935]].map(([x, y]) => ({ x, y })),
      0x66ddff,
      { ...RISE, frequency: 180 },
    ); // crystal shimmer
    mist(this, new Phaser.Geom.Rectangle(560, 760, 240, 200), 0x4fa0ff, 0.25); // chasm mist
    mist(this, new Phaser.Geom.Rectangle(450, 60, 70, 160), 0x9ad8ff, 0.25); // waterfall spray
    for (const [x, y] of [[130, 205], [357, 205], [975, 205], [1205, 205], [65, 495], [360, 740], [1112, 495], [995, 850], [1183, 880]] as const) torch(this, x, y);
    this.spawnNpc({ at: { x: 415, y: 440 }, sheet: NPC_SHEETS.boolean, name: "Sir Boolean", lines: [
        "Sou Sir Boolean, guardião dos portões. Toda pergunta tem só duas respostas: True ou False.",
        "Se a condição for verdadeira, o portão verde se abre. Se for falsa, o vermelho. Nunca os dois!",
      ], roam: 60 });
  }
}
