import { beforeEach, describe, expect, it } from "vitest";
import { loadSave, writeSave, newSave, deleteSave, exportSave, importSave } from "@/data/saveStore";
import { createDefaultSave } from "@/types/save";

// Minimal localStorage polyfill — avoids pulling in jsdom just for this.
class MemoryStorage {
  private map = new Map<string, string>();
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();
});

describe("saveStore", () => {
  it("returns null when nothing is saved yet", () => {
    expect(loadSave()).toBeNull();
  });

  it("round-trips a save through write/load", () => {
    const save = createDefaultSave("Ana");
    save.xp = 42;
    writeSave(save);
    expect(loadSave()?.xp).toBe(42);
    expect(loadSave()?.playerName).toBe("Ana");
  });

  it("newSave creates and persists a default save", () => {
    const save = newSave("Bea");
    expect(loadSave()).toEqual(save);
    expect(save.completedLessons).toEqual([]);
  });

  it("deleteSave clears it", () => {
    newSave("Ana");
    deleteSave();
    expect(loadSave()).toBeNull();
  });

  it("export/import preserves data", () => {
    newSave("Ana");
    const json = exportSave();
    deleteSave();
    expect(loadSave()).toBeNull();
    const restored = importSave(json);
    expect(restored.playerName).toBe("Ana");
    expect(loadSave()?.playerName).toBe("Ana");
  });
});
