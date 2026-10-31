// Clinical care (Milestone 18, bible §16): round safety, round issues, alerts (a hidden severity, a plain word, noticing),
// the six high-level actions and how well each resolves an alert, and the home's Clinical Safety score. Pure rules on
// plain state, so the Node tests use them as they are; the home world runs the rounds, tasks, visits and transfers.
// No real medicines, amounts or diagnoses anywhere.
//
// The home's clinical state (care.clinical):
//   { rounds: { 'day:at': round }, alerts: [alert], nextAlert, days: [{ day, rounds: [safety], obs: { done, missed },
//     issues, closed, well }], issues (ever), transfers (ever), visits: [{ day, alerts: [ids] }] }
// A round: { day, at, name, by (the nurse), collected (abs hour) | null, safety | null, parts, stops, done, late, missed,
//   issues: [{ resident, kind }] }
// An alert: { id, resident, severity, word, onset (abs hour), noticed (abs hour) | null, late (shown itself), status:
//   'open' | 'resolved', actions: [{ action, by: 'player' | 'auto', at, result: 'well' | 'overdone' | 'lingering' |
//   null }], pending: null | { action, … }, autoAt, autoStep, closed, how }
//
//   roundSafety(parts) → { safety, parts } · issueChance(safety) · alertChance({ support, clinicalNeed, misses })
//   rollSeverity(rng, { misses, support }) · wordFor(rng, severity) · bigger(severity)
//   resolveChance(action, severity, mods) · resultOf(action, severity, resolved, mods) · suggestOption(word, current)
//   clinicalScore(state, now) · ensureClinical(saved) · dayRecord(state, day)
import { SAFETY, ISSUES, ALERT_CHANCE, SEVERITIES, SEVERITY_ROLL, ALERT_WORDS, ACTIONS, SEVERITY_SIZE, NURSE_SKILL, PLAN_SUGGEST, TREATMENT_ROOM, CLINICAL_SCORE } from '../../data/clinical.js';

const clamp = (x, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));
const r1 = (x) => Math.round(x * 10) / 10;

export function newClinicalState() {
  return { rounds: {}, alerts: [], nextAlert: 1, days: [], issues: 0, transfers: 0, visits: [] };
}
export function ensureClinical(saved) {
  const fresh = newClinicalState();
  if (!saved || typeof saved !== 'object') return fresh;
  return { ...fresh, ...saved, rounds: { ...(saved.rounds ?? {}) }, alerts: [...(saved.alerts ?? [])], days: [...(saved.days ?? [])], visits: [...(saved.visits ?? [])] };
}
// The day's record (made when first needed; the last CLINICAL_SCORE.alertDays days are kept).
export function dayRecord(state, day) {
  let d = state.days.find((x) => x.day === day);
  if (!d) {
    d = { day, rounds: [], obs: { done: 0, missed: 0 }, issues: 0, closed: 0, well: 0 };
    state.days.push(d);
    state.days.sort((a, b) => a.day - b.day);
    while (state.days.length > CLINICAL_SCORE.alertDays + 1) state.days.shift();
  }
  return d;
}

// --- round safety ---------------------------------------------------------------------------------------------------------
// parts = { cln, queued (tasks only a nurse can do waiting this band), nurses (on shift), stops (residents on the round),
//   medRoom (F02 placed), governance (F28 placed), levels: [support level of each resident on it], plans: [their CL
//   option], complexPct (Complex Care Lead), trained (the Medication specialty), alerts (unresolved, noticed) }
// → { safety 0–100, parts: { name: points } } (the card lists the parts)
export function roundSafety({ cln = 100, queued = 0, nurses = 1, stops = 1, medRoom = false, governance = false, levels = [], plans = [], complexPct = 0, trained = false, alerts = 0 } = {}) {
  const S = SAFETY;
  const out = {};
  out.nurse = r1(clamp((cln - S.cln.pivot) * S.cln.per, S.cln.min, S.cln.max));
  const perNurse = queued / Math.max(1, nurses);
  const w = Math.max(0, perNurse - S.workload.freeTasks) * S.workload.perTask + Math.max(0, stops / Math.max(1, nurses) - S.workload.freeStops) * S.workload.perStop;
  out.workload = r1(Math.max(S.workload.cap, w));
  out.medRoom = medRoom ? 0 : S.noMedRoom;
  let cx = 0;
  for (const lv of levels) if (lv >= S.complexity.levelFrom) cx += S.complexity.level;
  for (const p of plans) cx += S.complexity.plan[p] ?? 0;
  out.complexity = r1(Math.max(S.complexity.cap, cx) * (1 - complexPct / 100));
  out.training = trained ? S.trained : 0;
  out.alerts = Math.max(S.alertCap, alerts * S.alertEach);
  const sum = S.base + out.nurse + out.workload + out.medRoom + out.complexity + out.training + out.alerts;
  const mult = (1 + (medRoom ? S.medRoomPct * +medRoom : 0) / 100) * (1 + (governance ? S.governancePct * +governance : 0) / 100); // (Milestone 25c: medRoom / governance = their level × — true counts as ×1)
  return { safety: Math.round(clamp(sum * mult)), parts: out, mult: r1(mult * 100) / 100 };
}
export const issueChance = (safety) => Math.max(0, (ISSUES.below - safety) * ISSUES.perPoint);

// --- alerts ----------------------------------------------------------------------------------------------------------------
export function alertChance({ support, clinicalNeed = 0, misses = 0 }) {
  const A = ALERT_CHANCE;
  return (A.bySupport[support] ?? A.base) + clinicalNeed * A.perNeed + Math.min(A.missCap, misses * A.perMiss);
}
export function rollSeverity(rng, { misses = 0, support = null } = {}) {
  const R = SEVERITY_ROLL;
  const w = { ...R.weights };
  const shift = Math.min(w.minor, misses * R.missShift + (R.complexSupports.includes(support) ? R.complexShift : 0));
  w.minor -= shift;
  w.moderate += shift / 2;
  w.serious += shift / 2;
  let x = rng.next() * (w.minor + w.moderate + w.serious);
  for (const s of SEVERITIES) {
    if ((x -= w[s]) < 0) return s;
  }
  return 'serious';
}
export function wordFor(rng, severity) {
  const list = ALERT_WORDS[severity];
  let x = rng.next() * list.reduce((a, [, p]) => a + p, 0);
  for (const [word, p] of list) if ((x -= p) < 0) return word;
  return list[list.length - 1][0];
}
export const bigger = (severity) => SEVERITIES[Math.min(SEVERITIES.length - 1, SEVERITIES.indexOf(severity) + 1)];

// The chance an action resolves an alert. mods = { cln (the nurse's, for assess / escalate), complexPct, treatmentRoom,
// otherOption (Update care plan: they chose a different option than the one suggested) }
export function resolveChance(action, severity, { cln = null, complexPct = 0, treatmentRoom = false, otherOption = false } = {}) {
  const a = ACTIONS[action];
  let p = a.resolve[severity];
  const nurse = action === 'assess' || action === 'escalate';
  if (nurse && treatmentRoom && severity === 'moderate') p = (p + TREATMENT_ROOM.inHouse) * (1 + (TREATMENT_ROOM.pct * +treatmentRoom) / 100); // (Milestone 25c: its level ×)
  if (nurse && cln != null) p += (cln - NURSE_SKILL.pivot) * NURSE_SKILL.perCln;
  if (nurse && complexPct) p *= 1 + complexPct / 100;
  if (action === 'carePlan' && otherOption) p *= a.otherOption;
  return clamp(p, 0, 1);
}
// Right-sized: the action's size is what the severity needs (a moderate one handled in-house with the Treatment Room
// counts too). Bigger: overdone.
export function rightSized(action, severity, { treatmentRoom = false } = {}) {
  const need = SEVERITY_SIZE[severity];
  const size = ACTIONS[action].size;
  return size === need || (treatmentRoom && severity === 'moderate' && (action === 'assess' || action === 'escalate'));
}
export function resultOf(action, severity, resolved, mods = {}) {
  if (!resolved) return 'lingering';
  return ACTIONS[action].size > SEVERITY_SIZE[severity] && !rightSized(action, severity, mods) ? 'overdone' : 'well';
}
// Update care plan: the Clinical/Nursing option to suggest for this word (never the one they already have).
export function suggestOption(word, current) {
  const s = PLAN_SUGGEST[word] ?? PLAN_SUGGEST.fallback;
  if (s !== current) return s;
  return PLAN_SUGGEST.next !== current ? PLAN_SUGGEST.next : PLAN_SUGGEST.fallback;
}

// --- the Clinical Safety score ---------------------------------------------------------------------------------------------
// → { score, round (avg safety), obs (% done), well (% of closed alerts resolved well), open, issues, closed }
export function clinicalScore(state, today) {
  const S = CLINICAL_SCORE;
  const recent = state.days.filter((d) => d.day > today - S.days && d.day <= today);
  const alertDays = state.days.filter((d) => d.day > today - S.alertDays && d.day <= today);
  const rounds = recent.flatMap((d) => d.rounds);
  const round = rounds.length ? rounds.reduce((a, b) => a + b, 0) / rounds.length : S.noRounds;
  const done = recent.reduce((a, d) => a + d.obs.done, 0);
  const missed = recent.reduce((a, d) => a + d.obs.missed, 0);
  const obs = done + missed ? (100 * done) / (done + missed) : 100;
  const closed = alertDays.reduce((a, d) => a + d.closed, 0);
  const wellN = alertDays.reduce((a, d) => a + d.well, 0);
  const well = closed ? (100 * wellN) / closed : 100;
  const open = state.alerts.filter((a) => a.status === 'open' && a.noticed != null).length;
  const issues = recent.reduce((a, d) => a + d.issues, 0);
  const score = Math.round(clamp(S.round * round + S.obs * obs + S.well * well + S.openEach * open + S.issueEach * issues));
  return { score, round: Math.round(round), obs: Math.round(obs), well: Math.round(well), open, issues, closed };
}
