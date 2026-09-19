import Phaser from "phaser";
import { RoomScene, type Backdrop, type Point } from "./RoomScene";
import academyMask from "../maps/academy.mask.txt?raw";
import { NPC_SHEETS } from "../sprites";
import { DRIFT, GLINT, RISE, glow, mist, sparks, summoningCircle, torch } from "../effects";

// World px == backdrop px (1344x1024). Coordinates were read off the Academy of Python mockup.
const SPAWN: Point = { x: 680, y: 930 };

/**
 * Academy of Python courtyard — the first world. The serpent fountain plaza leads up the steps to the sealed
 * academy door (the boss rune); the three lesson runes stand on the plaza. Same recipe as the other worlds:
 * mockup backdrop + rect-built collision mask + Phaser ambience + animated apprentices.
 */
export class World0Scene extends RoomScene {
  constructor() {
    super({ key: "World0", worldId: "world-0" });
  }

  protected override introLines(): string[] {
    return [
      "As runas da Academia já foram capazes de conversar com qualquer pessoa em Pyra.",
      "Agora estão apagadas, presas numa língua que ninguém mais entende.",
      "Aproxime-se de uma runa na praça e pressione E (ou Espaço) para interagir.",
    ];
  }

  protected override backdrop(): Backdrop {
    return { key: "academy", url: "assets/worlds/academy.png", mask: academyMask, cell: 16 };
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
    return { x: 520, y: 920 }; // > interact range from spawn so Space does not re-trigger Pyron
  }

  protected override stationPositions(): Point[] {
    return [
      { x: 680, y: 800 }, // south of the fountain, between the blue lamps
      { x: 500, y: 470 }, // left of the fountain
      { x: 835, y: 470 }, // right of the fountain
    ];
  }

  protected override bossPosition(): Point {
    return { x: 675, y: 335 }; // the academy steps: the sealed door
  }

  protected override bugSpawns(): Point[] {
    return [{ x: 650, y: 680 }, { x: 860, y: 590 }];
  }

  protected override buildDecorations(): void {
    summoningCircle(this, SPAWN.x, SPAWN.y);

    // serpent fountain
    glow(this, 690, 560, 0x4fd8ff, 3.2, 2200);
    sparks(this, new Phaser.Geom.Rectangle(600, 520, 170, 110), 0xffffff, GLINT);
    sparks(this, new Phaser.Geom.Rectangle(676, 465, 24, 20), 0x9fe8ff, { ...RISE, frequency: 120 });

    // blue spirit-flame lamps
    for (const [x, y] of [[415, 545], [930, 545], [570, 780], [775, 780]] as const) glow(this, x, y, 0x4fd8ff, 2, 1400 + x);
    // sealed door: cyan runes pulse; torches flicker either side
    glow(this, 680, 200, 0x4fd8ff, 4.5, 2000);
    sparks(this, new Phaser.Geom.Rectangle(640, 200, 80, 80), 0x7fe8ff, RISE);
    for (const [x, y] of [[573, 255], [772, 255]] as const) torch(this, x, y);
    glow(this, 1170, 245, 0x4fd8ff, 3, 2600); // classroom hologram
    glow(this, 228, 235, 0x4fd8ff, 2, 2200); // library lamp

    // waterfalls and ponds
    for (const [x, y, w, h] of [[120, 770, 60, 50], [230, 770, 60, 50], [370, 820, 40, 50], [940, 820, 60, 50]]) mist(this, new Phaser.Geom.Rectangle(x, y, w, h));
    for (const rect of [new Phaser.Geom.Rectangle(90, 790, 290, 140), new Phaser.Geom.Rectangle(840, 800, 210, 110)]) sparks(this, rect, 0xffffff, GLINT);
    for (const rect of [new Phaser.Geom.Rectangle(30, 620, 300, 160), new Phaser.Geom.Rectangle(1000, 680, 300, 200), new Phaser.Geom.Rectangle(430, 60, 120, 240)]) sparks(this, rect, 0xd8ff9a, DRIFT); // pollen

    this.buildStudents();
  }

  /** Apprentices strolling the plaza: Byte's own animated sheet, tinted, each with a line for the curious. */
  private buildStudents(): void {
    const sheet = NPC_SHEETS.apprentice;
    this.spawnNpc({ at: { x: 515, y: 440 }, sheet, tint: 0x9aa8ff, name: "Estudante", lines: ["Estou treinando print() há uma hora. Ainda acho as aspas confusas."], roam: 30 });
    this.spawnNpc({ at: { x: 880, y: 560 }, sheet, tint: 0xc8a0ff, name: "Estudante", lines: ["Ouvi dizer que o Núcleo Fonte guarda todos os segredos de Pyra."], roam: 40 });
    this.spawnNpc({ at: { x: 480, y: 590 }, sheet, tint: 0xffc890, name: "Aluna", lines: ["A biblioteca ainda guarda os grimórios de Python. Dizem que só abrem para quem decifra as runas."], roam: 40 });
    this.spawnNpc({ at: { x: 450, y: 920 }, sheet, tint: 0x9fe0b0, name: "Estudante", lines: ["Desde que as runas apagaram, as aulas viraram só teoria. Volte logo com boas notícias!"], roam: 45 });
  }
}
