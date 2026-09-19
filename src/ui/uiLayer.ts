import { Hud } from "./Hud";
import { DialogueBox } from "./DialogueBox";
import { TerminalPanel } from "./TerminalPanel";
import { SettingsPanel } from "./SettingsPanel";
import { applySettings } from "./settings";

// Singletons shared by every room scene — DOM overlays live above the Phaser canvas and must
// survive scene.start() transitions, otherwise each new scene would stack duplicate nodes.
const appRoot = document.getElementById("app")!;

export const hud = new Hud(appRoot);
export const dialogue = new DialogueBox(appRoot);
export const terminal = new TerminalPanel(appRoot);
export const settings = new SettingsPanel(appRoot);
applySettings();
