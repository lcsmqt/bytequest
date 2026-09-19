export interface ConceptMastery {
  attempts: number;
  successes: number;
  hintsUsed: number;
}

export interface SaveData {
  saveVersion: number;
  playerName: string;
  xp: number;
  level: number;
  completedLessons: string[];
  completedBosses: string[];
  /** Debug encounters already won (bugs stay gone). */
  defeatedBugs: string[];
  currentWorld: string;
  mastery: Record<string, ConceptMastery>;
  achievements: string[];
  settings: {
    musicVolume: number;
    sfxVolume: number;
    reduceMotion: boolean;
    fontScale: number;
  };
  updatedAt: string;
}

export const CURRENT_SAVE_VERSION = 2; // v2: defeatedBugs

export function createDefaultSave(playerName: string): SaveData {
  return {
    saveVersion: CURRENT_SAVE_VERSION,
    playerName,
    xp: 0,
    level: 1,
    completedLessons: [],
    completedBosses: [],
    defeatedBugs: [],
    currentWorld: "world-0",
    mastery: {},
    achievements: [],
    settings: {
      musicVolume: 0.7,
      sfxVolume: 0.7,
      reduceMotion: false,
      fontScale: 1,
    },
    updatedAt: new Date().toISOString(),
  };
}
