import type Phaser from "phaser";
import npcSizes from "./npcSheets.json";

/**
 * Frame contract for the sheets built by scripts/extract_byte_sheet.py (uniform grid, feet on the bottom row).
 * Keep in sync with that script's output sizes.
 */
export const BYTE = {
  w: 83,
  h: 96,
  /** Height of the idle pose inside the cell — display scale is (target height / content). */
  content: 84,
  /** Cell px from the feet up to the sprite origin (origin sits at mid-body, feet on the bottom row). */
  feet: 42,
  idleFront: 0,
  idleBack: 1,
  idleLeft: 2,
  idleRight: 3,
  walk: [4, 5, 6, 7],
  cast: [8, 9, 10],
  hurt: 11,
  victory: 12,
} as const;

export const PIP = { w: 47, h: 46, idle: 0, happy: 1, spin: 2, excited: 3 } as const;

/** Global animations (the anims manager is shared by all scenes, so this runs once from BootScene). */
export function registerAnims(scene: Phaser.Scene): void {
  const a = scene.anims;
  a.create({ key: "byte-walk", frames: a.generateFrameNumbers("byte-sheet", { frames: [...BYTE.walk] }), frameRate: 9, repeat: -1 });
  a.create({ key: "byte-cast", frames: a.generateFrameNumbers("byte-sheet", { frames: [...BYTE.cast] }), frameRate: 6 });
  for (const sheet of Object.values(NPC_SHEETS)) {
    if (sheet.key === "byte-sheet") continue; // Byte's own animations already registered; NPC code reuses them
    a.create({ key: `${sheet.key}-walk`, frames: a.generateFrameNumbers(sheet.key, { frames: npcWalkFrames(sheet) }), frameRate: 6, repeat: -1 });
  }
}

/** Frame map + sizing of an animated character sheet (Byte's own sheet doubles as the "apprentice" NPC). */
export interface NpcSheet {
  /** Phaser texture key of the spritesheet. */
  key: string;
  /** Cell size in the sheet, and the idle pose's height inside the cell. */
  w: number;
  h: number;
  content: number;
  /** Displayed height (world px at worldScale 1) of the idle pose. */
  height: number;
  front: number;
  back: number;
  /** Optional side idles; sheets without them mirror the front pose. */
  left?: number;
  right?: number;
  /** Right-facing walk frames (mirrored for left). A single frame is alternated with `front`. */
  walk: readonly number[];
  cast?: readonly number[];
}

export const NPC_SHEET_FILES = ["pyron", "lyra", "sir-boolean", "loopus"] as const;

const wh = (name: (typeof NPC_SHEET_FILES)[number]) => ({ w: npcSizes[name].w, h: npcSizes[name].h, content: npcSizes[name].content });

export const NPC_SHEETS = {
  pyron: { key: "pyron-sheet", ...wh("pyron"), height: 40, front: 0, back: 1, left: 2, right: 3, walk: [4, 5, 6, 7], cast: [8, 9, 10, 11] },
  lyra: { key: "lyra-sheet", ...wh("lyra"), height: 34, front: 0, back: 2, walk: [1], cast: [3] },
  boolean: { key: "sir-boolean-sheet", ...wh("sir-boolean"), height: 36, front: 0, back: 2, walk: [1], cast: [3] },
  loopus: { key: "loopus-sheet", ...wh("loopus"), height: 34, front: 0, back: 2, walk: [1], cast: [3] },
  /** Byte's sheet reused (tinted) for background apprentices/villagers. */
  apprentice: { key: "byte-sheet", w: BYTE.w, h: BYTE.h, content: BYTE.content, height: 34, front: 0, back: 1, left: 2, right: 3, walk: BYTE.walk, cast: BYTE.cast },
} satisfies Record<string, NpcSheet>;

export const npcWalkFrames = (s: NpcSheet): number[] => (s.walk.length >= 3 ? [...s.walk] : [s.walk[0], s.front]);
