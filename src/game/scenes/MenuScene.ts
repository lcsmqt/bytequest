import Phaser from "phaser";
import { GAME_NAME, GAME_SUBTITLE } from "@/config";
import { gameState } from "@/game/systems/GameState";
import { promptPlayerName } from "@/ui/namePrompt";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("Menu");
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#0b0e14");

    this.add
      .text(width / 2, height * 0.28, GAME_NAME, {
        fontFamily: '"Press Start 2P"',
        fontSize: "32px",
        color: "#3ee08c",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.28 + 42, GAME_SUBTITLE, {
        fontFamily: '"Press Start 2P"',
        fontSize: "14px",
        color: "#ffd24c",
      })
      .setOrigin(0.5);

    const hasSave = gameState.hasExistingSave();

    this.makeButton(width / 2, height * 0.55, hasSave ? "Continuar Jornada" : "Começar Jornada", () => {
      if (hasSave) {
        gameState.continueGame();
        this.scene.start("World0");
      } else {
        void promptPlayerName(document.getElementById("app")!).then((name) => {
          gameState.startNewGame(name);
          this.scene.start("World0");
        });
      }
    });

    if (hasSave) {
      this.makeButton(width / 2, height * 0.55 + 56, "Novo Jogo", () => {
        void promptPlayerName(document.getElementById("app")!).then((name) => {
          gameState.startNewGame(name);
          this.scene.start("World0");
        });
      });
    }
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void): void {
    const text = this.add
      .text(x, y, label, {
        fontFamily: '"JetBrains Mono"',
        fontSize: "18px",
        color: "#e8ecf4",
        backgroundColor: "#111826",
        padding: { x: 16, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    text.on("pointerover", () => text.setColor("#3ee08c"));
    text.on("pointerout", () => text.setColor("#e8ecf4"));
    text.on("pointerdown", onClick);
  }
}
