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
}

export interface Boss {
  id: string;
  world: string;
  title: string;
  intro: string;
  challenge: Challenge;
  victoryText: string;
}

export interface World {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  lessons: Lesson[];
  boss: Boss;
}
