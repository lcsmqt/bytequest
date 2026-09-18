import { loadSave, newSave, writeSave } from "@/data/saveStore";
import type { SaveData } from "@/types/save";
import type { Lesson } from "@/types/curriculum";
import { applyCompletion, type CompletionInput } from "@/education/progress";

/** Single in-memory holder for the active save, so scenes don't each own their own copy. */
class GameStateStore {
  private save: SaveData | null = null;

  get current(): SaveData {
    this.save ??= loadSave() ?? newSave("Coder");
    return this.save;
  }

  hasExistingSave(): boolean {
    return loadSave() !== null;
  }

  startNewGame(playerName: string): SaveData {
    this.save = newSave(playerName);
    return this.save;
  }

  continueGame(): SaveData {
    this.save = loadSave() ?? newSave("Coder");
    return this.save;
  }

  completeLesson(input: Omit<CompletionInput, "lesson"> & { lesson: Lesson }): SaveData {
    this.save = applyCompletion(this.current, input);
    writeSave(this.save);
    return this.save;
  }

  persist(): void {
    writeSave(this.current);
  }
}

export const gameState = new GameStateStore();
