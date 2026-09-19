import Phaser from "phaser";
import { getWorld, lessonsAvailable, loadWorlds } from "@/education/curriculumLoader";
import type { Lesson } from "@/types/curriculum";
import { gameState } from "@/game/systems/GameState";
import { hud, dialogue, terminal, settings } from "@/ui/uiLayer";
import { BYTE, NPC_SHEETS, PIP, type NpcSheet } from "@/game/sprites";
import { Npc } from "@/game/npc";
import { Bug, type BugKind } from "@/game/bug";
import { activeBugs } from "@/education/bugs";
import type { Bug as BugData } from "@/types/curriculum";
import { reduceMotion } from "@/motion";

const ROOM_W = 20;
const ROOM_H = 12;
const TILE = 32;
const SPEED = 140;
const SPRINT = 1.55;
const INTERACT_RANGE = 44;
// Reference art comes in at hero-portrait resolution; scale down to a readable top-down size.
const BYTE_SCALE = 34 / BYTE.content;
const PIP_SCALE = 22 / 36; // pip-sheet idle flame is ~36px tall
const PIP_FOLLOW_LAG = 0.08;

interface LessonStation {
  lesson: Lesson;
  sprite: Phaser.GameObjects.Image;
  prompt: Phaser.GameObjects.Text;
  glow: Phaser.GameObjects.Image;
  sparks: Phaser.GameObjects.Particles.ParticleEmitter;
}

interface Wanderer {
  npc: Npc;
  name: string;
  /** A function is re-evaluated on every conversation (Pyron's tips depend on progress). */
  lines: string[] | (() => string[]);
  prompt: Phaser.GameObjects.Text;
}

export interface NpcSpawn {
  at: Point;
  sheet: NpcSheet;
  name: string;
  lines: string[] | (() => string[]);
  /** Stroll radius around `at` (0 = stays put). */
  roam?: number;
  tint?: number;
  speed?: number;
}

export interface Point {
  x: number;
  y: number;
}

/** Illustrated room backdrop. `mask` is a text grid ('#' blocked, '.' walkable), one char per `cell` px. */
export interface Backdrop {
  key: string;
  url: string;
  mask: string;
  cell: number;
}

export interface RoomSceneConfig {
  key: string;
  worldId: string;
}

/**
 * Generic "one room, N lesson runes + a boss gate" scene. Every world reuses this — a new
 * world only needs a curriculum JSON file and a one-line subclass registering its scene key.
 */
export class RoomScene extends Phaser.Scene {
  private readonly roomConfig: RoomSceneConfig;
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key>;
  private shift!: Phaser.Input.Keyboard.Key;
  private lead = new Phaser.Math.Vector2(0, 0);
  private stations: LessonStation[] = [];
  private bossGate!: { sprite: Phaser.GameObjects.Image; prompt: Phaser.GameObjects.Text; glow: Phaser.GameObjects.Image; bossId: string };
  private maskRows: string[] = [];
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private pipShadow!: Phaser.GameObjects.Ellipse;
  private pipMoodUntil = 0;
  private pipNextMood = 0;
  private pip!: Phaser.GameObjects.Image;
  private wallsGroup!: Phaser.Physics.Arcade.StaticGroup;
  private wanderers: Wanderer[] = [];
  private bugs: { bug: Bug; data: BugData }[] = [];
  private runeScale = 1;
  private idleSince = 0;
  private leaving = false;
  private roomW = ROOM_W;
  private roomH = ROOM_H;
  private busy = false;
  private introShown = false;
  private ws = 1;
  private facing: "up" | "down" | "left" | "right" = "down";
  private castLock = false;
  private dust!: Phaser.GameObjects.Particles.ParticleEmitter;
  private dustAt = 0;
  /** Brief pause after closing dialogue so Space/E at spawn does not instantly re-open Pyron/NPCs. */
  private interactCooldownUntil = 0;

  constructor(config: RoomSceneConfig) {
    super(config.key);
    this.roomConfig = config;
  }

  preload(): void {
    const b = this.backdrop();
    if (b) this.load.image(b.key, b.url);
  }

  create(): void {
    this.ws = this.worldScale();
    gameState.current.currentWorld = this.roomConfig.worldId;
    gameState.persist();
    hud.show();
    hud.update(gameState.current);
    hud.setSettingsHandler(() => settings.open());

    const size = this.roomSize();
    this.roomW = size.w;
    this.roomH = size.h;
    this.wanderers = [];
    this.maskRows = [];
    this.lead.set(0, 0);
    this.bugs = [];
    this.leaving = false;
    this.idleSince = 0;

    this.buildRoom();
    this.buildDecorations();
    this.buildPlayer();
    this.buildPyron();
    this.buildPip();
    this.buildStations();
    this.buildBugs();

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys("W,A,S,D") as typeof this.wasd;
    this.shift = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT, false); // no capture: Shift is a modifier elsewhere
    const interact = () => {
      if (settings.isOpen) return;
      if (dialogue.isOpen) {
        dialogue.advance();
        if (!dialogue.isOpen) this.interactCooldownUntil = this.time.now + 1200;
        return;
      }
      this.tryInteract();
    };
    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).on("down", interact);
    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E).on("down", interact);
    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.M).on("down", () => this.openMap());
    hud.setMapHandler(() => this.openMap());

    this.cameras.main.setBounds(0, 0, this.roomW * TILE, this.roomH * TILE);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(this.cameraZoom());

    if (!reduceMotion()) this.cameras.main.fadeIn(320, 11, 14, 20);
    this.introShown = false;
    this.busy = false;
    this.time.delayedCall(400, () => this.showIntroIfNeeded());
  }

  /** Any DOM overlay that should freeze exploration input. */
  private overlayOpen(): boolean {
    return dialogue.isOpen || terminal.isOpen || settings.isOpen;
  }

  /** Overworld map; ignored while a dialogue/terminal/cast owns the player. */
  private openMap(): void {
    if (this.overlayOpen() || this.busy || this.castLock) return;
    this.leave("WorldMap", { focus: this.roomConfig.worldId, from: this.roomConfig.key });
  }

  /** Fade out, then change scene (instant when the player prefers reduced motion). */
  private leave(key: string, data?: object): void {
    if (this.leaving) return;
    this.leaving = true;
    if (reduceMotion()) {
      this.scene.start(key, data);
      return;
    }
    this.cameras.main.fadeOut(220, 11, 14, 20);
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start(key, data));
  }

  /** Override to customize Master Pyron's opening line for this room. */
  protected introLines(): string[] {
    return ["Aproxime-se de uma runa e pressione E (ou Espaço) para interagir."];
  }

  /** Override for a bigger/smaller explorable area. Defaults keep the original compact room. */
  protected roomSize(): { w: number; h: number } {
    return { w: ROOM_W, h: ROOM_H };
  }

  /** Override to render an illustrated backdrop (with a walkable mask) instead of tiled floor + walls. */
  protected backdrop(): Backdrop | null {
    return null;
  }

  /** Multiplies characters, speed and interaction range — for worlds drawn at a larger scale. */
  protected worldScale(): number {
    return 1;
  }

  protected cameraZoom(): number {
    return 1.6;
  }

  protected groundTexture(): string {
    return "floor";
  }

  protected boundaryTexture(): string {
    return "wall";
  }

  /** Where Byte spawns. Defaults to the original bottom-left corner. */
  protected spawnPoint(): Point {
    return { x: 3 * TILE, y: (this.roomH - 2) * TILE };
  }

  protected pyronPosition(): Point {
    const spawn = this.spawnPoint();
    return { x: spawn.x + 40, y: spawn.y - 6 };
  }

  /** Default: a straight row of runes, matching the original layout. */
  protected stationPositions(count: number): Point[] {
    const startX = 6 * TILE;
    const y = (this.roomH - 2) * TILE;
    return Array.from({ length: count }, (_, i) => ({ x: startX + i * 3 * TILE, y }));
  }

  protected bossPosition(count: number): Point {
    const startX = 6 * TILE;
    return { x: startX + count * 3 * TILE + TILE, y: (this.roomH - 2) * TILE };
  }

  /** Where this world's roaming bugs live (one per entry in the curriculum's `bugs`, in order). */
  protected bugSpawns(): Point[] {
    return [];
  }

  /** Override to add world-specific scenery (buildings, foliage, wandering NPCs, ...). */
  protected buildDecorations(): void {}

  /**
   * Background character that strolls (see Npc), turns to face Byte and answers with its lines on interact.
   * Separate from lesson/boss stations.
   */
  protected spawnNpc(o: NpcSpawn): Npc {
    const npc = new Npc(this, {
      sheet: o.sheet,
      x: o.at.x,
      y: o.at.y,
      ws: this.ws,
      roam: (o.roam ?? 0) * this.ws,
      tint: o.tint,
      speed: o.speed,
      walkable: (x, y) => this.walkableAt(x, y),
    });
    const prompt = this.add
      .text(o.at.x, o.at.y - 26, "E", { fontFamily: '"JetBrains Mono"', fontSize: "11px", color: "#ffd24c" })
      .setOrigin(0.5)
      .setScale(this.ws)
      .setVisible(false);
    this.wanderers.push({ npc, name: o.name, lines: o.lines, prompt });
    return npc;
  }

  /** Can a foot at (x, y) stand here? Backdrop worlds consult their mask; plain rooms just keep off the walls. */
  protected walkableAt(x: number, y: number): boolean {
    const b = this.backdrop();
    if (b) return this.maskRows[Math.floor(y / b.cell)]?.[Math.floor(x / b.cell)] === ".";
    return x > 2 * TILE && x < (this.roomW - 2) * TILE && y > 2 * TILE && y < (this.roomH - 2) * TILE;
  }

  private findNextWorldId(): string | undefined {
    const worlds = loadWorlds();
    const currentIndex = worlds.findIndex((w) => w.id === this.roomConfig.worldId);
    return currentIndex >= 0 ? worlds[currentIndex + 1]?.id : undefined;
  }

  private buildBackdropRoom(b: Backdrop): void {
    this.textures.get(b.key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.add.image(0, 0, b.key).setOrigin(0).setDepth(-10);
    const walls = this.physics.add.staticGroup();
    const rows = b.mask.split("\n");
    this.maskRows = rows;
    // Merge runs of blocked cells horizontally, then stack identical runs vertically: far fewer bodies.
    const open = new Map<string, { x: number; w: number; y: number; h: number }>();
    const flush = (key: string): void => {
      const r = open.get(key)!;
      open.delete(key);
      const zone = this.add.zone(r.x * b.cell + (r.w * b.cell) / 2, r.y * b.cell + (r.h * b.cell) / 2, r.w * b.cell, r.h * b.cell);
      this.physics.add.existing(zone, true);
      walls.add(zone);
    };
    rows.forEach((row, y) => {
      const runs = new Set<string>();
      for (let x = 0; x < row.length; ) {
        if (row[x] !== "#") {
          x++;
          continue;
        }
        let end = x;
        while (end < row.length && row[end] === "#") end++;
        const key = `${x}:${end - x}`;
        runs.add(key);
        const prev = open.get(key);
        if (prev && prev.y + prev.h === y) prev.h++;
        else open.set(key, { x, w: end - x, y, h: 1 });
        x = end;
      }
      for (const key of [...open.keys()]) if (!runs.has(key)) flush(key);
    });
    for (const key of [...open.keys()]) flush(key);
    this.wallsGroup = walls;
  }

  private buildRoom(): void {
    const backdrop = this.backdrop();
    if (backdrop) {
      this.buildBackdropRoom(backdrop);
      return;
    }
    const ground = this.groundTexture();
    const boundary = this.boundaryTexture();
    for (let x = 0; x < this.roomW; x++) {
      for (let y = 0; y < this.roomH; y++) {
        this.add.image(x * TILE + TILE / 2, y * TILE + TILE / 2, ground);
      }
    }
    const walls = this.physics.add.staticGroup();
    for (let x = 0; x < this.roomW; x++) {
      walls.create(x * TILE + TILE / 2, TILE / 2, boundary);
      walls.create(x * TILE + TILE / 2, (this.roomH - 1) * TILE + TILE / 2, boundary);
    }
    for (let y = 0; y < this.roomH; y++) {
      walls.create(TILE / 2, y * TILE + TILE / 2, boundary);
      walls.create((this.roomW - 1) * TILE + TILE / 2, y * TILE + TILE / 2, boundary);
    }
    this.wallsGroup = walls;
  }

  private buildPlayer(): void {
    const spawn = this.spawnPoint();
    const scale = BYTE_SCALE * this.ws;
    this.player = this.physics.add
      .sprite(spawn.x, spawn.y, "byte-sheet", BYTE.idleFront)
      .setScale(scale)
      .setOrigin(0.5, (BYTE.h - 1 - BYTE.feet) / BYTE.h);
    // Feet-only hitbox (~12x7 world px per ws): Byte brushes past scenery painted in the backdrop.
    const bw = 12 / BYTE_SCALE;
    const bh = 7 / BYTE_SCALE;
    (this.player.body as Phaser.Physics.Arcade.Body).setSize(bw, bh).setOffset((BYTE.w - bw) / 2, BYTE.h - 1 - bh);
    this.physics.add.collider(this.player, this.wallsGroup);
    // Masks may be open at the map edge (the Academy's exit stairs): the world border is the last wall.
    this.physics.world.setBounds(0, 0, this.roomW * TILE, this.roomH * TILE);
    this.player.setCollideWorldBounds(true);
    this.playerShadow = this.add.ellipse(spawn.x, spawn.y, 18 * this.ws, 6 * this.ws, 0x000000, 0.3).setDepth(-4);
    this.dust = this.add.particles(0, 0, "spark", {
      lifespan: 380,
      speed: { min: 8, max: 22 },
      angle: { min: 200, max: 340 },
      scale: { start: 1.4 * this.ws, end: 0 },
      alpha: { start: 0.45, end: 0 },
      tint: 0xd8ccb0,
      emitting: false,
    });
  }

  /** Master Pyron — mentor NPC: paces near his post, watches Byte, and gives a progress-aware tip when talked to. */
  private buildPyron(): void {
    this.spawnNpc({ at: this.pyronPosition(), sheet: NPC_SHEETS.pyron, name: "Master Pyron", lines: () => this.pyronTips(), roam: 70, speed: 34 });
  }

  private pyronTips(): string[] {
    const world = getWorld(this.roomConfig.worldId);
    const save = gameState.current;
    if (!world) return ["Continue explorando, Byte."];
    const next = world.lessons.find((l) => !save.completedLessons.includes(l.id) && lessonsAvailable(l, save.completedLessons));
    if (next) return [`Sua próxima runa é "${next.title}". Ela brilha em ciano — aproxime-se e pressione E.`, "Se travar, use o botão Dica. Todo erro é uma informação: leia a mensagem com calma."];
    if (!save.completedBosses.includes(world.boss.id)) return ["Todas as runas daqui foram decifradas.", "Agora enfrente o guardião: a runa vermelha o espera."];
    return ["Este mundo já está restaurado. Pressione M para abrir o mapa e seguir viagem."];
  }

  /** Pip — Byte's familiar, floats a step behind the player and reacts to outcomes. */
  private buildPip(): void {
    this.pip = this.add.image(this.player.x - 22 * this.ws, this.player.y - 18 * this.ws, "pip-sheet", PIP.idle).setScale(PIP_SCALE * this.ws);
    this.pipShadow = this.add.ellipse(this.pip.x, this.pip.y, 10 * this.ws, 3.5 * this.ws, 0x000000, 0.2).setDepth(-4);
    // a soft cyan wisp trails the little flame
    this.add
      .particles(0, 0, "spark", { lifespan: 550, speed: { min: 0, max: 10 }, scale: { start: 1.4 * this.ws, end: 0 }, alpha: { start: 0.6, end: 0 }, tint: 0x4fd8ff, blendMode: "ADD", frequency: 60, follow: this.pip })
      .setDepth(1);
  }

  /** A one-shot spark burst (additive, drawn over everything). */
  private burst(x: number, y: number, tint: number | number[]): void {
    this.add
      .particles(x, y, "spark", { speed: { min: 60, max: 160 }, angle: { min: 0, max: 360 }, lifespan: 900, scale: { start: 1.6, end: 0 }, tint, blendMode: "ADD", emitting: false })
      .setScale(this.ws)
      .setDepth(1e5)
      .explode(reduceMotion() ? 10 : 36);
  }

  // ---- bug encounters --------------------------------------------------------------------------

  private buildBugs(): void {
    const world = getWorld(this.roomConfig.worldId);
    const spots = this.bugSpawns();
    activeBugs(world, gameState.current).forEach((data, i) => {
      const at = spots[i];
      if (!at) return;
      const bug = new Bug(this, { kind: data.monster as BugKind, x: at.x, y: at.y, ws: this.ws, roam: 55 * this.ws, walkable: (x, y) => this.walkableAt(x, y) });
      this.bugs.push({ bug, data });
    });
  }

  /** The bug caught Byte: he flinches, the monster taunts, then the debug console opens. */
  private startEncounter(bug: Bug, data: BugData): void {
    this.busy = true;
    const p = this.player;
    p.setVelocity(0, 0).setAngle(0).anims.stop();
    p.setFlipX(bug.x < p.x).setFrame(BYTE.hurt);
    if (!reduceMotion()) this.cameras.main.shake(180, 0.004);
    // knocked back a step, away from the bug (only if the ground there is free)
    const dir = bug.x < p.x ? 1 : -1;
    const back = p.x + dir * 26 * this.ws;
    if (this.walkableAt(back, p.y + BYTE.feet * BYTE_SCALE * this.ws)) this.tweens.add({ targets: p, x: back, duration: 200, ease: "Quad.out" });
    bug.engage();
    this.pip.setFrame(PIP.excited);
    this.time.delayedCall(650, () => {
      dialogue.say(data.name, data.taunt, () => this.openBugTerminal(bug, data));
    });
  }

  private openBugTerminal(bug: Bug, data: BugData): void {
    terminal.open(
      data.challenge.title,
      `${data.name} bloqueia o caminho. Leia o código, ache o erro e conserte-o para vencer.`,
      data.challenge,
      () => {
        gameState.recordBug(data);
        hud.update(gameState.current);
        this.time.delayedCall(1200, () => {
          terminal.close();
          this.busy = false;
          this.celebrate({ x: bug.x, y: bug.y });
          this.time.delayedCall(400, () => bug.defeat((x, y, tint) => this.burst(x, y, [tint, 0xffffff])));
        });
      },
      () => {
        bug.retreat(this.time.now); // fled: it slinks home and leaves Byte alone for a while
        this.busy = false;
      },
      "corrigido",
      {
        enemy: { name: data.name, portrait: `assets/enemies/${data.monster}-portrait.png` },
        onFail: () => bug.lunge(bug.x > this.player.x ? -1 : 1),
      },
    );
  }

  /** World reaction: Pip cheers, the rune bursts into sparks, the camera flashes and shakes. */
  private celebrate(at: Point): void {
    this.castLock = true;
    const p = this.player;
    p.setVelocity(0, 0).setAngle(0).setFlipX(at.x < p.x); // cast/victory frames face right
    p.anims.play("byte-cast");
    this.pip.setFrame(PIP.excited);
    this.tweens.add({ targets: this.pip, scale: PIP_SCALE * this.ws * 1.5, duration: 180, yoyo: true, repeat: 1, ease: "Quad.out" });
    // the spell lands when the cast pose does
    this.time.delayedCall(400, () => {
      this.burst(at.x, at.y - 10, [0x4fd8ff, 0xffd24c, 0xffffff]);
      if (!reduceMotion()) {
        this.cameras.main.flash(300, 79, 216, 255);
        this.cameras.main.shake(220, 0.002);
      }
    });
    this.time.delayedCall(750, () => p.anims.stop() && p.setFrame(BYTE.victory));
    this.time.delayedCall(1800, () => {
      this.castLock = false;
      this.pip.setFrame(PIP.idle);
    });
  }

  private buildStations(): void {
    const world = getWorld(this.roomConfig.worldId);
    if (!world) return;
    this.stations = [];
    const positions = this.stationPositions(world.lessons.length);
    const rs = Math.max(1, this.ws * 0.75);
    this.runeScale = rs; // runes grow slower than characters so they stay readable, not huge
    world.lessons.forEach((lesson, i) => {
      const { x, y } = positions[i];
      const glow = this.add.image(x, y - 4, "glow").setBlendMode(Phaser.BlendModes.ADD).setScale(1.4 * rs).setVisible(false);
      this.tweens.add({ targets: glow, alpha: { from: 0.5, to: 1 }, duration: 1100, yoyo: true, repeat: -1, ease: "Sine.inOut" });
      const sparks = this.add.particles(x, y + 10 * rs, "spark", {
        x: { min: -8 * rs, max: 8 * rs },
        speedY: { min: -30 * rs, max: -15 * rs },
        lifespan: 1400,
        frequency: 260,
        scale: { start: 1.2 * rs, end: 0 },
        alpha: { start: 0.9, end: 0 },
        tint: 0x4fd8ff,
        blendMode: "ADD",
        emitting: false,
      });
      const sprite = this.add.image(x, y, "rune-locked").setScale(rs).setDepth(y);
      if (!reduceMotion()) {
        this.tweens.add({ targets: sprite, y: y - 2.5 * rs, duration: 1400 + i * 180, yoyo: true, repeat: -1, ease: "Sine.inOut" });
      }
      glow.setDepth(y - 1);
      sparks.setDepth(y + 1);
      const prompt = this.add
        .text(x, y, "", { fontFamily: '"JetBrains Mono"', fontSize: "11px", color: "#ffd24c" })
        .setOrigin(0.5)
        .setScale(this.ws)
        .setVisible(false);
      this.stations.push({ lesson, sprite, prompt, glow, sparks });
    });
    const bossPos = this.bossPosition(world.lessons.length);
    const bossGlow = this.add.image(bossPos.x, bossPos.y, "glow").setBlendMode(Phaser.BlendModes.ADD).setTint(0xff5c5c).setScale(2.2 * rs).setVisible(false);
    this.tweens.add({ targets: bossGlow, alpha: { from: 0.4, to: 1 }, duration: 800, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    const bossSprite = this.add.image(bossPos.x, bossPos.y, this.backdrop() ? "boss-rune" : "boss-gate").setScale(this.backdrop() ? rs * 1.3 : 1);
    const bossPrompt = this.add
      .text(bossPos.x, bossPos.y, "", { fontFamily: '"JetBrains Mono"', fontSize: "11px", color: "#ff5c5c" })
      .setOrigin(0.5)
      .setScale(this.ws)
      .setVisible(false);
    bossSprite.setDepth(bossPos.y);
    bossGlow.setDepth(bossPos.y - 1);
    this.bossGate = { sprite: bossSprite, prompt: bossPrompt, glow: bossGlow, bossId: world.boss.id };
    this.refreshStationVisuals();
  }

  private refreshStationVisuals(): void {
    const save = gameState.current;
    for (const station of this.stations) {
      const done = save.completedLessons.includes(station.lesson.id);
      const available = lessonsAvailable(station.lesson, save.completedLessons);
      station.sprite.setTexture(done ? "rune-done" : available ? "rune-active" : "rune-locked");
      station.glow.setVisible(done || available).setTint(done ? 0xffd24c : 0x4fd8ff);
      station.sparks.emitting = available && !done;
    }
    const world = getWorld(this.roomConfig.worldId);
    const allLessonsDone = world ? world.lessons.every((l) => save.completedLessons.includes(l.id)) : false;
    const bossDone = save.completedBosses.includes(this.bossGate.bossId);
    this.bossGate.sprite.setTint(bossDone ? 0x6a7891 : allLessonsDone ? 0xffffff : 0x555555);
    this.bossGate.glow.setVisible(allLessonsDone && !bossDone);
  }

  private showIntroIfNeeded(): void {
    if (this.introShown) return;
    this.introShown = true;
    dialogue.say("Master Pyron", this.introLines());
  }

  update(time: number, delta: number): void {
    const feet = { x: this.player.x, y: this.player.y };
    for (const w of this.wanderers) w.npc.update(time, delta, feet, dialogue.isOpen);
    const free = !this.overlayOpen() && !this.busy && !this.castLock;
    for (const b of this.bugs) if (b.bug.update(time, delta, feet, free)) this.startEncounter(b.bug, b.data);
    this.bugs = this.bugs.filter((b) => !b.bug.gone);

    if (this.castLock) {
      this.player.setVelocity(0, 0);
      this.updatePip(time);
      return;
    }
    if (this.overlayOpen() || this.busy) {
      this.player.setVelocity(0, 0);
      this.animateByte(0, 0, time, 0);
      this.updatePip(time);
      this.updatePrompts();
      return;
    }
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const kb = this.cursors;
    const vx = (kb.left.isDown || this.wasd.A.isDown ? -1 : 0) + (kb.right.isDown || this.wasd.D.isDown ? 1 : 0);
    const vy = (kb.up.isDown || this.wasd.W.isDown ? -1 : 0) + (kb.down.isDown || this.wasd.S.isDown ? 1 : 0);
    // ease toward the input direction: a soft start and stop instead of snapping to full speed
    const len = Math.hypot(vx, vy) || 1;
    const top = SPEED * this.ws * (this.shift.isDown && (vx || vy) ? SPRINT : 1);
    const k = 1 - Math.exp((-delta / 1000) * 18);
    body.setVelocity(Phaser.Math.Linear(body.velocity.x, (vx / len) * top, k), Phaser.Math.Linear(body.velocity.y, (vy / len) * top, k));
    this.assistCorner(body, vx, vy, delta);
    this.leadCamera(vx, vy, delta);

    this.animateByte(vx, vy, time, body.velocity.length() / (SPEED * this.ws));
    this.updatePip(time);
    this.updatePrompts();
  }

  /**
   * Corner assist: when Byte pushes into a wall but the way is clear a few pixels to one side (a doorway,
   * a bridge end, a stair edge painted a little off the mask grid), slide him toward the gap instead of leaving him
   * stuck on the corner. Handles single-axis and diagonal input; offsets up to ~21px (under one body width).
   */
  private assistCorner(body: Phaser.Physics.Arcade.Body, vx: number, vy: number, delta: number): void {
    if (!vx && !vy) return;
    const push = 4;
    const slide = 90 * this.ws * (delta / 1000);
    const len = Math.hypot(vx, vy) || 1;
    const nx = vx / len;
    const ny = vy / len;
    const blockedH = nx > 0 ? body.blocked.right : nx < 0 ? body.blocked.left : false;
    const blockedV = ny > 0 ? body.blocked.down : ny < 0 ? body.blocked.up : false;

    // Pure horizontal or vertical push into a wall
    if ((vx !== 0 && vy === 0 && blockedH) || (vy !== 0 && vx === 0 && blockedV)) {
      this.slideCornerGap(body, vx !== 0, vy !== 0, vx, vy, push, slide);
      return;
    }
    if (!vx || !vy) return;
    if (!blockedH && !blockedV) return;

    // Diagonal into a wall or corner: slide along the axis that still has room
    if (blockedH && !blockedV) this.slideCornerGap(body, false, true, 0, vy, push, slide);
    else if (blockedV && !blockedH) this.slideCornerGap(body, true, false, vx, 0, push, slide);
    else {
      const hRoom = this.cornerClearance(body, nx, 0);
      const vRoom = this.cornerClearance(body, 0, ny);
      if (hRoom >= vRoom) this.slideCornerGap(body, true, false, nx, 0, push, slide);
      else this.slideCornerGap(body, false, true, 0, ny, push, slide);
    }
  }

  /** How many px of sideways clearance exist along one axis (for picking a diagonal corner slide). */
  private cornerClearance(body: Phaser.Physics.Arcade.Body, ax: number, ay: number): number {
    for (const off of [3, 6, 9, 12, 15, 18, 21]) {
      if (this.footFree(body.x + ax * off, body.y + ay * off, body.width, body.height)) return off;
    }
    return 0;
  }

  private slideCornerGap(
    body: Phaser.Physics.Arcade.Body,
    horizontal: boolean,
    _vertical: boolean,
    vx: number,
    vy: number,
    push: number,
    slide: number,
  ): void {
    for (const off of [3, 6, 9, 12, 15, 18, 21]) {
      for (const sign of [-1, 1]) {
        const dx = horizontal ? vx * push : sign * off;
        const dy = horizontal ? sign * off : vy * push;
        if (this.footFree(body.x + dx, body.y + dy, body.width, body.height)) {
          if (horizontal) this.player.y += sign * Math.min(off, slide);
          else this.player.x += sign * Math.min(off, slide);
          return;
        }
      }
    }
  }

  /** Is a foot rectangle (top-left x,y and size) entirely on walkable ground? */
  private footFree(x: number, y: number, w: number, h: number): boolean {
    return [x + 1, x + w - 1].every((cx) => [y + 1, y + h - 1].every((cy) => this.walkableAt(cx, cy)));
  }

  /** The camera looks a little ahead of Byte, easing back when he stops. */
  private leadCamera(vx: number, vy: number, delta: number): void {
    const k = 1 - Math.exp((-delta / 1000) * 3);
    this.lead.set(Phaser.Math.Linear(this.lead.x, vx * 60, k), Phaser.Math.Linear(this.lead.y, vy * 36, k));
    this.cameras.main.setFollowOffset(-this.lead.x, -this.lead.y);
  }

  /** Side walk cycle for any horizontal input (left = mirrored); front/back pose with a waddle for pure vertical. */
  private animateByte(vx: number, vy: number, time: number, speedRatio: number): void {
    const p = this.player;
    const base = BYTE_SCALE * this.ws;
    const moving = vx !== 0 || vy !== 0;
    if (moving) {
      if (vx !== 0) {
        this.facing = vx < 0 ? "left" : "right";
        p.setFlipX(vx < 0).setAngle(0).anims.play("byte-walk", true);
        p.anims.timeScale = Phaser.Math.Clamp(speedRatio, 0.45, 1.6); // steps follow the actual pace, incl. ease-in/out and sprint
      } else {
        // vertical: no walk cycle in the art, so the front/back pose shuffles — mirrored every stride, with a lean
        this.facing = vy < 0 ? "up" : "down";
        p.anims.stop();
        const stride = Math.floor(time / (speedRatio > 1.2 ? 110 : 170)) % 2 === 0;
        p.setFlipX(stride).setFrame(vy < 0 ? BYTE.idleBack : BYTE.idleFront).setAngle((stride ? 1 : -1) * 2.5);
      }
      this.idleSince = time;
      const bounce = Math.abs(Math.sin(time / 110)); // footfall squash-and-stretch
      p.setScale(base * (1 - 0.02 * bounce), base * (1 + 0.035 * bounce));
      if (time > this.dustAt) {
        this.dustAt = time + (speedRatio > 1.2 ? 130 : 230); // sprinting kicks up more dust
        this.dust.setDepth(p.y - 1).emitParticleAt(p.x, p.y + BYTE.feet * base, 2);
      }
    } else {
      p.anims.stop();
      p.setFlipX(false).setAngle(0).setScale(base, base * (1 + 0.015 * Math.sin(time / 380)));
      let face = this.facing;
      if (this.idleSince === 0) this.idleSince = time;
      const idleFor = time - this.idleSince;
      // after a few idle seconds Byte glances around (right, left, back to the front) instead of freezing
      if (idleFor > 5000 && !this.busy && !dialogue.isOpen) face = (["right", "left", "down", "down"] as const)[Math.floor((idleFor - 5000) / 1400) % 4];
      p.setFrame({ up: BYTE.idleBack, down: BYTE.idleFront, left: BYTE.idleLeft, right: BYTE.idleRight }[face]);
    }
  }

  private get range(): number {
    return INTERACT_RANGE * this.ws;
  }

  private updatePip(time: number): void {
    const targetX = this.player.x - 24 * this.ws;
    // hover bob is part of the target: a tween on y would fight this lerp and pin Pip in place
    const targetY = this.player.y - 20 * this.ws + Math.sin(time / 350) * 5 * this.ws;
    this.pip.x = Phaser.Math.Linear(this.pip.x, targetX, PIP_FOLLOW_LAG);
    this.pip.y = Phaser.Math.Linear(this.pip.y, targetY, PIP_FOLLOW_LAG);
    // y-sort: whoever is lower on screen draws in front
    this.player.setDepth(this.player.y);
    this.pip.setDepth(this.player.y + 1);
    // grounded shadows
    const ground = this.player.y + BYTE.feet * BYTE_SCALE * this.ws;
    this.playerShadow.setPosition(this.player.x, ground);
    this.pipShadow.setPosition(this.pip.x, ground).setScale(1 - Math.min(0.4, Math.abs(ground - this.pip.y - 30 * this.ws) / (200 * this.ws)));
    // Pip's mood: now and then a happy blink or a spin (not while celebrating — that sets its own frame)
    if (!this.castLock && this.bugs.some((b) => b.bug.chasing)) {
      this.pip.setFrame(PIP.excited); // Pip warns Byte a bug is after him
      this.pip.y -= Math.abs(Math.sin(time / 90)) * 3 * this.ws;
    } else if (!this.castLock) {
      if (time > this.pipNextMood) {
        this.pipNextMood = time + 5000 + Math.random() * 5000;
        this.pipMoodUntil = time + 1100;
        this.pip.setFrame(Math.random() < 0.5 ? PIP.happy : PIP.spin);
      } else if (time > this.pipMoodUntil) {
        this.pip.setFrame(PIP.idle);
      }
    }
  }

  private updatePrompts(): void {
    for (const station of this.stations) {
      const near = Phaser.Math.Distance.Between(this.player.x, this.player.y, station.sprite.x, station.sprite.y) < this.range;
      const done = gameState.current.completedLessons.includes(station.lesson.id);
      if (!done && lessonsAvailable(station.lesson, gameState.current.completedLessons)) {
        station.sprite.setScale(this.runeScale * (1 + 0.03 * Math.sin(this.time.now / 380 + station.sprite.x)));
      }
      station.prompt.setPosition(station.sprite.x, station.sprite.y - 24 * this.ws - Math.abs(Math.sin(this.time.now / 260)) * 3 * this.ws).setVisible(near);
      if (near) station.prompt.setText("E");
    }
    const nearBoss =
      Phaser.Math.Distance.Between(this.player.x, this.player.y, this.bossGate.sprite.x, this.bossGate.sprite.y) < this.range + 10;
    this.bossGate.prompt.setPosition(this.bossGate.sprite.x, this.bossGate.sprite.y - 30 * this.ws).setVisible(nearBoss);
    if (nearBoss) this.bossGate.prompt.setText("E");

    for (const w of this.wanderers) {
      const near = Phaser.Math.Distance.Between(this.player.x, this.player.y, w.npc.x, w.npc.y) < this.range;
      w.prompt.setPosition(w.npc.x, w.npc.y - 34 * this.ws).setDepth(1e5).setVisible(near && !dialogue.isOpen);
    }
  }

  private tryInteract(): void {
    if (this.busy || this.castLock || this.overlayOpen() || this.time.now < this.interactCooldownUntil) return;
    const station = this.stations.find(
      (s) => Phaser.Math.Distance.Between(this.player.x, this.player.y, s.sprite.x, s.sprite.y) < this.range,
    );
    if (station) {
      this.openLesson(station);
      return;
    }
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.bossGate.sprite.x, this.bossGate.sprite.y) < this.range + 10) {
      this.openBoss();
      return;
    }
    const wanderer = this.wanderers.find((w) => Phaser.Math.Distance.Between(this.player.x, this.player.y, w.npc.x, w.npc.y) < this.range);
    if (wanderer) {
      wanderer.npc.talking = true; // stops strolling and turns to face Byte until the dialogue closes
      dialogue.say(wanderer.name, typeof wanderer.lines === "function" ? wanderer.lines() : wanderer.lines);
    }
  }

  private openLesson({ lesson, sprite }: LessonStation): void {
    const save = gameState.current;
    if (save.completedLessons.includes(lesson.id)) {
      dialogue.say("Pip", ["Esta runa já foi decifrada e brilha em dourado. Bom trabalho!"]);
      return;
    }
    if (!lessonsAvailable(lesson, save.completedLessons)) {
      dialogue.say("Pip", ["Esta runa ainda está adormecida. Decifre a anterior primeiro."]);
      return;
    }
    this.busy = true;
    dialogue.say("Master Pyron", [lesson.story], () => {
      terminal.open(
        lesson.title,
        lesson.explanation,
        lesson.challenge,
        (outcome) => {
          gameState.completeLesson({ lesson, hintsUsed: outcome.hintsUsed, attempts: outcome.attempts, succeeded: true });
          hud.update(gameState.current);
          this.time.delayedCall(1200, () => {
            terminal.close();
            this.busy = false;
            this.refreshStationVisuals();
            this.celebrate(sprite);
          });
        },
        () => {
          this.busy = false;
        },
        lesson.runeWord ?? lesson.concepts[0],
      );
    });
  }

  private openBoss(): void {
    const save = gameState.current;
    const world = getWorld(this.roomConfig.worldId);
    if (!world) return;
    if (save.completedBosses.includes(world.boss.id)) {
      dialogue.say("Pip", ["Você já restaurou este núcleo. Pyra agradece."]);
      return;
    }
    const allDone = world.lessons.every((l) => save.completedLessons.includes(l.id));
    if (!allDone) {
      dialogue.say("Pip", ["O guardião ainda não vai te enfrentar. Decifre as runas deste mundo primeiro."]);
      return;
    }
    this.busy = true;
    const boss = world.boss;
    dialogue.say("Master Pyron", [boss.intro], () => {
      terminal.open(
        boss.title,
        boss.intro,
        boss.challenge,
        () => {
          save.completedBosses.push(boss.id);
          save.xp += boss.challenge.xp;
          const nextWorld = this.findNextWorldId();
          if (nextWorld) save.currentWorld = nextWorld;
          gameState.persist();
          hud.update(gameState.current);
          this.refreshStationVisuals();
          terminal.close();
          this.celebrate(this.bossGate.sprite);
          this.busy = false;
          const lines = nextWorld ? [boss.victoryText] : [boss.victoryText, "Fim do conteúdo disponível por enquanto — mais mundos de Pyra em breve."];
          dialogue.say("Pip", lines, () => {
            // back to the overworld: with a next world, Byte walks to the freshly opened path
            this.leave("WorldMap", { focus: nextWorld ?? this.roomConfig.worldId, arriveFrom: nextWorld ? this.roomConfig.worldId : undefined, from: this.roomConfig.key });
          });
        },
        () => {
          this.busy = false;
        },
        boss.runeWord ?? boss.title,
      );
    });
  }
}
