import Phaser from "phaser";
import { GAME_NAME, GAME_SUBTITLE } from "@/config";
import { gameState } from "@/game/systems/GameState";
import { promptPlayerName } from "@/ui/namePrompt";
import { settings } from "@/ui/uiLayer";
import { DEFAULT_SCENE_KEY } from "@/game/scenes/worldSceneMap";
import { BYTE, PIP } from "@/game/sprites";
import { DRIFT, sparks } from "@/game/effects";
import { reduceMotion } from "@/motion";

export class MenuScene extends Phaser.Scene {
  private buttons: Phaser.GameObjects.Text[] = [];
  private actions: (() => void)[] = [];
  private sel = 0;
  private starting = false;

  constructor() {
    super("Menu");
  }

  create(): void {
    const { width, height } = this.scale;
    this.buttons = [];
    this.actions = [];
    this.sel = 0;
    this.starting = false;
    this.cameras.main.setBackgroundColor("#0b0e14");
    if (!reduceMotion()) this.cameras.main.fadeIn(400, 11, 14, 20);

    sparks(this, new Phaser.Geom.Rectangle(0, 0, width, height), 0x4fd8ff, { ...DRIFT, frequency: 200 });

    const title = this.add
      .text(width / 2, height * 0.2, GAME_NAME, { fontFamily: '"Press Start 2P"', fontSize: "32px", color: "#4fd8ff" })
      .setOrigin(0.5);
    this.tweens.add({ targets: title, alpha: { from: 0.8, to: 1 }, scale: { from: 0.99, to: 1.02 }, duration: 1800, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    this.add
      .text(width / 2, height * 0.2 + 38, GAME_SUBTITLE, { fontFamily: '"Press Start 2P"', fontSize: "14px", color: "#ffd24c" })
      .setOrigin(0.5);

    // Byte breathes; now and then he casts and his little flame reacts
    const byte = this.add.sprite(width / 2, height * 0.5, "byte-sheet", BYTE.idleFront).setOrigin(0.5, 1).setScale(2.2);
    const glow = this.add.image(width / 2, height * 0.5 - 60, "glow").setBlendMode(Phaser.BlendModes.ADD).setTint(0x4fd8ff).setScale(4).setAlpha(0.35);
    this.tweens.add({ targets: glow, alpha: { from: 0.2, to: 0.5 }, duration: 1600, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    this.tweens.add({ targets: byte, scaleY: 2.2 * 1.02, duration: 1300, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    const pip = this.add.sprite(width / 2 + 70, height * 0.5 - 70, "pip-sheet", PIP.idle).setScale(1.3);
    this.tweens.add({ targets: pip, y: pip.y - 10, x: pip.x + 6, duration: 1500, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    this.time.addEvent({
      delay: 4200,
      loop: true,
      callback: () => {
        byte.anims.play("byte-cast");
        pip.setFrame(PIP.excited);
        byte.once("animationcomplete", () => {
          byte.setFrame(BYTE.idleFront);
          pip.setFrame(PIP.idle);
        });
      },
    });

    const hasSave = gameState.hasExistingSave();
    const newGame = () =>
      void promptPlayerName(document.getElementById("app")!).then((name) => {
        gameState.startNewGame(name);
        this.go(DEFAULT_SCENE_KEY);
      });
    let y = height * 0.66;
    const add = (label: string, action: () => void) => {
      this.makeButton(width / 2, y, label, action);
      y += 56;
    };
    if (hasSave) {
      add("Continuar Jornada", () => {
        gameState.continueGame();
        this.go("WorldMap"); // pick where to go on the overworld
      });
      add("Novo Jogo", newGame);
    } else add("Começar Jornada", newGame);
    add("Configurações", () => settings.open());

    const kb = this.input.keyboard!;
    const menuBlocked = () => settings.isOpen;
    for (const k of ["UP", "W"]) kb.on(`keydown-${k}`, () => !menuBlocked() && this.select(this.sel - 1));
    for (const k of ["DOWN", "S"]) kb.on(`keydown-${k}`, () => !menuBlocked() && this.select(this.sel + 1));
    for (const k of ["ENTER", "SPACE"]) kb.on(`keydown-${k}`, () => !menuBlocked() && this.actions[this.sel]?.());
    this.select(0);
  }

  private go(key: string): void {
    if (this.starting) return;
    this.starting = true;
    if (reduceMotion()) {
      this.scene.start(key);
      return;
    }
    this.cameras.main.fadeOut(280, 11, 14, 20);
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start(key));
  }

  private select(i: number): void {
    this.sel = Phaser.Math.Clamp(i, 0, this.buttons.length - 1);
    this.buttons.forEach((b, n) => {
      const on = n === this.sel;
      b.setColor(on ? "#4fd8ff" : "#e8ecf4").setBackgroundColor(on ? "#16243a" : "#111826");
      this.tweens.add({ targets: b, scale: on ? 1.08 : 1, duration: 120, ease: "Quad.out" });
    });
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void): void {
    const text = this.add
      .text(x, y, label, { fontFamily: '"JetBrains Mono"', fontSize: "18px", color: "#e8ecf4", backgroundColor: "#111826", padding: { x: 16, y: 10 } })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    const idx = this.buttons.length;
    this.buttons.push(text);
    this.actions.push(onClick);
    text.on("pointerover", () => this.select(idx));
    text.on("pointerdown", onClick);
  }
}
