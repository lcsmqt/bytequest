import type { Challenge } from "@/types/curriculum";

export interface HintState {
  level: number; // 0 = no hint requested yet
  confirmedSolutionReveal: boolean;
}

export const MAX_HINT_LEVEL = 5;

export function initialHintState(): HintState {
  return { level: 0, confirmedSolutionReveal: false };
}

/**
 * BYTE never blurts out the answer. Levels 1-4 are free (idea, concept, pseudocode, partial
 * code); level 5 (full solution) requires the caller to pass `confirm: true` after the player
 * explicitly asks again, per the spec's progressive hint rule.
 */
export function nextHint(
  challenge: Challenge,
  state: HintState,
  confirm = false,
): { text: string; state: HintState } {
  const cappedAvailable = Math.min(challenge.hints.length, MAX_HINT_LEVEL);
  const wantsLevel = Math.min(state.level + 1, cappedAvailable);

  if (wantsLevel >= MAX_HINT_LEVEL && !confirm) {
    return {
      text: "Isso revelaria a solução completa. Tem certeza? Peça a dica novamente para confirmar.",
      state,
    };
  }

  const newState: HintState = { level: wantsLevel, confirmedSolutionReveal: wantsLevel >= MAX_HINT_LEVEL };
  return { text: challenge.hints[wantsLevel - 1] ?? "Sem mais dicas disponíveis.", state: newState };
}
