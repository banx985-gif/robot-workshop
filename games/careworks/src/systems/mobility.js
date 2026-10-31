// Mobility, rehabilitation goals and the falls-risk number (Milestone 16, bible §17). Pure rules on plain state, so the
// Node tests use them as they are; the home world (src/systems/homeWorld.js) runs the therapy steps, the discharges and
// the daily updates and calls these.
//
// A resident's mobility (st.mobility): { base, level (0–100), aid ('none' | 'stick' | 'frame' | 'wheelchair'), avgNeed }
// A resident's rehab (st.rehab, only while they are working on goals):
//   { active, startDay, start: { goal: n }, goals: { goal: n }, targets: { goal: n }, readyDay (null until every goal is
//     at target), sessions, missed, hist: [daily gain], todayGain, todayTherapy }
// Falls risk (st.falls): { risk (0–100), band, parts: [{ key, text, value }] } — stored and shown only (falls: M25).
//
//   baseLevelOf(def, needs) · aidFor(level, current?) · newMobility(def, st) · driftMobility(st, rehabRise)
//   inRehab(def, st) · newRehab(def, st, day) · gainMult({ …}) · addGain(rehab, kind, mult, traitsPct?) · endRehabDay(rehab)
//   isReady(rehab) · rehabStatus(rehab) · fallsRisk({ … })
import { AIDS, AID_LEVELS, AID_HYSTERESIS, BASE_LEVEL, PROFILE_MOBILITY, LEVEL_DRIFT, GOALS, GOAL_TARGET_AGE, GOAL_GAINS, GOAL_RULES, REHAB_STAY, REHAB_OPTION, FALLS } from '../../data/mobility.js';

const clamp = (x, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));
const r1 = (x) => Math.round(x * 100) / 100;

// --- mobility and aids -------------------------------------------------------------------------------------------------
export function baseLevelOf(def, needs = def?.needs) {
  const base = BASE_LEVEL[def?.support] ?? 75;
  const prof = PROFILE_MOBILITY[def?.support] ?? 25;
  return clamp(base - ((needs?.mobility ?? prof) - prof) * 0.5);
}
// The aid for a level; with the one they have now, a line must be passed by AID_HYSTERESIS to change.
export function aidFor(level, current = null) {
  const plain = AID_LEVELS.find((a) => level >= a.from).aid;
  if (!current || plain === current) return plain;
  const cur = AID_LEVELS.find((a) => a.aid === current);
  const i = AID_LEVELS.indexOf(cur);
  const upper = i > 0 ? AID_LEVELS[i - 1].from : Infinity; // the line to a lighter aid
  if (level >= cur.from - AID_HYSTERESIS && level < upper + AID_HYSTERESIS) return current;
  return plain;
}
export const aidSpeed = (aid) => AIDS[aid]?.speed ?? 1;
export function newMobility(def, st) {
  const base = baseLevelOf(def, def?.needs); // (their profile; their current need steers the daily drift, avgNeed)
  return { base: r1(base), level: r1(base), aid: aidFor(base), avgNeed: st?.needs?.mobility ?? def?.needs?.mobility ?? 30 };
}
// The day's drift: towards base + (needFrom − their average Mobility need) × perNeed (±maxShift) + rehabRise × share.
// → true when the aid changed
export function driftMobility(st, rehabRise = 0) {
  const m = st.mobility;
  const D = LEVEL_DRIFT;
  const shift = clamp((D.needFrom - (m.avgNeed ?? D.needFrom)) * D.perNeed, -D.maxShift, D.maxShift);
  const target = clamp(m.base + shift + rehabRise * D.rehabShare);
  m.level = r1(m.level + (target - m.level) * D.pull);
  const aid = aidFor(m.level, m.aid);
  const changed = aid !== m.aid;
  m.aid = aid;
  return changed;
}
// Their average Mobility need, updated through the day (a day-long running average).
export function noteMobilityNeed(st, hours) {
  const m = st.mobility;
  if (!m) return;
  m.avgNeed = r1((m.avgNeed ?? st.needs.mobility) + (st.needs.mobility - (m.avgNeed ?? st.needs.mobility)) * Math.min(1, hours / 24));
}

// --- rehab goals ---------------------------------------------------------------------------------------------------------
export const inRehab = (def, st) => (st?.stay?.type ?? def?.stay) === REHAB_STAY || st?.plan?.MO === REHAB_OPTION;
export function goalTarget(goal, def) {
  const over = Math.max(0, (def?.age ?? 75) - GOAL_TARGET_AGE.from);
  return Math.round(Math.max(GOAL_TARGET_AGE.min, goal.targetBase - over * GOAL_TARGET_AGE.perYear));
}
// New goals from their current needs (a new rehab resident, or an M15-era save's rehab resident).
export function newRehab(def, st, day) {
  const start = {};
  const targets = {};
  for (const g of GOALS) {
    targets[g.id] = goalTarget(g, def);
    start[g.id] = Math.round(clamp(100 - (st.needs?.[g.need] ?? 30) - g.startGap, 5, targets[g.id] - 15));
  }
  return { active: true, startDay: day, start, goals: { ...start }, targets, readyDay: null, sessions: 0, missed: 0, hist: [], todayGain: 0, todayTherapy: false };
}
// × on a gain: where the session was (THERAPY_PLACES mult), the plan (a well-matched plan helps), Mood and eating.
export function gainMult({ placeMult = 1, plan = null, mood = 70, nutritionNeed = 20 }) {
  const R = GOAL_RULES;
  let m = placeMult * (R.planMatch[plan?.MO] ?? 1);
  if (mood < R.lowMood) m *= R.lowMoodMult;
  if (nutritionNeed > R.poorNutrition) m *= R.poorNutritionMult;
  return m;
}
// A session done: kind 'therapy' | 'walk' | 'transfer' | 'self'. traitPct(goalId) → % more (the helper's rehab traits).
// → the total goal points gained
export function addGain(rehab, kind, mult = 1, traitPct = () => 0) {
  if (!rehab?.active) return 0;
  let total = 0;
  for (const [g, v] of Object.entries(GOAL_GAINS[kind] ?? {})) {
    const before = rehab.goals[g];
    rehab.goals[g] = r1(clamp(before + v * mult * (1 + traitPct(g) / 100)));
    total += rehab.goals[g] - before;
  }
  rehab.todayGain = r1((rehab.todayGain ?? 0) + total);
  if (kind === 'therapy' || kind === 'self') {
    rehab.sessions = (rehab.sessions ?? 0) + 1;
    rehab.todayTherapy = true;
  }
  return total;
}
export function missTherapy(rehab) {
  if (!rehab?.active) return;
  rehab.missed = (rehab.missed ?? 0) + 1;
  rehab.goals.confidence = r1(clamp(rehab.goals.confidence - GOAL_RULES.missedConfidence));
  rehab.todayGain = r1((rehab.todayGain ?? 0) - GOAL_RULES.missedConfidence);
}
// The end of a day: a day with no therapy fades every goal a little; the day's gain goes into the history.
export function endRehabDay(rehab) {
  if (!rehab?.active) return;
  if (!rehab.todayTherapy && !isReady(rehab)) {
    for (const g of GOALS) rehab.goals[g.id] = r1(clamp(rehab.goals[g.id] - GOAL_RULES.fadePerDay));
    rehab.todayGain = r1((rehab.todayGain ?? 0) - GOAL_RULES.fadePerDay * GOALS.length);
  }
  rehab.hist = [...(rehab.hist ?? []), rehab.todayGain ?? 0].slice(-GOAL_RULES.history);
  rehab.todayGain = 0;
  rehab.todayTherapy = false;
}
export const isReady = (rehab) => !!rehab?.active && GOALS.every((g) => rehab.goals[g.id] >= rehab.targets[g.id]);
// "Ready to go home" · "On track" (gaining at least onTrackPerDay a day over the last few days) · "Slow"
export function rehabStatus(rehab) {
  if (!rehab?.active) return null;
  if (isReady(rehab)) return 'Ready to go home';
  const h = rehab.hist ?? [];
  if (h.length < 2) return 'Just started';
  const avg = h.reduce((a, b) => a + b, 0) / h.length;
  return avg >= GOAL_RULES.onTrackPerDay ? 'On track' : 'Slow';
}
// How far along (0–1): the average share of the way from start to target.
export function rehabProgress(rehab) {
  if (!rehab?.active) return 0;
  return GOALS.reduce((a, g) => a + clamp((rehab.goals[g.id] - rehab.start[g.id]) / Math.max(1, rehab.targets[g.id] - rehab.start[g.id]), 0, 1), 0) / GOALS.length;
}
// The rise of their transfer and walking goals since they started (for their mobility level).
export const rehabRise = (rehab) => (rehab?.active ? ((rehab.goals.transfer - rehab.start.transfer) + (rehab.goals.walking - rehab.start.walking)) / 2 : 0);

// --- falls risk ------------------------------------------------------------------------------------------------------------
// level, aid · plan (their care plan: MO05, EN05) · fallsStaff (a Falls specialist on shift) · lab (F19 placed)
// (Milestone 20: program — a running Falls Prevention Program's modifier { value, text }, or null)
// (Milestone 21: research — the home's research modifier { value, text }, or null)
export function fallsRisk({ level, aid = 'none', plan = {}, fallsStaff = false, lab = false, program = null, research = null }) {
  const parts = [{ key: 'level', text: 'Mobility', value: r1((100 - level) * FALLS.perLevel) }];
  if (FALLS.aid[aid]) parts.push({ key: 'aid', text: AIDS[aid].name, value: FALLS.aid[aid] });
  if (plan.EN === 'EN05') parts.push({ key: 'EN05', text: FALLS.modifiers.EN05.text, value: FALLS.modifiers.EN05.value });
  if (plan.MO === 'MO05') parts.push({ key: 'MO05', text: FALLS.modifiers.MO05.text, value: FALLS.modifiers.MO05.value });
  if (fallsStaff) parts.push({ key: 'fallsStaff', text: FALLS.modifiers.fallsStaff.text, value: FALLS.modifiers.fallsStaff.value });
  if (program) parts.push({ key: 'program', text: program.text, value: program.value });
  if (research) parts.push({ key: 'research', text: research.text, value: research.value });
  let risk = clamp(parts.reduce((a, p) => a + p.value, 0));
  if (lab) {
    const after = risk * (1 + (FALLS.lab.mult - 1) * +lab); // (Milestone 25c: lab = its level ×; true = ×1)
    parts.push({ key: 'lab', text: FALLS.lab.text, value: r1(after - risk) });
    risk = after;
  }
  risk = Math.round(clamp(risk));
  return { risk, band: FALLS.bands.find((b) => risk >= b.from).name, parts };
}
