import Phaser from "phaser";
import { GAME_TITLE } from "@/config";
import { BootScene } from "@/game/scenes/BootScene";
import { MenuScene } from "@/game/scenes/MenuScene";
import { World0Scene } from "@/game/scenes/World0Scene";

document.title = GAME_TITLE;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-root",
  width: 960,
  height: 576,
  backgroundColor: "#0b0e14",
  pixelArt: true,
  physics: {
    default: "arcade",
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  scene: [BootScene, MenuScene, World0Scene],
};

new Phaser.Game(config);

const overlay = document.getElementById("loading-overlay");
window.setTimeout(() => overlay?.classList.add("hidden"), 300);
