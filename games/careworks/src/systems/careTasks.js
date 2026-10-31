// Daily care tasks and the staff AI's scoring (Milestone 4, bible §9, §15, §6 Familiar Care). Pure rules on plain
// state, so the Node tests use them as they are; the home world (src/systems/homeWorld.js) walks people to the tasks.
//
// The run's care state (in the run save):
//   { tasks: [task], nextId, gen: { 'day:band': true }, bells: { residentId: { log, count, totalMin, cooldownUntil } },
//     relations: { 'RES01|CW01': record }, friendships (Milestone 13, src/systems/relationships.js), keyWorkers: { residentId: staffId }, counts: { done, missed, essentialMissed,
//     refused, self, unstaffed } }
// Familiar Care (Milestone 4 → Milestone 12): one record per resident–staff pair —
//   { familiarity 0–100, tasks (done together), firstDay, lastDay (game days; null in a record upgraded from an M4–M11
//     counter), history: [{ day, who: 'resident' | 'staff', event: 'left' | 'back' }] }
//   A record is never removed: when either of them leaves, a 'left' entry is added, and a returning resident or a
//   re-hired staff member resumes it ('back'). No Mood or continuity effects yet (Milestone 13).
// A task:
//   { id, type, name, resident, source: 'routine' | 'plan' | 'need' | 'bell', stepId?, optionId?, domain?, place:
//     'step' | 'resident' | 'room', at (the hour it is for: his step's time, or the plan's), roles, minutes, urgency, essential, drops, outcomes, pref?, day, band, opens, due
//     (absolute game hours: day × 24 + hour), status: 'open' | 'claimed' | 'working' | 'done' | 'missed' | 'refused' |
//     'self' | 'unstaffed', slots: [staffId | null] (core/AssignmentSystem), pinned, staffable, reached, workLeft,
//     ringAt?, need? }
//   open → claimed (someone is on the way) → working (at his side) → done. Not done by `due`: missed if someone who
//   could do it was on shift (his need keeps rising, the log says so), else unstaffed. refused: he said no (bible §6):
//   final, never retried in that band. self: a routine step he managed on his own (no one on shift).
//
//   ensureCareState(saved) · bandInstance(hour, totalDays) → { band, day, key } · bandEnd(band, day)
//   generateBand({ care, st, band, day, now, rolesOnShift, stepOver, only }) → new tasks
//   scorePair({ task, person, tiles, keyWorker, mostFamiliar, doneThisBand }) → number | null (null = may not)
//   choosePairs(tasks, people, score) → [{ task, person }]   the best pair first, each person and task once
//   changePlan(care, st, domain, optionId, ctx) → { from, to }   · closeDue(care, now) → closed tasks
//   maybeRing(care, st, now) → bell task | null · recordResponse(care, residentId, rec) · bellSummary(care, residentId)
//   addFamiliarity(care, residentId, staffId, n?, day?) · familiarityOf · relationOf · mostFamiliar(care, residentId, staffIds)
//   topFamiliar(care, { residentId | staffId }, among, n) → [record] · noteLeft / noteBack(care, { residentId | staffId }, day)
//   upgradeFamiliarity(care)   an M4–M11 counter map (care.familiarity) → records
// Milestone 8: a plan option the resident refuses (st.optionPrefs) still makes its tasks, but each is refused the
// moment it comes up (status 'refused', optionRefused: true — the home world logs it) and its routine-step changes
// don't apply; no score, pin or shortage can take a refused task. A disliked option's tasks are said no to at the
// dislike chance, decided when the helper arrives (like the M4 group activity). An option's removes take the staff help
// off those routine steps (they manage them on their own).
import { Rng } from '../../../../core/Rng.js';
import { TASK_TYPES, ROUTINE_TASKS, NEED_TASKS, BELL, FAMILIARITY, SCORING, PLAN_CHANGE, ALSO_HELP, TYPE_FIRST } from '../../data/tasks.js';
import { SPECIALTY_SCORE } from '../../data/training.js';
import { DOMAINS, optionById, domainById, ensurePlan } from '../../data/carePlans.js';
import { ROUTINE, BANDS, PREF_RULES } from '../../data/routine.js';
import { NEEDS } from '../../data/residents.js';
import { routineFor } from './residentNeeds.js';

const KEEP_DAYS = 2; // tasks kept in the save: today and yesterday (the card shows today's)
export const OPEN = ['open', 'claimed', 'working'];
export const isOpen = (t) => OPEN.includes(t.status);
export const absHour = (day, hour) => day * 24 + hour;

export function newCareState() {
  return { tasks: [], nextId: 1, gen: {}, bells: {}, relations: {}, friendships: {}, keyWorkers: {}, counts: { done: 0, missed: 0, essentialMissed: 0, refused: 0, self: 0, unstaffed: 0 } };
}
export function ensureCareState(saved) {
  const fresh = newCareState();
  if (!saved || typeof saved !== 'object') return fresh;
  return upgradeFamiliarity({
    ...fresh,
    ...saved,
    tasks: Array.isArray(saved.tasks) ? saved.tasks : [],
    gen: { ...(saved.gen ?? {}) },
    bells: { ...(saved.bells ?? {}) },
    relations: Object.fromEntries(Object.entries(saved.relations ?? {}).map(([k, r]) => [k, { ...r, history: [...(r.history ?? [])] }])),
    friendships: Object.fromEntries(Object.entries(saved.friendships ?? {}).map(([k, r]) => [k, { ...r }])), // (Milestone 13; an M12 save: none)
    keyWorkers: { ...(saved.keyWorkers ?? {}) },
    counts: { ...fresh.counts, ...(saved.counts ?? {}) },
  });
}
export { ensurePlan };

// --- bands ------------------------------------------------------------------------------------------------------
const bandById = (id) => BANDS.find((b) => b.id === id);
const inBand = (b, hour) => (b.from < b.to ? hour >= b.from && hour < b.to : hour >= b.from || hour < b.to);
export const bandOfHour = (hour) => BANDS.find((b) => inBand(b, hour));
// The band on now and the day it started (the night band starts at 22:00 and runs past midnight).
export function bandInstance(hour, totalDays) {
  const band = bandOfHour(hour);
  const day = band.from > band.to && hour < band.to ? totalDays - 1 : totalDays;
  return { band, day, key: `${day}:${band.id}` };
}
export const bandStart = (band, day) => absHour(day, band.from);
export const bandEnd = (band, day) => absHour(band.from < band.to ? day : day + 1, band.to);
// The end of a named deadline band, for a task that opens at `at` on `day`.
function dueOf(bandId, day, at) {
  const b = bandById(bandId);
  let end = bandEnd(b, day);
  if (end <= absHour(day, at)) end += 24; // (never with the data as it is)
  return end;
}

// --- generation ---------------------------------------------------------------------------------------------------
function makeTask(care, fields) {
  const type = TASK_TYPES[fields.type];
  const t = {
    id: `t${care.nextId++}`,
    urgency: type.urgency,
    essential: type.essential,
    drops: {},
    outcomes: {},
    status: 'open',
    slots: [null],
    pinned: null,
    staffable: false,
    reached: false,
    workLeft: null,
    ...fields,
  };
  t.workLeft ??= t.minutes / 60;
  return t;
}

// What a routine step's task looks like under a plan: its roles, time and extra drops (an option's `changes`).
const refuses = (optionPrefs, id) => optionPrefs?.[id] === 'refuse';
export function routineTemplate(step, plan, optionPrefs = null) {
  const base = ROUTINE_TASKS[step.id];
  const out = { type: base.type, band: base.band, minutes: step.minutes ?? base.minutes, roles: [...step.roles], drops: { ...step.drops }, changedBy: [] };
  for (const d of DOMAINS) {
    const o = optionById(plan[d.id]);
    if (refuses(optionPrefs, o?.id)) continue; // (Milestone 8) they refuse it: the step stays as it was
    for (const c of o?.changes ?? []) {
      if (c.step !== step.id) continue;
      if (c.minutes) out.minutes = c.minutes;
      if (c.roles) out.roles = [...c.roles];
      for (const [n, v] of Object.entries(c.dropsAdd ?? {})) out.drops[n] = (out.drops[n] ?? 0) + v;
      out.changedBy.push(o.id);
    }
  }
  return out;
}

// The tasks one band makes for one resident: his routine steps that start in it, his plan's tasks that open in it, and
// a task for any need at or over the line. Nothing is planned for a band with no one on shift (he manages on his own,
// as in Milestone 3). rolesOnShift(bandId) → Set of the roles rostered in that band; stepOver(stepId, day) → true when
// that step has already run today; only = { domain } (a care-plan change: that domain's tasks only).
// steps (Milestone 14): the resident's steps for that day (their wake-up, and the day's activity sessions); none: their
// routine without sessions' changes.
export function generateBand({ care, st, band, day, now = -Infinity, rolesOnShift, stepOver = () => false, only = null, steps = null }) {
  const roles = rolesOnShift(band.id);
  if (!roles || roles.size === 0) return [];
  const plan = ensurePlan(st.plan);
  const out = [];
  const add = (fields) => {
    if (fields.due <= now) return;
    const t = makeTask(care, { resident: st.id, day, band: band.id, ...fields });
    // Milestone 13: nurses may also help with wake-ups / morning personal care, at a penalty (data/tasks.js ALSO_HELP)
    for (const a of ALSO_HELP) {
      if (!a.types.includes(t.type) || !a.bands.includes(band.id)) continue;
      for (const r of a.roles) {
        if (t.roles.includes(r)) continue;
        t.roles = [...t.roles, r];
        t.rolePenalty = { ...(t.rolePenalty ?? {}), [r]: a.penalty };
        t.roleFrom = { ...(t.roleFrom ?? {}), [r]: (t.source === 'routine' ? Math.max(t.opens, absHour(day, t.at)) : t.opens) + a.afterHours };
      }
    }
    care.tasks.push(t);
    out.push(t);
    if (t.optionId && refuses(st.optionPrefs, t.optionId)) {
      closeTask(care, t, 'refused'); // refused the moment it comes up: never on the board
      t.optionRefused = true;
    }
  };
  const removed = new Set(DOMAINS.flatMap((d) => {
    const o = optionById(plan[d.id]);
    return o && !refuses(st.optionPrefs, o.id) ? o.removes ?? [] : [];
  }));
  if (!only) {
    for (const step of steps ?? routineFor(st)) { // (Milestone 13: their own wake-up and breakfast times; Milestone 14: the day's sessions)
      if (!ROUTINE_TASKS[step.id] || bandOfHour(step.at) !== band || stepOver(step.id, day) || removed.has(step.id)) continue;
      const tpl = routineTemplate(step, plan, st.optionPrefs);
      const opens = Math.max(absHour(day, step.at) - (ROUTINE_TASKS[step.id].lead ?? 0), bandStart(band, day));
      add({ type: tpl.type, name: step.name, source: 'routine', stepId: step.id, at: step.at, place: 'step', roles: tpl.roles, minutes: tpl.minutes, drops: tpl.drops, opens, due: dueOf(tpl.band, day, step.at), changedBy: tpl.changedBy });
    }
  }
  for (const d of DOMAINS) {
    if (only && only.domain !== d.id) continue;
    const o = optionById(plan[d.id]);
    for (const t of o?.tasks ?? []) {
      if (bandOfHour(t.at) !== band) continue;
      add({ type: t.type, name: t.name, source: 'plan', optionId: o.id, domain: d.id, at: t.at, place: t.place, roles: [...t.roles], minutes: t.minutes, drops: { ...(t.drops ?? {}) }, outcomes: { ...(t.outcomes ?? {}) }, pref: t.pref ?? null, opens: absHour(day, t.at), due: dueOf(t.band, day, t.at) });
    }
  }
  if (!only) {
    const bandTasks = care.tasks.filter((t) => t.resident === st.id && t.day === day && t.band === band.id);
    for (const n of NEEDS) {
      const def = NEED_TASKS.byNeed[n.id];
      if (!def || st.needs[n.id] < NEED_TASKS.line) continue;
      if (bandTasks.some((t) => t.drops?.[n.id] > 0 && isOpen(t))) continue;
      const opens = Math.max(bandStart(band, day) + NEED_TASKS.opensAfter, now);
      add({ type: def.type, name: def.name, source: 'need', need: n.id, at: opens % 24, place: 'resident', roles: [...def.roles], minutes: def.minutes, drops: { ...def.drops }, outcomes: {}, opens, due: bandEnd(band, day) });
    }
  }
  return out;
}

// Milestone 14: one more task from outside the band plan (a birthday visit).
export function addTask(care, fields) {
  const t = makeTask(care, fields);
  care.tasks.push(t);
  return t;
}
// Keep today's and yesterday's tasks (and anything still open).
export function pruneTasks(care, today) {
  care.tasks = care.tasks.filter((t) => isOpen(t) || t.day > today - KEEP_DAYS);
  for (const k of Object.keys(care.gen)) if (Number(k.split(':')[0]) < today - KEEP_DAYS) delete care.gen[k];
}

// --- scoring (bible §15) -------------------------------------------------------------------------------------------
// person = { id, role, energy }. Returns null when they may not take it: the role doesn't fit (a hard rule, never
// outscored), or it is pinned to someone else.
export function scorePair({ task, person, tiles = 0, keyWorker = null, mostFamiliar = null, doneThisBand = 0, specialty = false, now = Infinity, continuity = false }) {
  if (task.status === 'refused' || task.optionRefused) return null; // a refusal is never overridden (Milestone 8)
  if (!task.roles.includes(person.role)) return null;
  if (task.roleFrom?.[person.role] > now) return null; // (Milestone 13: a back-up role, not yet)
  if (task.pinned && task.pinned !== person.id) return null;
  const W = SCORING;
  let s = task.urgency * W.urgency;
  if (keyWorker && keyWorker === person.id) s += W.assigned;
  if (task.urgency < TASK_TYPES.bell.urgency && continuity) s += W.continuity * Number(continuity); // Milestone 13: their continuity group (never a bell); Milestone 17: × 2 for a memory-support resident
  if (task.urgency < TASK_TYPES.bell.urgency && mostFamiliar === person.id) s += W.familiar;
  if (specialty) s += SPECIALTY_SCORE; // Milestone 11: their specialty fits the task (a small tip, like Familiar Care)
  s -= tiles * W.perTile + doneThisBand * W.perTaskDone + (100 - (person.energy ?? 100)) * W.perEnergyUsed;
  s -= task.rolePenalty?.[person.role] ?? 0; // (Milestone 13: a nurse helping with a wake-up)
  s += TYPE_FIRST[task.type] ?? 0; // (Milestone 13: getting someone up comes first among equals)
  return s;
}
// Greedy: the best-scoring (person, task) pair first, then the best of what is left, so two people never set off for
// the same task and the most urgent work goes to whoever suits it best. score(task, person) → number | null.
export function choosePairs(tasks, people, score) {
  const pairs = [];
  for (const task of tasks) {
    for (const person of people) {
      const s = score(task, person);
      if (s != null) pairs.push({ task, person, s });
    }
  }
  pairs.sort((a, b) => b.s - a.s || (a.task.opens - b.task.opens) || (a.task.id < b.task.id ? -1 : 1));
  const usedT = new Set();
  const usedP = new Set();
  const out = [];
  for (const p of pairs) {
    if (usedT.has(p.task) || usedP.has(p.person)) continue;
    usedT.add(p.task);
    usedP.add(p.person);
    out.push(p);
  }
  return out;
}

// --- deadlines, refusals ----------------------------------------------------------------------------------------------
// Close every open task (not a bell) whose deadline has passed. A task already being worked on is let finish.
export function closeDue(care, now) {
  const closed = [];
  for (const t of care.tasks) {
    if (t.type === 'bell' || !(t.status === 'open' || t.status === 'claimed') || t.due > now) continue;
    closeTask(care, t, t.staffable ? 'missed' : 'unstaffed');
    closed.push(t);
  }
  return closed;
}
export function closeTask(care, t, status) {
  t.status = status;
  t.slots = [null];
  care.counts[status] = (care.counts[status] ?? 0) + 1;
  if (status === 'missed' && t.essential) care.counts.essentialMissed++;
}
// A task he may say no to (a plan task with a preference key): 'go' or 'refuse', fixed for that band (reloads never
// reroll).
// Milestone 8: a plan task also answers to the resident's preference for its option (the stronger of the two counts).
// dislikeMult (Milestone 13): a familiar helper makes a *disliked* task less likely to be refused; a refusal (chance 1)
// is never changed.
export function decideTask(st, task, seed = 'careworks', dislikeMult = 1) {
  const keyPref = task.pref ? st.prefs?.[task.pref] ?? 'accept' : null;
  const byKey = keyPref ? PREF_RULES[keyPref].refuseChance * (keyPref === 'dislike' ? dislikeMult : 1) : 0;
  const op = task.optionId ? st.optionPrefs?.[task.optionId] : null;
  const byOption = op === 'dislike' || op === 'refuse' ? PREF_RULES[op].refuseChance * (op === 'dislike' ? dislikeMult : 1) : 0; // (an accepted option: as M4)
  if (!task.pref && !byOption) return 'go';
  const chance = Math.max(byKey, byOption);
  if (chance >= 1) return 'refuse';
  if (chance <= 0) return 'go';
  return new Rng(`${seed}:${st.id}:${task.day}:${task.band}:${task.pref ?? task.optionId}`).next() < chance ? 'refuse' : 'go';
}

// --- the care plan ---------------------------------------------------------------------------------------------------
// Change one domain's option. It shapes tomorrow's tasks, and today's too where that part hasn't happened yet: that
// domain's open (unclaimed) tasks of the band on now are taken away and the new option's are added (but not one whose
// kind has already been done today), and routine steps not yet under way take the new option's changes.
//   ctx = { day, band, now, rolesOnShift, stepOver, roleOf(staffId) → role }
export function changePlan(care, st, domain, optionId, ctx) {
  const o = optionById(optionId);
  if (!o || o.domain !== domain) return { ok: false, reason: 'That option is not in this domain.' };
  st.plan = ensurePlan(st.plan);
  const from = st.plan[domain];
  if (from === optionId) return { ok: true, from, to: optionId, changed: false };
  st.plan[domain] = optionId;
  const today = care.tasks.filter((t) => t.resident === st.id && t.day === ctx.day);
  const done = today.filter((t) => t.domain === domain && t.status !== 'open'); // already under way or over today
  care.tasks = care.tasks.filter((t) => !(t.resident === st.id && t.day === ctx.day && t.domain === domain && t.status === 'open'));
  if (care.gen[`${ctx.day}:${ctx.band.id}`]) {
    const added = generateBand({ care, st, band: ctx.band, day: ctx.day, now: ctx.now + PLAN_CHANGE.minHoursLeft, rolesOnShift: ctx.rolesOnShift, only: { domain } });
    for (const t of added) {
      if (done.some((d) => d.type === t.type && d.band === t.band)) care.tasks.splice(care.tasks.indexOf(t), 1);
    }
  }
  const plan = st.plan;
  for (const t of care.tasks) {
    // a step no one has started helping with yet (open, or someone on the way) takes the new option's changes
    if (t.resident !== st.id || t.source !== 'routine' || !(t.status === 'open' || t.status === 'claimed') || t.day !== ctx.day) continue;
    const base = ROUTINE.find((x) => x.id === t.stepId);
    if (!base || base.activity) continue; // (Milestone 14: an activity session's task follows its activity, not the plan)
    const tpl = routineTemplate(base, plan, st.optionPrefs);
    Object.assign(t, { roles: tpl.roles, minutes: tpl.minutes, drops: tpl.drops, workLeft: tpl.minutes / 60, changedBy: tpl.changedBy });
    if (t.status === 'claimed' && !ctx.roleOf?.(t.slots[0])?.split(',').some((r) => t.roles.includes(r))) {
      t.status = 'open'; // the person on the way no longer fits: back on the board (the home world lets them go)
      t.slots = [null];
    }
  }
  return { ok: true, from, to: optionId, changed: true, text: `Care plan changed: ${domainById(domain).name} → ${o.name}` };
}

// --- call bells --------------------------------------------------------------------------------------------------------
export function bellState(care, residentId) {
  care.bells[residentId] ??= { log: [], count: 0, totalMin: 0, cooldownUntil: -1 };
  return care.bells[residentId];
}
export const openBell = (care, residentId) => care.tasks.find((t) => t.resident === residentId && t.type === 'bell' && isOpen(t)) ?? null;
// He rings when a need reaches the line (the highest one), unless a bell is already ringing or he rang a moment ago.
export function maybeRing(care, st, now, day) {
  if (openBell(care, st.id)) return null;
  const b = bellState(care, st.id);
  if (now < b.cooldownUntil) return null;
  let need = null;
  for (const n of NEEDS) if (st.needs[n.id] >= BELL.line && (!need || st.needs[n.id] > st.needs[need])) need = n.id;
  if (!need) return null;
  const t = makeTask(care, { type: 'bell', name: 'Call bell', resident: st.id, source: 'bell', need, place: 'resident', roles: [...BELL.roles], minutes: BELL.minutes, drops: { [need]: BELL.drop }, outcomes: {}, day, band: bandOfHour(now % 24).id, opens: now, due: 1e9, ringAt: now });
  care.tasks.push(t);
  return t;
}
// rec = { day, t (clock text), minutes, staffId, need }
export function recordResponse(care, residentId, rec) {
  const b = bellState(care, residentId);
  b.log.push(rec);
  if (b.log.length > BELL.keep) b.log.shift();
  b.count++;
  b.totalMin += rec.minutes;
}
export function bellSummary(care, residentId) {
  const b = bellState(care, residentId);
  const last = b.log.slice(-BELL.shown);
  const avg = last.length ? last.reduce((a, r) => a + r.minutes, 0) / last.length : null;
  return { last, avg, count: b.count, allAvg: b.count ? b.totalMin / b.count : null };
}

// --- Familiar Care ----------------------------------------------------------------------------------------------------
const famKey = (residentId, staffId) => `${residentId}|${staffId}`;
const HISTORY_KEEP = 12; // history entries kept per record
const newRelation = (residentId, staffId, day = null) => ({ resident: residentId, staff: staffId, familiarity: 0, tasks: 0, firstDay: day, lastDay: day, history: [] });
export const relationOf = (care, residentId, staffId) => care.relations[famKey(residentId, staffId)] ?? null;
export const familiarityOf = (care, residentId, staffId) => relationOf(care, residentId, staffId)?.familiarity ?? 0;
// A task done together: familiarity +n (capped), one more task, the day they last worked together (and first met).
// light (Milestone 15/16): the share of a whole task this contact did not bring (a drinks-round stop 0.75, a meal served 0.5),
// added to r.light — so familiarity = tasks − light when nothing has faded.
export function addFamiliarity(care, residentId, staffId, n = FAMILIARITY.perTask, day = null, light = 0) {
  const k = famKey(residentId, staffId);
  const r = (care.relations[k] ??= newRelation(residentId, staffId, day));
  r.familiarity = Math.min(FAMILIARITY.cap, Math.round((r.familiarity + n) * 100) / 100);
  r.tasks++;
  if (light) r.light = Math.round(((r.light ?? 0) + light) * 100) / 100;
  if (day != null) {
    r.firstDay ??= day;
    r.lastDay = day;
  }
  return r.familiarity;
}
// The records of one resident (or one staff member), best first, among these ids of the other side (none: all).
export function topFamiliar(care, { residentId = null, staffId = null }, among = null, n = 3) {
  const keep = among && new Set(among);
  return Object.values(care.relations)
    .filter((r) => (residentId ? r.resident === residentId : r.staff === staffId) && r.familiarity > 0)
    .filter((r) => !keep || keep.has(residentId ? r.staff : r.resident))
    .sort((a, b) => b.familiarity - a.familiarity || b.tasks - a.tasks)
    .slice(0, n);
}
// Milestone 13: the end of a day — a pair who are both here but did not work together that day fade a little.
export function fadeFamiliarity(care, day, residentIds, staffIds, n = FAMILIARITY.fadePerDay) {
  const res = new Set(residentIds);
  const staff = new Set(staffIds);
  for (const r of Object.values(care.relations)) {
    if (!res.has(r.resident) || !staff.has(r.staff) || r.lastDay === day || r.familiarity <= 0) continue;
    r.familiarity = Math.max(0, Math.round((r.familiarity - n) * 100) / 100);
  }
}
// Someone left (a resident went home, a staff member was let go) or came back: a history entry on each of their records.
function note(care, { residentId = null, staffId = null }, day, event) {
  const who = residentId ? 'resident' : 'staff';
  for (const r of Object.values(care.relations)) {
    if (residentId ? r.resident !== residentId : r.staff !== staffId) continue;
    r.history.push({ day, who, event });
    if (r.history.length > HISTORY_KEEP) r.history.shift();
  }
}
export const noteLeft = (care, who, day) => note(care, who, day, 'left');
export const noteBack = (care, who, day) => note(care, who, day, 'back');
// An M4–M11 save's counters ({ 'RES01|CW01': n }) become records: familiarity and tasks n, days unknown (null).
export function upgradeFamiliarity(care) {
  care.relations ??= {};
  for (const [k, n] of Object.entries(care.familiarity ?? {})) {
    if (care.relations[k] || !(n > 0)) continue;
    const [residentId, staffId] = k.split('|');
    care.relations[k] = { ...newRelation(residentId, staffId), familiarity: Math.min(FAMILIARITY.cap, n), tasks: n };
  }
  delete care.familiarity;
  return care;
}
// The single most familiar of these staff (ties go to the first in team order); null while nobody has any.
export function mostFamiliar(care, residentId, staffIds) {
  let best = null;
  let bestN = 0;
  for (const id of staffIds) {
    const n = familiarityOf(care, residentId, id);
    if (n > bestN) {
      best = id;
      bestN = n;
    }
  }
  return best;
}
