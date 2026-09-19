import Phaser from "phaser";
import { loadWorlds } from "@/education/curriculumLoader";
import { buildMapNodes, stepSelection, type MapNode } from "@/education/worldMap";
import { gameState } from "@/game/systems/GameState";
import { hud, settings } from "@/ui/uiLayer";
import { BYTE } from "@/game/sprites";
import { DRIFT, sparks } from "@/game/effects";
import { DEFAULT_SCENE_KEY, WORLD_SCENE_KEYS } from "./worldSceneMap";

const W = 960;
const H = 576;
const TW = 152;
const TH = 114;
const BYTE_H = 52; // marker height on the map
// Trail runs bottom-left -> top-right; extra worlds continue the zig-zag.
const SLOTS = [
  { x: 120, y: 395 },
  { x: 295, y: 310 },
  { x: 470, y: 395 },
  { x: 645, y: 310 },
  { x: 820, y: 225 },
];
const slot = (i: number): { x: number; y: number } => SLOTS[i] ?? { x: 820, y: 225 };

export interface WorldMapData {
  /** World to highlight first (defaults to the save's current world). */
  focus?: string;
  /** World Byte walks in from — set right after a boss falls, so the new path is shown opening. */
  arriveFrom?: string;
  /** Scene to return to on Esc (defaults to the menu). */
  from?: string;
}

/**
 * Overworld: one node per curriculum world (thumbnail of its illustrated map), a lit trail through the
 * unlocked ones, Byte standing on the current node. Unlocking follows worldMap.buildMapNodes.
 */
export class WorldMapScene extends Phaser.Scene {
  private entry: WorldMapData = {};
  private nodes: MapNode[] = [];
  private sel = 0;
  private markerAt = 0;
  private travelling = false;
  private arriving = false;
  private items: Phaser.GameObjects.Container[] = [];
  private marker!: Phaser.GameObjects.Sprite;
  private ring!: Phaser.GameObjects.Graphics;
  private title!: Phaser.GameObjects.Text;
  private detail!: Phaser.GameObjects.Text;
  private action!: Phaser.GameObjects.Text;

  constructor() {
    super("WorldMap");
  }

  init(data: WorldMapData): void {
    this.entry = data ?? {};
    this.travelling = false;
    this.arriving = false;
  }

  preload(): void {
    loadWorlds().forEach((_, i) => this.load.image(`map-w${i}`, `assets/map/w${i}.png`));
  }

  /** Map thumbnails are pixel art — keep them crisp after FIT scaling. */
  private crispMaps(): void {
    for (let i = 0; i < loadWorlds().length; i++) {
      const key = `map-w${i}`;
      if (this.textures.exists(key)) this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
  }

  create(): void {
    this.crispMaps();
    hud.show();
    hud.update(gameState.current);
    hud.setMapHandler(null); // already on the map
    hud.setSettingsHandler(() => settings.open());
    this.nodes = buildMapNodes(loadWorlds(), gameState.current);

    const focusId = this.entry.focus ?? gameState.current.currentWorld;
    this.sel = Math.max(0, this.nodes.findIndex((n) => n.id === focusId));

    this.buildBackdrop();
    this.buildTrail();
    this.items = this.nodes.map((n, i) => this.buildNode(n, i));
    this.buildPanel();

    const fromIdx = this.nodes.findIndex((n) => n.id === this.entry.arriveFrom);
    this.markerAt = fromIdx >= 0 ? fromIdx : this.sel;
    const start = this.markerPos(this.markerAt);
    this.marker = this.add
      .sprite(start.x, start.y, "byte-sheet", BYTE.idleFront)
      .setOrigin(0.5, 1)
      .setScale(BYTE_H / BYTE.content)
      .setDepth(50);
    this.ring = this.add.graphics().setDepth(40);

    this.arriving = fromIdx >= 0 && fromIdx !== this.sel;
    this.bindKeys();
    this.refresh();
    this.cameras.main.fadeIn(300, 11, 14, 20);

    if (this.arriving) {
      // a boss just fell: walk to the freshly opened world and celebrate it
      this.time.delayedCall(700, () =>
        this.walkTo(this.sel, () => {
          this.arriving = false;
          this.announceUnlock(this.sel);
        }),
      );
    }
  }

  private markerPos(i: number): { x: number; y: number } {
    const p = slot(i);
    return { x: p.x, y: p.y - TH / 2 - 4 };
  }

  private buildBackdrop(): void {
    const g = this.add.graphics();
    g.fillGradientStyle(0x0e1a33, 0x0e1a33, 0x080b14, 0x080b14, 1);
    g.fillRect(0, 0, W, H);
    g.lineStyle(2, 0x2c3a55, 1).strokeRect(8, 8, W - 16, H - 16);
    sparks(this, new Phaser.Geom.Rectangle(0, 0, W, H), 0x4fd8ff, { ...DRIFT, frequency: 220 });
    this.add.text(W / 2, 30, "MAPA DE PYRA", { fontFamily: '"Press Start 2P"', fontSize: "18px", color: "#4fd8ff" }).setOrigin(0.5);
    this.add
      .text(W / 2, 56, "← → escolher   ·   Enter viajar   ·   Esc voltar", { fontFamily: '"JetBrains Mono"', fontSize: "11px", color: "#6a7891" })
      .setOrigin(0.5);
  }

  /** Dotted quadratic curves between consecutive nodes; lit cyan where the destination is open. */
  private buildTrail(): void {
    const g = this.add.graphics();
    for (let i = 0; i < this.nodes.length - 1; i++) {
      const a = slot(i);
      const b = slot(i + 1);
      const bend = i % 2 === 0 ? -45 : 45;
      const cx = (a.x + b.x) / 2 + bend;
      const cy = (a.y + b.y) / 2 + bend;
      const open = this.nodes[i + 1].unlocked;
      g.fillStyle(open ? 0x4fd8ff : 0x2c3a55, open ? 0.9 : 0.8);
      for (let t = 0.12; t <= 0.88; t += 0.045) {
        const x = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * cx + t * t * b.x;
        const y = (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * cy + t * t * b.y;
        g.fillCircle(x, y, open ? 3 : 2);
      }
    }
    this.tweens.add({ targets: g, alpha: { from: 0.65, to: 1 }, duration: 1200, yoyo: true, repeat: -1, ease: "Sine.inOut" });
  }

  private buildNode(n: MapNode, i: number): Phaser.GameObjects.Container {
    const { x, y } = slot(i);
    const c = this.add.container(x, y);
    const img = this.add.image(0, 0, `map-w${i}`).setDisplaySize(TW, TH);
    if (!n.unlocked) img.setTint(0x2a3244);
    const border = this.add.graphics();
    const color = n.completed ? 0xffd24c : n.unlocked ? 0x4fd8ff : 0x3a4560;
    border.lineStyle(3, color, 1).strokeRoundedRect(-TW / 2, -TH / 2, TW, TH, 6);
    const label = this.add
      .text(0, TH / 2 + 8, n.place, { fontFamily: '"JetBrains Mono"', fontSize: "12px", color: n.unlocked ? "#e8ecf4" : "#6a7891", align: "center" })
      .setOrigin(0.5, 0);
    c.add([img, border, label]);

    if (!n.unlocked) {
      const lock = this.add.graphics();
      lock.fillStyle(0xb8c2d8, 1).fillRoundedRect(-14, -2, 28, 22, 4);
      lock.lineStyle(4, 0xb8c2d8, 1).beginPath().arc(0, -2, 9, Math.PI, 0).strokePath();
      lock.fillStyle(0x2a3244, 1).fillCircle(0, 9, 3);
      c.add(lock);
    } else if (n.completed) {
      const badge = this.add.graphics();
      badge.fillStyle(0xffd24c, 1).fillCircle(TW / 2 - 6, -TH / 2 + 6, 13);
      c.add([badge, this.add.text(TW / 2 - 6, -TH / 2 + 6, "✔", { fontSize: "16px", color: "#0b0e14" }).setOrigin(0.5)]);
    }

    c.setSize(TW, TH).setInteractive({ useHandCursor: true });
    c.on("pointerover", () => this.select(i));
    c.on("pointerdown", () => (this.sel === i ? this.activate(i) : this.select(i)));
    return c;
  }

  private buildPanel(): void {
    this.add.rectangle(W / 2, 528, W - 60, 76, 0x111826, 0.94).setStrokeStyle(2, 0x2c3a55);
    this.title = this.add.text(50, 498, "", { fontFamily: '"Press Start 2P"', fontSize: "11px", color: "#4fd8ff" });
    this.detail = this.add.text(50, 520, "", { fontFamily: '"JetBrains Mono"', fontSize: "12px", color: "#9aa7bd" });
    this.action = this.add.text(50, 542, "", { fontFamily: '"JetBrains Mono"', fontSize: "12px", color: "#ffd24c" });
  }

  private bindKeys(): void {
    const kb = this.input.keyboard!;
    const blocked = () => settings.isOpen;
    for (const k of ["LEFT", "A", "UP"]) kb.on(`keydown-${k}`, () => !blocked() && this.select(stepSelection(this.nodes.length, this.sel, -1)));
    for (const k of ["RIGHT", "D", "DOWN"]) kb.on(`keydown-${k}`, () => !blocked() && this.select(stepSelection(this.nodes.length, this.sel, 1)));
    for (const k of ["ENTER", "SPACE", "E"]) kb.on(`keydown-${k}`, () => !blocked() && this.activate(this.sel));
    for (const k of ["ESC", "M"]) kb.on(`keydown-${k}`, () => !blocked() && this.leave());
  }

  private select(i: number): void {
    if (this.travelling || i === this.sel) return;
    this.sel = i;
    this.refresh();
  }

  private refresh(): void {
    const n = this.nodes[this.sel];
    this.items.forEach((c, i) => this.tweens.add({ targets: c, scale: i === this.sel ? 1.1 : 1, duration: 150, ease: "Quad.out" }));
    this.title.setText(n.place.toUpperCase()).setColor(n.completed ? "#ffd24c" : n.unlocked ? "#4fd8ff" : "#6a7891");
    const state = n.completed ? "Chefe derrotado" : n.unlocked ? "Chefe pendente" : "Bloqueado";
    this.detail.setText(`${n.title} — ${n.subtitle}   ·   Lições ${n.lessonsDone}/${n.lessonsTotal}   ·   ${state}`);
    this.action.setText(n.unlocked ? "Enter / clique: viajar para cá" : `Derrote o chefe de "${n.lockedBy}" para abrir este caminho.`).setColor(n.unlocked ? "#ffd24c" : "#ff8a5c");
    if (this.markerAt !== this.sel && !this.travelling && !this.arriving) this.walkTo(this.sel);
  }

  /** Byte strolls to a node (walk cycle, mirrored when heading left). */
  private walkTo(i: number, done?: () => void): void {
    const target = this.markerPos(i);
    this.markerAt = i;
    this.tweens.killTweensOf(this.marker);
    this.marker.setFlipX(target.x < this.marker.x).anims.play("byte-walk", true);
    const dist = Phaser.Math.Distance.Between(this.marker.x, this.marker.y, target.x, target.y);
    this.tweens.add({
      targets: this.marker,
      x: target.x,
      y: target.y,
      duration: Math.max(250, dist * 4.5),
      ease: "Sine.inOut",
      onComplete: () => {
        this.marker.anims.stop();
        this.marker.setFlipX(false).setFrame(BYTE.idleFront);
        done?.();
      },
    });
  }

  private announceUnlock(i: number): void {
    const { x, y } = slot(i);
    this.add
      .particles(x, y, "spark", { speed: { min: 60, max: 180 }, angle: { min: 0, max: 360 }, lifespan: 900, scale: { start: 2, end: 0 }, tint: [0x4fd8ff, 0xffd24c, 0xffffff], blendMode: "ADD", emitting: false })
      .setDepth(60)
      .explode(40);
    const banner = this.add
      .text(x, y - TH / 2 - BYTE_H - 14, "Novo caminho aberto!", { fontFamily: '"Press Start 2P"', fontSize: "10px", color: "#ffd24c", backgroundColor: "#111826", padding: { x: 8, y: 6 } })
      .setOrigin(0.5)
      .setDepth(60)
      .setScale(0.3);
    this.tweens.add({ targets: banner, scale: 1, duration: 300, ease: "Back.out" });
    this.tweens.add({ targets: banner, alpha: 0, delay: 2600, duration: 500, onComplete: () => banner.destroy() });
  }

  private activate(i: number): void {
    if (this.travelling) return;
    const n = this.nodes[i];
    if (!n.unlocked) {
      this.tweens.add({ targets: this.items[i], x: slot(i).x + 6, duration: 50, yoyo: true, repeat: 3, onComplete: () => this.items[i].setX(slot(i).x) });
      return;
    }
    this.travelling = true;
    this.cameras.main.fadeOut(280, 11, 14, 20);
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start(WORLD_SCENE_KEYS[n.id] ?? DEFAULT_SCENE_KEY));
  }

  private leave(): void {
    if (this.travelling) return;
    this.travelling = true;
    this.cameras.main.fadeOut(200, 11, 14, 20);
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start(this.entry.from ?? "Menu"));
  }

  update(time: number): void {
    // pulsing cursor ring around the selected node
    const { x, y } = slot(this.sel);
    const pad = 8 + Math.sin(time / 220) * 2;
    this.ring.clear().lineStyle(2, 0xffffff, 0.85).strokeRoundedRect(x - (TW * 1.1) / 2 - pad, y - (TH * 1.1) / 2 - pad, TW * 1.1 + pad * 2, TH * 1.1 + pad * 2, 10);
  }
}
