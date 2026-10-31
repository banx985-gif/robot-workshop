// A resident's state and its simple, readable rules (Milestone 2, bible §6). No drawing and no walking here (the home
// world walks them), so the Node tests use it as it is.
//   newResidentState(def, { room })    a fresh state from a data/residents.js row
//   ensureResidentState(saved, def)    an older / partial save filled in with the row's defaults (M1 saves had none)
//   riseNeeds(st, hours, asleep)       needs rise over time (slower asleep)
//   driftOutcomes(st, hours)           outcomes drift towards what the needs allow
//   routineAt(hour, totalDays, steps?) which routine step is on now, and for which routine day (steps: routineFor(st))
//   wakeWindowOf(def) · wakeAtFor(def) · routineFor(st)   Milestone 13: their own wake-up (and breakfast) time
//   decide(st, step, day, seed)        'go' or 'refuse' — the same answer every time for that day (reloads never reroll)
//   completeStep(st, step, clockText)  the step happened: its drops, the Mood / activity nudges, a log line
//   refuseStep(st, step, clockText)    he said no: nothing dropped, a log line, the activity nudge if it was the activity
//   bandAt(hour) · clockText(hour) → "07:10"
import { Rng } from '../../../../core/Rng.js';
import { NEEDS, OUTCOMES } from '../../data/residents.js';
import { ensurePlan } from '../../data/carePlans.js';
import { ROUTINE, BANDS, NEED_RISE, ASLEEP_RISE, OUTCOME_TARGETS, OUTCOME_PULL, PREF_RULES, ACTIVITY_DONE, ACTIVITY_REFUSED, WAKE } from '../../data/routine.js';

const clamp = (x) => Math.max(0, Math.min(100, x));
const LOG_KEEP = 30; // entries kept in the save (the card shows the last few)

// --- Milestone 13: staggered wake-ups (data/routine.js WAKE) ---------------------------------------------------------
export const wakeWindowOf = (def) => WAKE.byPersonality[def?.personality] ?? 'usual';
// Their wake-up hour: fixed for the opening resident, else a quarter-hour slot inside their window, from their id.
export function wakeAtFor(def) {
  if (WAKE.fixed[def.id] != null) return WAKE.fixed[def.id];
  const w = WAKE.windows[wakeWindowOf(def)];
  const slots = Math.max(1, Math.round((w.to - w.from) / WAKE.slot));
  return w.from + Math.floor(new Rng(`wake:${def.id}`).next() * slots) * WAKE.slot;
}
// Their day's steps: the routine with their own wake-up, and breakfast moved later for a late riser.
const routines = new Map();
export function routineFor(st) {
  const wake = st?.wakeAt ?? ROUTINE[0].at;
  if (!routines.has(wake)) {
    const base = ROUTINE.find((x) => x.id === 'breakfast').at;
    const breakfast = Math.min(WAKE.lateBreakfastUntil, Math.max(base, wake + WAKE.breakfastAfter));
    routines.set(wake, ROUTINE.map((x) => (x.id === 'wake' ? { ...x, at: wake } : x.id === 'breakfast' ? { ...x, at: breakfast } : x)));
  }
  return routines.get(wake);
}

export function newResidentState(def, { room = null } = {}) {
  return {
    id: def.id,
    wakeAt: wakeAtFor(def), // Milestone 13: their own wake-up time
    seats: null, // Milestone 13: { dining, lounge } seat numbers (null: the one after their room number — src/systems/homeWorld.js)
    activityCounts: {}, // Milestone 13: activity step id → sessions joined (activity groups)
    favourite: null, // Milestone 13: { staff, since } — their favourite staff member (store only, for later milestones)
    diet: null, // Milestone 15: their menu tag from the Nutrition plan (data/dining.js DIETS; src/systems/dining.js dietOf)
    dining: null, // Milestone 15: { avg, n, last, favDay } — their dining satisfaction
    hydration: null, // Milestone 15: { last } — the game hour of their last drink
    mobility: null, // Milestone 16: { base, level, aid, avgNeed } (src/systems/mobility.js; null: from their profile)
    rehab: null, // Milestone 16: their rehab goals while in rehab (null: none)
    falls: null, // Milestone 16: { risk, band, parts } — stored and shown (falls themselves: Milestone 25)
    memory: null, // Milestone 17: memory support — routine changes, sessions, the Choice signal, stimulation, walks (src/systems/memory.js)
    needs: { ...def.needs },
    outcomes: { ...def.outcomes },
    prefs: { ...def.prefs },
    optionPrefs: { ...(def.optionPrefs ?? {}) }, // Milestone 8: care-plan option preferences (overrides live here too)
    tags: [...(def.tags ?? [])], // Milestone 9: life-story tags (data/lifeStories.js)
    stay: null, // Milestone 9: { type, days, fromDay, leaveDay } for a set stay (newStay); null = stays
    plan: ensurePlan(def.plan), // Milestone 4: one care-plan option per domain (data/carePlans.js)
    review: null, // Milestone 8: { day, needs, reasons } (null: the home world marks it reviewed on load / at a new game)
    missStreak: { days: 0, lastDay: null }, // Milestone 8: days running with essential care missed
    room,
    step: null, // { id, day, status: 'walking' | 'doing' | 'refused' }
    log: [], // today's log: [{ t: "07:10", text: "Woke" }]
    logDay: null, // the routine day the log belongs to
    pos: null, // { x, y } plan position (so a reload puts him back where he was)
  };
}

export function ensureResidentState(saved, def, { room = null } = {}) {
  const fresh = newResidentState(def, { room });
  if (!saved || typeof saved !== 'object') return fresh;
  const out = { ...fresh, ...saved };
  out.needs = { ...fresh.needs, ...(saved.needs ?? {}) };
  out.outcomes = { ...fresh.outcomes, ...(saved.outcomes ?? {}) };
  out.prefs = { ...fresh.prefs, ...(saved.prefs ?? {}) };
  out.optionPrefs = { ...fresh.optionPrefs, ...(saved.optionPrefs ?? {}) };
  out.missStreak = { ...fresh.missStreak, ...(saved.missStreak ?? {}) };
  out.plan = ensurePlan(saved.plan, fresh.plan); // an M1–M3 save has none: the defaults from data
  out.tags = Array.isArray(saved.tags) ? [...saved.tags] : fresh.tags; // (Milestone 9; an older save: from data)
  out.stay = saved.stay ?? null; // an older save's residents keep staying (no timer)
  out.wakeAt = saved.wakeAt ?? fresh.wakeAt; // (Milestone 13; an older save: from their personality)
  out.seats = saved.seats ? { ...saved.seats } : null;
  out.activityCounts = { ...(saved.activityCounts ?? {}) };
  out.favourite = saved.favourite ?? null;
  out.dining = saved.dining ? { ...saved.dining } : null; // (Milestone 15; an M14 save: none yet)
  out.hydration = saved.hydration ? { ...saved.hydration } : null;
  out.mobility = saved.mobility ? { ...saved.mobility } : null; // (Milestone 16; an M15 save: from their profile)
  out.rehab = saved.rehab ? { ...saved.rehab, start: { ...saved.rehab.start }, goals: { ...saved.rehab.goals }, targets: { ...saved.rehab.targets }, hist: [...(saved.rehab.hist ?? [])] } : null;
  out.falls = saved.falls ? { ...saved.falls, parts: [...(saved.falls.parts ?? [])] } : null;
  out.memory = saved.memory ? JSON.parse(JSON.stringify(saved.memory)) : null; // (Milestone 17; an M16 save: neutral, from their profile)
  out.room = saved.room ?? room;
  out.log = Array.isArray(saved.log) ? saved.log : [];
  return out;
}

// Milestone 9: a set stay (Respite, Rehab / Short Stay) of `days` from `fromDay`; they head home on day leaveDay. A new
// home's Arthur also has opening: true and paused (days added while he was the only resident — src/systems/homeWorld.js).
// days null = Long Term (no timer).
export const newStay = (def, days, fromDay) => (days == null ? null : { type: def.stay, days, fromDay, leaveDay: fromDay + days });
export const stayDaysLeft = (st, today) => (st.stay ? Math.max(0, st.stay.leaveDay - today) : null);

export function riseNeeds(st, hours, asleep = false) {
  const k = asleep ? ASLEEP_RISE : 1;
  for (const n of NEEDS) st.needs[n.id] = clamp(st.needs[n.id] + NEED_RISE[n.id] * hours * k);
}

export function outcomeTarget(st, id) {
  let t = 100;
  for (const [need, w] of Object.entries(OUTCOME_TARGETS[id])) t -= st.needs[need] * w;
  return clamp(t);
}

export function driftOutcomes(st, hours) {
  const f = 1 - Math.pow(1 - OUTCOME_PULL, hours);
  for (const o of OUTCOMES) st.outcomes[o.id] = clamp(st.outcomes[o.id] + (outcomeTarget(st, o.id) - st.outcomes[o.id]) * f);
}

// The step on at this hour. Before the first step of the morning it is still last night's final step (settle), so a
// routine day runs from wake-up to wake-up.
export function routineAt(hour, totalDays, steps = ROUTINE) {
  let i = -1;
  for (let k = 0; k < steps.length; k++) if (hour >= steps[k].at) i = k;
  if (i < 0) return { step: steps[steps.length - 1], day: totalDays - 1 };
  return { step: steps[i], day: totalDays };
}

export function bandAt(hour) {
  return BANDS.find((b) => (b.from < b.to ? hour >= b.from && hour < b.to : hour >= b.from || hour < b.to));
}

export const clockText = (hour) => {
  const m = Math.floor((((hour % 24) + 24) % 24) * 60);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

export const prefOf = (st, stepId) => st.prefs[stepId] ?? 'accept';

// dislikeMult (Milestone 13): a highly familiar helper makes a *disliked* step less likely to be refused. A refused step
// (chance 1) is never changed, and the roll is the same one (a reload never rerolls).
export function decide(st, step, day, seed = 'careworks', dislikeMult = 1) {
  if (!step.optional) return 'go'; // waking and settling always happen
  const pref = prefOf(st, step.id);
  const chance = PREF_RULES[pref].refuseChance * (pref === 'dislike' ? dislikeMult : 1);
  if (chance >= 1) return 'refuse';
  if (chance <= 0) return 'go';
  return new Rng(`${seed}:${st.id}:${day}:${step.id}`).next() < chance ? 'refuse' : 'go';
}

export function addLog(st, day, t, text) {
  if (st.logDay !== day) {
    st.log = [];
    st.logDay = day;
  }
  st.log.push({ t, text });
  if (st.log.length > LOG_KEEP) st.log.shift();
}

function nudge(st, changes) {
  for (const [id, v] of Object.entries(changes)) st.outcomes[id] = clamp(st.outcomes[id] + v);
}

// opts (Milestone 3, a helper): needMult(need) → × on that need's drop (a Founder's +6% contribution); activityMult /
// mealMult → × on the activity's Social Connection and a preferred meal's Mood (small secondary perks); note → added to
// the log line ("with Ruby", "on his own"). Returns the need points actually taken off (tests).
export function completeStep(st, step, day, t, { needMult = null, activityMult = 1, mealMult = 1, note = null } = {}) {
  const dropped = {};
  for (const [id, v] of Object.entries(step.drops ?? {})) {
    const before = st.needs[id];
    st.needs[id] = clamp(before - v * (needMult?.(id) ?? 1));
    dropped[id] = before - st.needs[id];
  }
  const mood = PREF_RULES[prefOf(st, step.id)].mood;
  const meal = step.place === 'dining';
  if (mood) nudge(st, { mood: mood > 0 && meal ? mood * mealMult : mood });
  if (step.activity) nudge(st, Object.fromEntries(Object.entries(ACTIVITY_DONE).map(([k, v]) => [k, v * activityMult])));
  addLog(st, day, t, note ? `${step.log} (${note})` : step.log);
  return dropped;
}

export function refuseStep(st, step, day, t) {
  if (step.activity) nudge(st, ACTIVITY_REFUSED);
  addLog(st, day, t, `Refused ${step.activity ? step.name : step.name.toLowerCase()}`);
}
