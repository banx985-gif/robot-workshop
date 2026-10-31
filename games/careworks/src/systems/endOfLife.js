// End of life and the Memory Book (Milestone 27, bible §2 rule 2, §22). Pure rules on plain state, so the Node tests use
// them as they are; the home world (src/systems/homeWorld.js) builds the context, runs the day and applies the results.
//
// Natural decline is never a failure: these rules never take a score, Credits or Rank away. Stages move slowly and one
// at a time (each stage has a seeded length of at least its minimum), only good care changes the pace (it slows it), and
// the comfort score judges the care, the plan, the family's support and the resident's wishes — never the passing.
//
//   newEolState() / ensureEolState(saved)        care.eol: { passings, held, pages, notes, results, lifts, nextNote }
//   ensureResidentEol(st)                        st.eol: { stage, since, due, slow, acc, offer, told }
//   stayTypeOf(def, st) · eligible(def, st)      who can enter the stages (Long Term / Palliative stays only)
//   weeklyChance({ age, years, level, good })    the Settled → Needs more support chance at a weekly check
//   stageLength(stageId, seed, residentId, n)    a stage's seeded length in days
//   newAcc() · comfortOf(acc, boosts) → { score, parts: [{ id, label, weight, value }] }
//   signalLift(score) · familyResult(score) · betterNote(parts)
//   wishesOf(def, { friend, gardenNear }) → [{ id, text }]
//   timeAt(days, daysPerMonth, monthsPerYear) → { years, months, text }
import { Rng } from '../../../../core/Rng.js';
import { STAGES, STAGE_IDS, stageById, ELIGIBLE_STAYS, PACE, COMFORT, SIGNAL, FAMILY_RESULT, BETTER, WISHES } from '../../data/endOfLife.js';

const clamp = (x) => Math.max(0, Math.min(100, x));

export function newEolState() {
  return {
    passings: [], // [{ day, resident, name }] — every passing in this campaign (the weekly gap reads it)
    held: {}, // room uid → the day it opens to admissions again
    pages: [], // this campaign's Memory Book pages (the account copy is the one kept for good: src/main.js)
    notes: [], // the Inbox's care-stage lines: [{ uid, day, resident, name, stage, text, seen }]
    results: [], // the comfort score of each end-of-life period: [{ day, resident, name, score, parts, good, poor, note }]
    lifts: [], // the good-care signal: [{ from, until, lift }] (headline-score points a day)
    grief: { staff: {} }, // staff id → Morale points still to come back (the residents' own is on their state)
    nextNote: 1,
  };
}
export function ensureEolState(saved) {
  const fresh = newEolState();
  if (!saved || typeof saved !== 'object') return fresh;
  return { ...fresh, ...saved, passings: [...(saved.passings ?? [])], held: { ...(saved.held ?? {}) }, pages: [...(saved.pages ?? [])], notes: [...(saved.notes ?? [])], results: [...(saved.results ?? [])], lifts: [...(saved.lifts ?? [])], grief: { staff: { ...(saved.grief?.staff ?? {}) } } };
}
// A resident's own end-of-life state (an older save, or a new resident: Settled).
export function ensureResidentEol(st) {
  st.eol ??= { stage: 'settled', since: null, due: null, slow: 0, acc: null, offer: null, told: [] };
  st.eol.told ??= [];
  return st.eol;
}

export const stayTypeOf = (def, st) => st?.stay?.type ?? def?.stay ?? 'Long Term';
// Living here for good: a Long Term or Palliative stay, not mid-rehab, not a test guest, not the opening respite stay.
export function eligible(def, st) {
  if (!def || !st || st.guest || st.leaving || st.passed) return false;
  if (st.rehab?.active || st.stay?.opening) return false;
  return ELIGIBLE_STAYS.includes(stayTypeOf(def, st));
}

const pick = (rows, key, v) => (rows.find((r) => v <= r[key]) ?? rows[rows.length - 1]);
export const ageMult = (age) => pick(PACE.age, 'to', age ?? 80).mult;
export function tenureMult(years) {
  let m = PACE.tenure[0].mult;
  for (const r of PACE.tenure) if (years >= r.years) m = r.mult;
  return m;
}
// The weekly chance that a Settled resident starts to need more support. Good care only ever lowers it.
export function weeklyChance({ age, years = 0, level = 3, good = false }) {
  return PACE.base * ageMult(age) * tenureMult(years) * (PACE.level[level] ?? 1) * (good ? PACE.goodCare : 1);
}
// A stage's length in days (seeded per resident and per time they enter it).
export function stageLength(stageId, seed, residentId, n = 0) {
  const d = stageById(stageId).days;
  if (!d) return null;
  return new Rng(`${seed}:eol:${stageId}:${residentId}:${n}`).int(d[0], d[1]);
}
export const nextStage = (id) => STAGE_IDS[STAGE_IDS.indexOf(id) + 1] ?? null;

// --- the comfort score ----------------------------------------------------------------------------------------------------
// The day-by-day record of the end-of-life period (the world adds one day at a time).
export function newAcc(day) {
  return { from: day, days: 0, tasksDone: 0, tasksMissed: 0, plan: 0, told: false, meeting: false, close: false, familiar: 0, wishes: 0, coverage: 0, noFamily: false };
}
export function comfortOf(acc, boosts = 0) {
  const n = Math.max(1, acc.days);
  const tasks = acc.tasksDone + acc.tasksMissed ? (100 * acc.tasksDone) / (acc.tasksDone + acc.tasksMissed) : acc.days ? 60 : 0;
  const F = COMFORT.family;
  const familiar = (100 * acc.familiar) / n;
  const values = {
    tasks,
    plan: acc.plan / n,
    family: acc.noFamily ? familiar : (acc.told ? F.told : 0) + (acc.meeting ? F.meeting : 0) + (acc.close ? F.close : 0),
    familiar,
    wishes: (100 * acc.wishes) / n,
    coverage: (100 * acc.coverage) / n,
  };
  const parts = COMFORT.parts.map((p) => ({ id: p.id, label: p.label, weight: p.weight, value: Math.round(clamp(values[p.id])) }));
  const base = parts.reduce((t, p) => t + p.weight * p.value, 0);
  return { score: Math.round(clamp(base + boosts)), base: Math.round(base), boosts, parts };
}
// The good-care signal: headline-score points a day for SIGNAL.days days (0 below the line; never negative).
export function signalLift(score) {
  if (score < SIGNAL.from) return 0;
  return Math.round(((score - SIGNAL.from) / (100 - SIGNAL.from)) * SIGNAL.max * 100) / 100;
}
// The family's last Trust result: a lift for a well-supported time, never a drop.
export function familyResult(score) {
  return Math.round(Math.max(0, Math.min(FAMILY_RESULT.max, (score - FAMILY_RESULT.from) * FAMILY_RESULT.per)) * 10) / 10;
}
// "What could have been better": the two weakest parts (below 70), in plain words.
export function betterNote(parts) {
  const weak = [...parts].filter((p) => p.value < 70).sort((a, b) => a.value - b.value).slice(0, 2);
  return weak.length ? weak.map((p) => BETTER[p.id]).join('; and ') : null;
}

// --- wishes ----------------------------------------------------------------------------------------------------------------
// From the profile: the favourite interest, who they want near, their own room or the garden.
export function wishesOf(def) {
  const room = WISHES.room.includes(def.personality);
  return [
    { id: 'interest', text: `Their favourite interest close at hand: ${String(def.interest ?? 'company').toLowerCase()}` },
    { id: 'near', text: `Who they want near: ${WISHES.near[def.visitors] ?? WISHES.near.default}` },
    { id: 'place', text: `Where they would like to be: ${room ? WISHES.roomText : WISHES.gardenText}`, garden: !room },
  ];
}

// --- time at the home --------------------------------------------------------------------------------------------------------
export function timeAt(days, daysPerMonth = 28, monthsPerYear = 12) {
  const perYear = daysPerMonth * monthsPerYear;
  const d = Math.max(0, Math.round(days));
  const years = Math.floor(d / perYear);
  const months = Math.floor((d % perYear) / daysPerMonth);
  const parts = [];
  if (years) parts.push(`${years} year${years === 1 ? '' : 's'}`);
  if (months || !years) parts.push(months ? `${months} month${months === 1 ? '' : 's'}` : `${d % daysPerMonth} day${d % daysPerMonth === 1 ? '' : 's'}`);
  return { years, months, days: d, text: parts.join(' ') };
}

export { STAGES, stageById };
