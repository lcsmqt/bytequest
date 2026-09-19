export interface HiddenTest {
  /** Python snippet run after the player's code, in the same namespace. Use `assert` — the
   *  validator wraps it and reports pass/fail; no need to print anything yourself. */
  code: string;
  description: string;
}

export interface Challenge {
  id: string;
  title: string;
  instructions: string;
  starterCode: string;
  hints: string[];
  tests: HiddenTest[];
  xp: number;
  successMessage: string;
  optional?: boolean;
}

export interface Lesson {
  id: string;
  world: string;
  title: string;
  story: string;
  learningObjectives: string[];
  explanation: string;
  examples: string[];
  challenge: Challenge;
  prerequisites: string[];
  concepts: string[];
  /** What the rune "deciphers" into on success (defaults to concepts[0]) — a reader-friendly word like "variável". */
  runeWord?: string;
}

export interface Boss {
  id: string;
  world: string;
  title: string;
  /** Same idea as Lesson.runeWord; defaults to the boss title. */
  runeWord?: string;
  intro: string;
  challenge: Challenge;
  victoryText: string;
}

/** A roaming debug encounter: a monster that guards a piece of broken code. */
export interface Bug {
  id: string;
  /** Sprite key in enemySheets.json: slime | wraith | imp | bat | goblin. */
  monster: string;
  name: string;
  /** What the monster says when it catches Byte. */
  taunt: string[];
  challenge: Challenge;
}

export interface World {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  lessons: Lesson[];
  boss: Boss;
  bugs?: Bug[];
}
