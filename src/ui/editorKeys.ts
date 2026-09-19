/**
 * Pure text-editing rules for the Python editor <textarea>: Tab/Shift+Tab indent, smart Enter.
 * Each returns an edit (replace [from,to) with `insert`, then select [selStart,selEnd]) so the caller can apply it
 * in a way that keeps the browser's undo stack (execCommand) — or fall back to setRangeText.
 */
export interface Edit {
  from: number;
  to: number;
  insert: string;
  selStart: number;
  selEnd: number;
}

const INDENT = 4;

const lineStart = (text: string, pos: number): number => text.lastIndexOf("\n", pos - 1) + 1;

export function tabEdit(text: string, start: number, end: number, shift: boolean): Edit {
  const multi = text.slice(start, end).includes("\n") || (shift && start !== end);
  if (!multi && !shift) {
    const col = start - lineStart(text, start);
    const pad = " ".repeat(INDENT - (col % INDENT));
    return { from: start, to: end, insert: pad, selStart: start + pad.length, selEnd: start + pad.length };
  }
  // work on whole lines touched by the selection (or the caret line for Shift+Tab)
  const from = lineStart(text, start);
  const endLineBreak = text.indexOf("\n", end > start && text[end - 1] === "\n" ? end - 1 : end);
  const to = endLineBreak === -1 ? text.length : endLineBreak;
  const lines = text.slice(from, to).split("\n");
  const out = lines.map((line) => {
    if (!shift) return line.length ? " ".repeat(INDENT) + line : line;
    const lead = /^ */.exec(line)![0].length;
    return line.slice(Math.min(lead, INDENT));
  });
  const insert = out.join("\n");
  const firstDelta = out[0].length - lines[0].length;
  return {
    from,
    to,
    insert,
    selStart: Math.max(from, start + firstDelta),
    selEnd: end + (insert.length - (to - from)),
  };
}

/** Enter keeps the current line's indentation and adds one level after a line ending in ':'. */
export function enterEdit(text: string, start: number, end: number): Edit {
  const ls = lineStart(text, start);
  const before = text.slice(ls, start);
  const indent = /^ */.exec(before)![0];
  const extra = before.trimEnd().endsWith(":") ? " ".repeat(INDENT) : "";
  const insert = "\n" + indent + extra;
  return { from: start, to: end, insert, selStart: start + insert.length, selEnd: start + insert.length };
}

/** Apply an edit to a string (used by tests; the panel applies it to the live textarea). */
export function applyEdit(text: string, e: Edit): string {
  return text.slice(0, e.from) + e.insert + text.slice(e.to);
}
