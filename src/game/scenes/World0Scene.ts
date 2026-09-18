import Phaser from "phaser";
import { getWorld, lessonsAvailable } from "@/education/curriculumLoader";
import type { Lesson, Boss } from "@/types/curriculum";
import { gameState } from "@/game/systems/GameState";
import { TerminalPanel } from "@/ui/TerminalPanel";
import { DialogueBox } from "@/ui/DialogueBox";
import { Hud } from "@/ui/Hud";

const ROOM_W = 20;
const ROOM_H = 12;
const TILE = 32;
const SPEED = 140;

interface LessonStation {
  lesson: Lesson;
  sprite: Phaser.GameObjects.Image;
  prompt: Phaser.GameObjects.Text;
}

export class World0Scene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private stations: LessonStation[] = [];
  private bossGate!: { sprite: Phaser.GameObjects.Image; prompt: Phaser.GameObjects.Text; boss: Boss };
  private byteNpc!: Phaser.GameObjects.Image;
  private dialogue!: DialogueBox;
  private terminal!: TerminalPanel;
  private hud!: Hud;
  private busy = false;
  private introShown = false;

  constructor() {
    super("World0");
  }

  create(): void {
    const appRoot = document.getElementById("app")!;
    this.dialogue = new DialogueBox(appRoot);
    this.terminal = new TerminalPanel(appRoot);
    this.hud = new Hud(appRoot);
    this.hud.update(gameState.current);

    this.buildRoom();
    this.buildPlayer();
    this.buildByte();
    this.buildStations();

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E).on("down", () => this.tryInteract());
    this.interactKey.on("down", () => this.tryInteract());

    this.cameras.main.setBounds(0, 0, ROOM_W * TILE, ROOM_H * TILE);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.6);

    this.time.delayedCall(400, () => this.showIntroIfNeeded());
  }

  private buildRoom(): void {
    for (let x = 0; x < ROOM_W; x++) {
      for (let y = 0; y < ROOM_H; y++) {
        this.add.image(x * TILE + TILE / 2, y * TILE + TILE / 2, "floor");
      }
    }
    const walls = this.physics.add.staticGroup();
    for (let x = 0; x < ROOM_W; x++) {
      walls.create(x * TILE + TILE / 2, TILE / 2, "wall");
      walls.create(x * TILE + TILE / 2, (ROOM_H - 1) * TILE + TILE / 2, "wall");
    }
    for (let y = 0; y < ROOM_H; y++) {
      walls.create(TILE / 2, y * TILE + TILE / 2, "wall");
      walls.create((ROOM_W - 1) * TILE + TILE / 2, y * TILE + TILE / 2, "wall");
    }
    this.wallsGroup = walls;
  }

  private wallsGroup!: Phaser.Physics.Arcade.StaticGroup;

  private buildPlayer(): void {
    this.player = this.physics.add.sprite(3 * TILE, (ROOM_H - 2) * TILE, "player");
    this.player.setCollideWorldBounds(false);
    this.physics.add.collider(this.player, this.wallsGroup);
  }

  private buildByte(): void {
    this.byteNpc = this.add.image(3 * TILE + 40, (ROOM_H - 2) * TILE - 10, "byte");
    this.tweens.add({ targets: this.byteNpc, y: this.byteNpc.y - 6, duration: 900, yoyo: true, repeat: -1 });
  }

  private buildStations(): void {
    const world = getWorld("world-0");
    if (!world) return;
    const startX = 6 * TILE;
    world.lessons.forEach((lesson, i) => {
      const x = startX + i * 3 * TILE;
      const y = (ROOM_H - 2) * TILE;
      const sprite = this.add.image(x, y, "terminal-locked");
      const prompt = this.add.text(x, y, "", { fontFamily: '"JetBrains Mono"', fontSize: "11px", color: "#ffd24c" }).setOrigin(0.5).setVisible(false);
      this.stations.push({ lesson, sprite, prompt });
    });
    const bossX = startX + world.lessons.length * 3 * TILE + TILE;
    const bossSprite = this.add.image(bossX, (ROOM_H - 2) * TILE, "boss-gate");
    const bossPrompt = this.add
      .text(bossX, (ROOM_H - 2) * TILE, "", { fontFamily: '"JetBrains Mono"', fontSize: "11px", color: "#ff5c5c" })
      .setOrigin(0.5)
      .setVisible(false);
    this.bossGate = { sprite: bossSprite, prompt: bossPrompt, boss: world.boss };
    this.refreshStationVisuals();
  }

  private refreshStationVisuals(): void {
    const save = gameState.current;
    for (const station of this.stations) {
      const done = save.completedLessons.includes(station.lesson.id);
      const available = lessonsAvailable(station.lesson, save.completedLessons);
      station.sprite.setTexture(done ? "terminal-done" : available ? "terminal-active" : "terminal-locked");
    }
    const world = getWorld("world-0");
    const allLessonsDone = world ? world.lessons.every((l) => save.completedLessons.includes(l.id)) : false;
    const bossDone = save.completedBosses.includes(this.bossGate.boss.id);
    this.bossGate.sprite.setTint(bossDone ? 0x6a7891 : allLessonsDone ? 0xffffff : 0x555555);
  }

  private showIntroIfNeeded(): void {
    if (this.introShown) return;
    this.introShown = true;
    this.dialogue.say("BYTE", [
      "Este lugar já foi capaz de conversar com qualquer pessoa em Pyra.",
      "Agora nem mesmo consegue dizer uma única palavra.",
      "Ande até um terminal e pressione E (ou Espaço) para interagir.",
    ]);
  }

  update(): void {
    if (this.dialogue.isOpen || this.busy) {
      this.player.setVelocity(0, 0);
      return;
    }
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const vx = (this.cursors.left?.isDown ? -1 : 0) + (this.cursors.right?.isDown ? 1 : 0);
    const vy = (this.cursors.up?.isDown ? -1 : 0) + (this.cursors.down?.isDown ? 1 : 0);
    body.setVelocity(vx * SPEED, vy * SPEED);
    if (vx !== 0 || vy !== 0) body.velocity.normalize().scale(SPEED);

    this.updatePrompts();
  }

  private updatePrompts(): void {
    const RANGE = 44;
    for (const station of this.stations) {
      const near = Phaser.Math.Distance.Between(this.player.x, this.player.y, station.sprite.x, station.sprite.y) < RANGE;
      station.prompt.setPosition(station.sprite.x, station.sprite.y - 24).setVisible(near);
      if (near) station.prompt.setText("E");
    }
    const nearBoss = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.bossGate.sprite.x, this.bossGate.sprite.y) < RANGE + 10;
    this.bossGate.prompt.setPosition(this.bossGate.sprite.x, this.bossGate.sprite.y - 30).setVisible(nearBoss);
    if (nearBoss) this.bossGate.prompt.setText("E");
  }

  private tryInteract(): void {
    if (this.busy || this.dialogue.isOpen) return;
    const RANGE = 44;
    const station = this.stations.find(
      (s) => Phaser.Math.Distance.Between(this.player.x, this.player.y, s.sprite.x, s.sprite.y) < RANGE,
    );
    if (station) {
      this.openLesson(station.lesson);
      return;
    }
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.bossGate.sprite.x, this.bossGate.sprite.y) < RANGE + 10) {
      this.openBoss();
    }
  }

  private openLesson(lesson: Lesson): void {
    const save = gameState.current;
    if (save.completedLessons.includes(lesson.id)) {
      this.dialogue.say("BYTE", ["Este terminal já está funcionando perfeitamente. Bom trabalho!"]);
      return;
    }
    if (!lessonsAvailable(lesson, save.completedLessons)) {
      this.dialogue.say("BYTE", ["Este terminal ainda não vai responder. Termine o anterior primeiro."]);
      return;
    }
    this.busy = true;
    this.dialogue.say("BYTE", [lesson.story], () => {
      this.terminal.open(lesson.title, lesson.explanation, lesson.challenge, (outcome) => {
        gameState.completeLesson({ lesson, hintsUsed: outcome.hintsUsed, attempts: outcome.attempts, succeeded: true });
        this.hud.update(gameState.current);
        this.refreshStationVisuals();
        this.time.delayedCall(1200, () => {
          this.terminal.close();
          this.busy = false;
        });
      });
    });
  }

  private openBoss(): void {
    const save = gameState.current;
    const world = getWorld("world-0");
    if (!world) return;
    if (save.completedBosses.includes(this.bossGate.boss.id)) {
      this.dialogue.say("BYTE", ["Você já restaurou este núcleo. Pyra agradece."]);
      return;
    }
    const allDone = world.lessons.every((l) => save.completedLessons.includes(l.id));
    if (!allDone) {
      this.dialogue.say("BYTE", ["O guardião ainda não vai te enfrentar. Complete os terminais do Primeiro Shell primeiro."]);
      return;
    }
    this.busy = true;
    const boss = this.bossGate.boss;
    this.dialogue.say("BYTE", [boss.intro], () => {
      this.terminal.open(boss.title, boss.intro, boss.challenge, () => {
        gameState.current.completedBosses.push(boss.id);
        gameState.current.xp += boss.challenge.xp;
        gameState.persist();
        this.hud.update(gameState.current);
        this.refreshStationVisuals();
        this.terminal.close();
        this.busy = false;
        this.dialogue.say("BYTE", [boss.victoryText, "Fim da demonstração atual — mais mundos de Pyra em breve."]);
      });
    });
  }
}
