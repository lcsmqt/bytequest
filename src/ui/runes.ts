/** Arcane inscription: a word rendered in Runic glyphs, "deciphered" into real text on success. */
const GLYPHS = Array.from("ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ");

const glyphFor = (ch: string, i: number): string => GLYPHS[(ch.charCodeAt(0) * 7 + i * 3) % GLYPHS.length];

/** Deterministic glyph string for a word — same word always looks the same. */
export function runeGlyphs(word: string): string {
  return Array.from(word, (ch, i) => (ch === " " ? " " : glyphFor(ch, i))).join("");
}

/** Reveals `word` left to right over `ms`, unresolved letters flickering as random glyphs.
 *  Returns a cancel function. */
export function decipher(el: HTMLElement, word: string, ms = 1000): () => void {
  const chars = Array.from(word);
  const start = performance.now();
  const timer = window.setInterval(() => {
    const done = Math.min(chars.length, Math.floor(((performance.now() - start) / ms) * chars.length));
    el.textContent = chars
      .map((ch, i) => (i < done || ch === " " ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
      .join("");
    if (done >= chars.length) window.clearInterval(timer);
  }, 50);
  return () => window.clearInterval(timer);
}
