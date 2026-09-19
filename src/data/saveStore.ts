import { SAVE_KEY } from "@/config";
import { CURRENT_SAVE_VERSION, createDefaultSave, type SaveData } from "@/types/save";

function migrate(data: SaveData): SaveData {
  // Older saves get any newly added fields from the defaults; existing progress is never overwritten.
  if (data.saveVersion === CURRENT_SAVE_VERSION) return data;
  return { ...createDefaultSave(data.playerName), ...data, saveVersion: CURRENT_SAVE_VERSION };
}

export function loadSave(): SaveData | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    return migrate(JSON.parse(raw) as SaveData);
  } catch {
    return null;
  }
}

export function writeSave(data: SaveData): void {
  data.updatedAt = new Date().toISOString();
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function newSave(playerName: string): SaveData {
  const data = createDefaultSave(playerName);
  writeSave(data);
  return data;
}

export function exportSave(): string {
  return localStorage.getItem(SAVE_KEY) ?? "";
}

export function importSave(json: string): SaveData {
  const data = migrate(JSON.parse(json) as SaveData);
  writeSave(data);
  return data;
}

export function deleteSave(): void {
  localStorage.removeItem(SAVE_KEY);
}
