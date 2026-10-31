// Specialist programs (Milestone 20, bible §23): unlocks, the staff hours a program takes from the roster, the weekly
// cost, and who it may be offered to. Pure rules on plain state; the home world runs the sessions and the effects
// (src/systems/homeWorld.js), data in data/programs.js.
//
// The run's program state (care.programs, saved with the care state):
//   { running: { PRG01: run }, history: [{ day, id, what, amount? }], debug: bool, meetings: { residentId: day } }
//   a run: { id, wing, since (day started), paidTo (paid up to this day), paid (Credits so far), sessions (held),
//            offered, joined, declined, residents: { residentId: { joined, declined } } }
//
//   unlockOf(def, ctx) → { ok, reason, lock }   ctx = { facilities: Set, roles: Set, night: bool, debug: bool, researched(nodeId),
//                                                       secretOpen(flag) (Milestone 31: a prestige program's unlock flag) }
//   shiftHours(shiftId) · rosteredHours(people, roles, shift) · committedHours(state, roles, shift, exceptId)
//   hoursFor(def, ctx) → { need, rostered, committed, free, ok, text }
//   vetoOf(def, st) → a plain reason (they refuse an option it is part of, or group activities), or null
//   weeksDue(run, day) → whole weeks to pay for · daysUnpaid(run, day)
import { PROGRAMS, LOCKS, PROGRAM_RULES } from '../../data/programs.js';
import { SHIFTS } from '../../data/balance.js';
import { facilityById } from '../../data/facilities.js';
import { ROLES } from '../../data/roles.js';
import { optionById } from '../../data/carePlans.js';

export function newProgramState() {
  return { running: {}, history: [], debug: false, meetings: {} };
}
// An older save (Milestone 19 and before) has none: no programs running.
export function ensureProgramState(saved) {
  const fresh = newProgramState();
  if (!saved) return fresh;
  const running = {};
  for (const [id, r] of Object.entries(saved.running ?? {})) {
    if (!PROGRAMS.some((x) => x.id === id)) continue; // (Milestone 31: a prestige one runs only once started through its flag)
    running[id] = { id, wing: r.wing ?? 'home', since: r.since ?? 0, paidTo: r.paidTo ?? r.since ?? 0, paid: r.paid ?? 0, sessions: r.sessions ?? 0, offered: r.offered ?? 0, joined: r.joined ?? 0, declined: r.declined ?? 0, residents: Object.fromEntries(Object.entries(r.residents ?? {}).map(([k, v]) => [k, { joined: v.joined ?? 0, declined: v.declined ?? 0 }])) };
  }
  return { ...fresh, ...saved, running, history: [...(saved.history ?? [])], meetings: { ...(saved.meetings ?? {}) }, debug: !!saved.debug };
}
export function newRun(id, day, wing = 'home') {
  return { id, wing, since: day, paidTo: day, paid: 0, sessions: 0, offered: 0, joined: 0, declined: 0, residents: {} };
}

// --- unlocks ----------------------------------------------------------------------------------------------------------
const roleName = (r) => ROLES[r]?.name ?? r;
const ruleText = (r) => {
  if (r.type === 'facility') return `Needs a ${facilityById(r.facility)?.name ?? r.facility} (${r.facility})`;
  if (r.type === 'role') return `Needs a ${roleName(r.role)} on the team`;
  return LOCKS[r.type]?.text(r) ?? 'Locked';
};
export function unlockOf(def, ctx) {
  if (!def) return { ok: false, reason: 'No such program', lock: 'secret' };
  // (Milestone 31) a prestige program exists for the player only once its secret's flag is set — never by ?debug=1
  if (def.secret && !def.unlock.every((r) => r.type !== 'secret' || !!ctx.secretOpen?.(r.flag))) return { ok: false, reason: 'No such program', lock: 'secret' };
  for (const r of def.unlock) {
    let ok;
    if (r.type === 'secret') ok = true; // (checked above)
    else if (r.type === 'facility') ok = !!ctx.facilities?.has(r.facility);
    else if (r.type === 'role') ok = !!ctx.roles?.has(r.role);
    else if (r.type === 'night') ok = !!ctx.night;
    else if (r.type === 'research') ok = !!ctx.researched?.(r.node) || !!ctx.debug; // (Milestone 21: the node is done)
    else if (r.type === 'wing') ok = !!ctx.wings?.has(r.id) || !!ctx.debug; // (Milestone 27: the wing works — its hub stands inside it)
    else if (r.type === 'partner') ok = !!ctx.debug; // (Milestone 23: ?debug=1 only)
    else ok = false;
    if (!ok) return { ok: false, reason: ruleText(r), lock: r.type };
  }
  return { ok: true, reason: null, lock: null };
}
// Every rule in words (the sheet's "Unlock" line).
export const unlockWords = (def) => def.unlock.map(ruleText).map((t) => t.replace(/^Needs /, '')).join(' + ');

// --- staff hours ------------------------------------------------------------------------------------------------------
export function shiftHours(shiftId) {
  const t = SHIFTS[shiftId];
  if (!t) return 0;
  return t.from < t.to ? t.to - t.from : 24 - t.from + t.to;
}
// people: [{ id, role, shift (their own shift id or null), training }]
export function rosteredHours(people, roles, shift) {
  const n = people.filter((q) => roles.includes(q.role) && q.shift === shift && !q.training).length;
  return n * shiftHours(shift) * PROGRAM_RULES.daysPerWeek;
}
export function committedHours(state, roles, shift, exceptId = null) {
  let h = 0;
  for (const id of Object.keys(state.running)) {
    if (id === exceptId) continue;
    const s = PROGRAMS.find((x) => x.id === id)?.resources.staff;
    if (s && s.shift === shift && s.roles.some((r) => roles.includes(r))) h += s.hours;
  }
  return h;
}
const rolesWord = (roles) => roles.map((r) => ROLES[r]?.short ?? r).join(' / ');
// The program's hours against the roster: { need, rostered, committed (by the other running programs), free, ok, text }
export function hoursFor(def, { people, state }) {
  const s = def.resources.staff;
  const rostered = rosteredHours(people, s.roles, s.shift);
  const committed = committedHours(state, s.roles, s.shift, def.id);
  const free = rostered - committed;
  const shift = SHIFTS[s.shift].name;
  return { need: s.hours, rostered, committed, free, ok: free >= s.hours, roles: s.roles, shift: s.shift, text: `${rolesWord(s.roles)} on ${shift}: ${s.hours} h a week (${rostered} h rostered${committed ? `, ${committed} h used by other programs` : ''})` };
}

// --- choice -----------------------------------------------------------------------------------------------------------
// A refusal is never overridden: an option they refuse that the program is part of, or group activities they refuse.
export function vetoOf(def, st) {
  for (const o of def.veto?.options ?? []) if (st?.optionPrefs?.[o] === 'refuse') return `refuses ${optionById(o)?.name ?? o} (a plan option)`;
  if (def.veto?.group && st?.prefs?.groupActivity === 'refuse') return 'prefers not to join group activities';
  return null;
}

// --- the week ---------------------------------------------------------------------------------------------------------
export const weeksDue = (run, day) => Math.max(0, Math.floor((day - run.paidTo) / PROGRAM_RULES.daysPerWeek));
export const daysUnpaid = (run, day) => Math.max(0, day - run.paidTo);
export const weeklyCostOf = (id) => PROGRAMS.find((x) => x.id === id)?.resources.weeklyCost ?? 0;
// A count for a resident (joined / declined), kept on the run.
export function countFor(run, residentId, what) {
  if (!run) return;
  run[what] = (run[what] ?? 0) + 1;
  const r = (run.residents[residentId] ??= { joined: 0, declined: 0 });
  if (what === 'joined' || what === 'declined') r[what] += 1;
}
