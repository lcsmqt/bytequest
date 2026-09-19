import Phaser from "phaser";
import { GAME_TITLE } from "@/config";
import { BootScene } from "@/game/scenes/BootScene";
import { MenuScene } from "@/game/scenes/MenuScene";
import { World0Scene } from "@/game/scenes/World0Scene";
import { World1Scene } from "@/game/scenes/World1Scene";
import { World2Scene } from "@/game/scenes/World2Scene";
import { World3Scene } from "@/game/scenes/World3Scene";
import { World4Scene } from "@/game/scenes/World4Scene";
import { WorldMapScene } from "@/game/scenes/WorldMapScene";

document.title = GAME_TITLE;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-root",
  width: 960,
  height: 576,
  backgroundColor: "#0b0e14",
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  scene: [BootScene, MenuScene, WorldMapScene, World0Scene, World1Scene, World2Scene, World3Scene, World4Scene],
};

const game = new Phaser.Game(config);

if (import.meta.env.DEV) {
  // QA/debug convenience only — never relied on by game logic.
  (window as unknown as { __bqGame: Phaser.Game }).__bqGame = game;
}

const overlay = document.getElementById("loading-overlay");
game.events.once("ready", () => overlay?.classList.add("hidden"));
