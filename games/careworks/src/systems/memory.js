// Memory support (Milestone 17, bible §18): a steady routine, life-story themes, the Choice signal, stimulation and the
// safe walking path. Pure rules on plain state, so the Node tests use them as they are; the home world runs the sessions,
// walks and daily updates. No cure mechanic: nothing here lowers the Memory need.
//
// A memory-support resident's state (st.memory):
//   { changes (today's routine changes), faces (new faces met today: each counts once), kinds: { newFace, room, seat, missed } today, hist: [changes a day], status
//     'steady' | 'unsettled', sessions (personalised sessions, ever), lastSession: { day, theme, with } | null,
//     choice: { score, min, honoured }, stim: { level, highHours }, family: { connection }, walk: null | { kind, … },
//     walkCheck (the last quarter-hour a walk was considered) }
//
//   isMemorySupport(def) · themeOf(def, st) · newMemoryState(def) · noteChange(ms, kind) · endMemoryDay(ms, st)
//   choiceScore(st) · noteChoice(ms, st) · stimulationLift(level, highHours, mult) · validatePath(tiles, isOpen)
import { MEMORY_SUPPORT, ROUTINE_CHANGE, THEMES, THEME_FROM_STORY, CHOICE, STIMULATION, WALKING, FAMILY_CONNECTION } from '../../data/memory.js';

const clamp = (x, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));
const r2 = (x) => Math.round(x * 100) / 100;

export const isMemorySupport = (def) => def?.support === MEMORY_SUPPORT.support || (def?.needs?.memory ?? 0) >= MEMORY_SUPPORT.needLine;
// The theme of their personal sessions: from the first of their life-story tags that has one, else their story.
export function themeOf(def, st = null) {
  const tag = (st?.tags ?? def?.tags ?? []).find((t) => THEMES[t]);
  return tag ? THEMES[tag] : THEME_FROM_STORY;
}
export function newMemoryState(def) {
  return { changes: 0, kinds: {}, hist: [], status: 'steady', sessions: 0, lastSession: null, choice: { score: CHOICE.start, min: CHOICE.start, honoured: 0 }, stim: { level: 'low', highHours: 0 }, family: { connection: FAMILY_CONNECTION[def?.visitors] ?? FAMILY_CONNECTION.None }, walk: null, walkCheck: null };
}
export function noteChange(ms, kind) {
  if (!ms) return;
  ms.changes = (ms.changes ?? 0) + 1;
  ms.kinds = { ...(ms.kinds ?? {}), [kind]: (ms.kinds?.[kind] ?? 0) + 1 };
}
// The end of a day: a steady day lifts Comfort and Mood a little; an unsettled one lowers them a little. → the nudge
export function endMemoryDay(ms, st) {
  if (!ms) return null;
  const R = ROUTINE_CHANGE;
  const n = Math.min(R.maxChanges, ms.changes ?? 0);
  let nudge = { comfort: 0, mood: 0 };
  if (n === 0) nudge = { ...R.steady };
  else if (n >= R.unsettledAt) nudge = { comfort: R.perChange.comfort * (n - R.unsettledAt + 1), mood: R.perChange.mood * (n - R.unsettledAt + 1) };
  for (const [k, v] of Object.entries(nudge)) st.outcomes[k] = clamp(st.outcomes[k] + v);
  ms.hist = [...(ms.hist ?? []), ms.changes ?? 0].slice(-R.days);
  ms.status = routineStatus(ms);
  ms.changes = 0;
  ms.kinds = {};
  ms.faces = [];
  return nudge;
}
export function routineStatus(ms) {
  const h = ms?.hist ?? [];
  if (!h.length) return 'steady';
  return h.reduce((a, b) => a + b, 0) / h.length >= ROUTINE_CHANGE.unsettledAvg ? 'unsettled' : 'steady';
}
// The Choice score now: less for each option on their plan they dislike or refuse.
export function choiceScore(st) {
  let s = CHOICE.start;
  for (const id of Object.values(st?.plan ?? {})) {
    const p = st?.optionPrefs?.[id];
    if (p === 'dislike') s += CHOICE.disliked;
    else if (p === 'refuse') s += CHOICE.refused;
  }
  return clamp(s);
}
export function noteChoice(ms, st) {
  if (!ms) return;
  const s = choiceScore(st);
  ms.choice = { ...ms.choice, score: s, min: Math.min(ms.choice?.min ?? CHOICE.start, s) };
}
export function honour(ms) {
  if (ms) ms.choice = { ...ms.choice, honoured: (ms.choice?.honoured ?? 0) + 1 };
}
// An hour's Comfort change from where they are: a high place for long lowers it a little; a quiet one lifts it.
export function stimulationLift(level, highHours, mult = 1) {
  const S = STIMULATION;
  if (level === 'high') return highHours > S.highAfter ? S.highComfort : 0;
  return (S.lowComfort[level] ?? 0) * mult;
}
// A walking path: minTiles–maxTiles open, distinct tiles, each next to the one before, the last next to the first.
// → { ok, reason }
export function validatePath(tiles, isOpen) {
  const P = WALKING.path;
  if (!Array.isArray(tiles) || tiles.length < P.minTiles) return { ok: false, reason: `A walking path needs at least ${P.minTiles} tiles` };
  if (tiles.length > P.maxTiles) return { ok: false, reason: `A walking path can be up to ${P.maxTiles} tiles` };
  const seen = new Set();
  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i];
    const k = `${t.col},${t.row}`;
    if (seen.has(k)) return { ok: false, reason: 'The path crosses itself' };
    seen.add(k);
    if (!isOpen(t.col, t.row)) return { ok: false, reason: 'The path must stay on open floor' };
    const n = tiles[(i + 1) % tiles.length];
    if (Math.abs(n.col - t.col) + Math.abs(n.row - t.row) !== 1) return { ok: false, reason: 'The path must be one loop, tile by tile' };
  }
  return { ok: true, reason: null };
}
export const walkChance = (ms) => WALKING.chancePerHour * (ms?.status === 'unsettled' ? WALKING.unsettledMult : 1);
export { r2 };
