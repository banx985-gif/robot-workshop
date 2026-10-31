// Activities (Milestone 14, bible §20, §2.2): the weekly timetable, each resident's choice, the sessions' outcomes,
// community / visitor events (on core/EventSystem) and birthdays. Pure rules on plain state; the home world walks
// people to the sessions (src/systems/homeWorld.js).
//
// The run's activity state (care.activities, saved with the care state):
//   { timetable: [{ morning, afternoon }] (7 days), sessions: { 'day:slot': session }, bookings: { day: { event,
//     activity, liftMult } }, events (core/EventSystem state), birthdays: { first: day | null, held: { 'RES02': year } } }
//   a session: { day, slot, activity, event?, birthday?, program? / name? (Milestone 20: a running program's session), choices: { residentId: 'join' | 'maybe' | 'decline' },
//     joined: [ids], declined: [ids] }
//
//   feelingOf(def, st, activity) → 'love' | 'like' | 'neutral' | 'dislike' | 'refuse'
//   joinChance({ def, st, activity, friendsJoining, groupSize }) → 0–1        choiceBand(p) → 'join' | 'maybe' | 'decline'
//   outcomeMult(feeling, crowded, liftMult) → × on the activity's lifts
//   birthdayOf(residentId) → day of the year (1–336)
//   createActivities({ care, seed, bus, today, hostFor }) → the timetable / sessions / events controller
import { EventSystem } from '../../../../core/EventSystem.js';
import { Rng } from '../../../../core/Rng.js';
import { ACTIVITIES, activityById, TIMETABLE, CHOICE, OUTCOME, COMMUNITY_EVENTS, COMMUNITY, BIRTHDAY, dayOfWeek } from '../../data/activities.js';

const KEEP_DAYS = 14;

// --- choice -----------------------------------------------------------------------------------------------------------
export function feelingOf(def, st, activity) {
  if (!activity) return 'neutral';
  const pref = activity.prefKey ? st?.prefs?.[activity.prefKey] : null;
  if (pref === 'refuse') return 'refuse';
  const tags = new Set([...(st?.tags ?? def?.tags ?? []), def?.interest].filter(Boolean));
  const loves = activity.likes.tags.some((t) => tags.has(t)) || !!activity.likes.supports?.includes(def?.support); // (Milestone 17: by support too)
  if (pref === 'dislike' && !loves) return 'dislike';
  if (loves) return 'love';
  if (pref === 'prefer' || activity.likes.personalities.includes(def?.personality)) return 'like';
  if (activity.dislikedBy.includes(def?.personality)) return 'dislike';
  return 'neutral';
}
// The chance they join. For an activity with a routine preference (Cards) the M2 preference sets the base.
export function joinChance({ def, st, activity, friendsJoining = 0, groupSize = 0 }) {
  const feeling = feelingOf(def, st, activity);
  if (feeling === 'refuse') return 0;
  const pref = activity.prefKey ? st?.prefs?.[activity.prefKey] : null;
  let p = pref && pref !== 'accept' && feeling !== 'love' ? CHOICE.prefBase[pref] : CHOICE.base[feeling];
  if (pref === 'accept' && feeling === 'neutral') p = Math.max(p, CHOICE.prefBase.accept); // (M2: Cards "accept" stays a near-certain yes)
  const so = st?.plan?.SO;
  const noNudges = !!CHOICE.so[so]?.noNudges;
  if (!noNudges) p += Math.min(CHOICE.maxFriends, CHOICE.perFriend * friendsJoining);
  if ((st?.outcomes?.mood ?? 100) < CHOICE.lowMoodBelow) p += CHOICE.lowMood;
  if (Math.max(st?.needs?.personal ?? 0, st?.needs?.mobility ?? 0) > CHOICE.tiredNeedAbove) p += CHOICE.tired;
  const soRule = CHOICE.so[so];
  if (soRule && !noNudges) {
    if (soRule.all) p += soRule.all;
    if (soRule.quiet && activity.quiet) p += soRule.quiet;
    if (soRule.busy && (!activity.quiet || groupSize > soRule.busyAbove)) p += soRule.busy;
  }
  return Math.max(0, Math.min(1, p));
}
export const choiceBand = (p) => (p <= 0 ? 'decline' : p >= CHOICE.bands.join ? 'join' : p >= CHOICE.bands.maybe ? 'maybe' : 'decline');
export const outcomeMult = (feeling, crowded = false, liftMult = 1) => (OUTCOME.byFeeling[feeling] ?? 0.6) * (crowded ? OUTCOME.crowded : 1) * liftMult;
// The resident's birthday (day of the year), fixed from their id.
export const birthdayOf = (residentId) => 1 + Math.floor(new Rng(`birthday:${residentId}`).next() * BIRTHDAY.daysPerYear);

// --- state ------------------------------------------------------------------------------------------------------------
export function newActivityState() {
  return { timetable: TIMETABLE.days.map(() => ({ ...TIMETABLE.defaults })), sessions: {}, bookings: {}, events: null, birthdays: { first: null, held: {} } };
}
export function ensureActivityState(saved) {
  const fresh = newActivityState();
  if (!saved) return fresh;
  return {
    ...fresh,
    ...saved,
    timetable: TIMETABLE.days.map((_, i) => ({ ...TIMETABLE.defaults, ...(saved.timetable?.[i] ?? {}) })),
    sessions: Object.fromEntries(Object.entries(saved.sessions ?? {}).map(([k, s]) => [k, { ...s, choices: { ...s.choices }, joined: [...(s.joined ?? [])], declined: [...(s.declined ?? [])] }])),
    bookings: { ...(saved.bookings ?? {}) },
    birthdays: { first: saved.birthdays?.first ?? null, held: { ...(saved.birthdays?.held ?? {}) } },
  };
}

// --- the controller ---------------------------------------------------------------------------------------------------
//   care            the run's care state (care.activities is made here)
//   hostFor(roles, day, slot) → a staff id on shift then with one of these roles (null: no host)
//   isBirthday(day) → [residentIds] whose birthday it is (the home world knows who is here)
export function createActivities({ care, seed = 'careworks', bus = null, today = () => 0, hostFor = () => null, partnerActive = () => false }) {
  care.activities = ensureActivityState(care.activities);
  const st = care.activities;
  const events = new EventSystem({
    bus,
    rng: new Rng(`${seed}:community`),
    defs: COMMUNITY_EVENTS.map((e) => ({ id: e.id, kind: 'choice', weight: 1, cooldownDays: COMMUNITY.gapDays * 2, ...(e.partner ? { trigger: { partner: e.partner } } : {}), choices: [{ id: 'accept', effects: [{ type: 'book' }] }, { id: 'decline', effects: [], default: true }] })), // (Milestone 25c: a partner's event only while its deal runs)
    caps: { choice: COMMUNITY.gapDays },
    rules: { dailyChance: { choice: COMMUNITY.dailyChance }, maxOpen: 1 }, // (one notice at a time: never stacked)
    hooks: {
      conditionMet: (rule) => (rule?.partner ? partnerActive(rule.partner) : true),
      setup(inst) {
        // the afternoon noticeDays ahead that has nothing else special (a birthday or another booking moves it on)
        let day = inst.day + COMMUNITY.noticeDays;
        while (st.bookings[day] || isSpecial(day)) day++;
        return { day, slot: 'afternoon' };
      },
      apply(effect, inst) {
        if (effect.type !== 'book') return;
        const e = COMMUNITY_EVENTS.find((x) => x.id === inst.id);
        st.bookings[inst.params.day] = { event: e.id, activity: e.activity, liftMult: e.liftMult, ...(e.partner ? { partner: e.partner } : {}) };
      },
    },
  });
  events.load(st.events, today());
  let isSpecial = () => false;
  let programFor = () => null; // (Milestone 20)
  let vetoFor = () => null;

  const slotKey = (day, slot) => `${day}:${slot}`;
  const api = {
    state: st,
    events,
    setBirthdayCheck(fn) {
      isSpecial = fn;
    },
    // Milestone 20: a running program's session for a slot ({ activity, program, name, liftMult } or null), and its
    // veto (a resident who refuses a plan option the program is part of, or group activities: never asked).
    setProgramHooks({ sessionFor = null, veto = null } = {}) {
      programFor = sessionFor ?? (() => null);
      vetoFor = veto ?? (() => null);
    },
    // The timetable (Mon–Sun × Morning / Afternoon): an activity id or null (free time).
    timetable: () => st.timetable,
    setSlot(dow, slot, activityId) {
      const act = activityId == null ? null : activityById(activityId);
      if (activityId != null && (!act || !act.schedulable)) return { ok: false, reason: act?.needs?.text ?? 'That activity cannot be put on the timetable.' };
      if (!st.timetable[dow] || !(slot in TIMETABLE.slots)) return { ok: false, reason: 'No such slot.' };
      st.timetable[dow][slot] = activityId;
      return { ok: true, reason: null };
    },
    // What runs in a slot on a given day: a booked community event, a birthday (afternoon), a running program's session
    // (Milestone 20), else the timetable.
    activityOn(day, slot, birthdayIds = []) {
      if (slot === 'afternoon' && birthdayIds.length) return { activity: activityById('birthday'), birthday: birthdayIds[0] };
      const b = slot === 'afternoon' ? st.bookings[day] : null;
      if (b) return { activity: activityById(b.activity), event: b.event, liftMult: b.liftMult };
      const prog = programFor(day, slot);
      if (prog) return { activity: activityById(prog.activity), program: prog.program, name: prog.name, liftMult: prog.liftMult ?? 1 };
      const id = st.timetable[dayOfWeek(day)]?.[slot];
      return id ? { activity: activityById(id) } : null;
    },
    session: (day, slot) => st.sessions[slotKey(day, slot)] ?? null,
    // Make (or remake) a day's session with everyone's choice (the home world passes the residents and friendships).
    planSession(day, slot, info, residents, friendsOf) {
      if (!info) {
        delete st.sessions[slotKey(day, slot)];
        return null;
      }
      const s = { day, slot, activity: info.activity.id, event: info.event ?? null, birthday: info.birthday ?? null, program: info.program ?? null, name: info.name ?? null, liftMult: info.liftMult ?? 1, choices: {}, chances: {}, joined: [], declined: [] };
      // two passes: first on their own, then with friends who join counted in
      const first = {};
      for (const p of residents) first[p.id] = joinChance({ def: p.def, st: p.state, activity: info.activity });
      const likely = residents.filter((p) => first[p.id] >= CHOICE.bands.join).length;
      for (const p of residents) {
        const friendsJoining = friendsOf(p.id).filter((id) => first[id] >= CHOICE.bands.join).length;
        let pj = joinChance({ def: p.def, st: p.state, activity: info.activity, friendsJoining, groupSize: likely });
        if (info.birthday && (info.birthday === p.id || friendsOf(info.birthday).includes(p.id))) pj = Math.max(pj, 1); // (their own tea, and their friends)
        if (vetoFor(s, p)) pj = 0; // (Milestone 20: a refusal is never overridden; Milestone 23: on every session, not only a program's)
        s.chances[p.id] = Math.round(pj * 1000) / 1000;
        s.choices[p.id] = choiceBand(pj);
      }
      st.sessions[slotKey(day, slot)] = s;
      for (const k of Object.keys(st.sessions)) if (Number(k.split(':')[0]) < day - KEEP_DAYS) delete st.sessions[k];
      return s;
    },
    // Someone who arrived after the day's sessions were planned (a new admission) makes their choice now.
    addChoice(day, slot, p, friendsOf, friendsJoining = null) {
      const s = st.sessions[slotKey(day, slot)];
      if (!s || p.id in s.choices) return s;
      const act = activityById(s.activity);
      const fj = friendsJoining ?? friendsOf(p.id).filter((id) => s.choices[id] === 'join').length;
      let pj = joinChance({ def: p.def, st: p.state, activity: act, friendsJoining: fj, groupSize: Object.values(s.choices).filter((c) => c === 'join').length });
      if (s.birthday && (s.birthday === p.id || friendsOf(s.birthday).includes(p.id))) pj = 1;
      if (vetoFor(s, p)) pj = 0; // (Milestone 20; Milestone 23: every session)
      s.chances[p.id] = Math.round(pj * 1000) / 1000;
      s.choices[p.id] = choiceBand(pj);
      return s;
    },
    // Settle a resident's answer when the session starts: join / decline stand; a maybe is the day's seeded roll.
    // dislikeMult (Milestone 13): a familiar staff member offering it makes a *maybe* less likely to become a no.
    decide(day, slot, residentId, dislikeMult = 1) {
      const s = st.sessions[slotKey(day, slot)];
      if (!s) return 'decline';
      const c = s.choices[residentId] ?? 'decline';
      if (c !== 'maybe') return c === 'join' ? 'go' : 'refuse';
      const p = s.chances[residentId] ?? 0.5;
      const noChance = (1 - p) * dislikeMult;
      return new Rng(`${seed}:${residentId}:${day}:${slot}:activity`).next() < noChance ? 'refuse' : 'go';
    },
    // Community events: each day's tick (a notice may arrive); open notices; answer one (Accept needs a host).
    dailyTick(day) {
      // an open notice whose day has come unanswered folds away (declined)
      for (const inst of [...events.open]) if (inst.params.day <= day) events.choose(inst.uid, 1, { day, auto: true });
      for (const k of Object.keys(st.bookings)) if (Number(k) < day - KEEP_DAYS) delete st.bookings[k];
      return events.dailyTick(day);
    },
    notices: () => events.open.map((inst) => ({ uid: inst.uid, def: COMMUNITY_EVENTS.find((e) => e.id === inst.id), day: inst.params.day })),
    history: () => events.log.map((inst) => ({ uid: inst.uid, def: COMMUNITY_EVENTS.find((e) => e.id === inst.id), day: inst.params.day, accepted: inst.choice === 0, auto: !!inst.auto })),
    canAccept(uid) {
      const inst = events.open.find((e) => e.uid === uid);
      if (!inst) return { ok: false, reason: 'No longer open.' };
      const def = COMMUNITY_EVENTS.find((e) => e.id === inst.id);
      const host = hostFor(def.hosts, inst.params.day, inst.params.slot);
      return host ? { ok: true, reason: null, host } : { ok: false, reason: `Needs a host on the Afternoon shift (${def.hosts.join(' / ')})` };
    },
    answer(uid, accept) {
      if (accept) {
        const can = api.canAccept(uid);
        if (!can.ok) return can;
      }
      const inst = events.choose(uid, accept ? 0 : 1, { day: today() });
      return inst ? { ok: true, reason: null } : { ok: false, reason: 'No longer open.' };
    },
    serialize() {
      st.events = events.serialize();
      return st;
    },
  };
  return api;
}
export { ACTIVITIES, activityById };
