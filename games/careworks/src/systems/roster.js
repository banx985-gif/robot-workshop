// The roster (Milestone 3 had one Morning shift; Milestone 7, bible §14): the three shift templates (data/shifts.js),
// who is on each (or Off), floats, wings, the Night on-call flag, float cover for one shift, and agency workers hired
// for one shift. Pure: the Node tests use it. Times are absolute game hours (day × 24 + hour).
//   createRoster(state, { abs })   state = the run's staff state (its roster part below) · abs() = the game time now
//     state.roster = { shifts: { staffId: 'morning' | 'afternoon' | 'night' | 'off' }, wings: { staffId: wingId },
//                      floats: { staffId: true }, onCall: bool, cover: { instanceKey: [staffId] },
//                      agency: [{ id, name, role, art, shift, key, start, end, model }] }
//   roster.instanceAt(shiftId, abs) → { key, shift, day, start, end } | null   the instance of that shift running then
//   roster.nextInstance(shiftId, abs) → the next instance to start after abs
//   roster.shiftOf(id) → { id, name, from, to, bands, … } | null     their own shift (Off → null)
//   roster.onShift(id) → bool       working now: their own shift, a float cover, or their agency shift
//   roster.workingShift(id) → shiftId | null     which shift they are working now
//   roster.coversBand(id, bandId) → bool    on the shift that plans that band's care tasks, now
//   roster.peopleOn(instance) → [staffId]   who works that instance (own shift, cover, agency)
//   roster.label(id) → "Morning shift · 05:00–12:00" · roster.wingOf(id) · roster.isFloat(id) · roster.isAgency(id)
//   roster.move(id, shiftId | 'off') · roster.setFloat(id, on) · roster.setWing(id, wingId) · roster.setOnCall(on)
import { SHIFTS } from '../../data/balance.js';
import { SHIFT_IDS, OFF, WINGS, DEFAULT_WING, DEFAULT_ROSTER } from '../../data/shifts.js';
import { clockText } from './residentNeeds.js';

const inWindow = (t, h) => (t.from < t.to ? h >= t.from && h < t.to : h >= t.from || h < t.to);

// One instance of a shift, starting on day d.
export function shiftInstance(shiftId, d) {
  const t = SHIFTS[shiftId];
  const start = d * 24 + t.from;
  const end = (t.from < t.to ? d : d + 1) * 24 + t.to;
  return { key: `${d}:${shiftId}`, shift: shiftId, day: d, start, end };
}
export function instanceAt(shiftId, abs) {
  const t = SHIFTS[shiftId];
  if (!t) return null;
  const day = Math.floor(abs / 24);
  const h = abs - day * 24;
  if (!inWindow(t, h)) return null;
  return shiftInstance(shiftId, t.from < t.to || h >= t.from ? day : day - 1);
}
export function nextInstance(shiftId, abs) {
  const day = Math.floor(abs / 24);
  for (const d of [day - 1, day, day + 1, day + 2]) {
    const i = shiftInstance(shiftId, d);
    if (i.start > abs) return i;
  }
  return null;
}
const overlaps = (a, b) => a.start < b.end && b.start < a.end;

// The roster part of a new run's staff state. team = [{ id, role }] in team order.
export function newRosterState(team) {
  const shifts = {};
  for (const m of team) shifts[m.id] = DEFAULT_ROSTER.byRole[m.role] ?? DEFAULT_ROSTER.others;
  return { shifts, wings: Object.fromEntries(team.map((m) => [m.id, DEFAULT_WING])), floats: {}, onCall: DEFAULT_ROSTER.onCall, onCallAfternoon: DEFAULT_ROSTER.onCallAfternoon, cover: {}, agency: [] };
}
// An older save's roster (Milestones 3–6 had { shifts } only, everyone on the one Morning shift): they stay on Morning.
export function ensureRosterState(saved, ids) {
  const r = saved ?? {};
  const shifts = { ...(r.shifts ?? {}) };
  for (const id of ids) if (!(id in shifts)) shifts[id] = 'morning';
  return {
    shifts,
    wings: { ...Object.fromEntries(ids.map((id) => [id, DEFAULT_WING])), ...(r.wings ?? {}) },
    floats: { ...(r.floats ?? {}) },
    onCall: r.onCall ?? DEFAULT_ROSTER.onCall,
    onCallAfternoon: r.onCallAfternoon ?? DEFAULT_ROSTER.onCallAfternoon, // (Milestone 10 fix: older saves get it on too)
    training: { ...(r.training ?? {}) }, // Milestone 11: staff id → true while away training
    sick: { ...(r.sick ?? {}) }, // Milestone 25: staff id → true while off sick (a staffing surge)
    cover: Object.fromEntries(Object.entries(r.cover ?? {}).map(([k, v]) => [k, [...v]])),
    agency: (r.agency ?? []).map((a) => ({ ...a, model: a.model ? { ...a.model } : null })),
  };
}

// Milestone 24: wingOfRoom(roomId) → the wing a room is in (the home world reads the layout's painted wings); without
// it, the Milestone 7 rule (every room in the Home wing). wingExists(wingId) → can staff be assigned to it now.
export function createRoster(state, { abs = () => 0, wingOfRoom = null, wingExists = null } = {}) {
  const R = () => state.roster;
  const agencyOf = (id) => R().agency.find((a) => a.id === id) ?? null;
  const shiftOf = (id) => {
    const key = R().shifts[id];
    return key && key !== OFF && SHIFTS[key] ? { id: key, ...SHIFTS[key] } : null;
  };
  // Which shift they are working at time t: their own, a float cover, or their agency shift.
  function workingAt(id, t) {
    if (R().training?.[id]) return null; // Milestone 11: away at the Training Room, off the roster
    if (R().sick?.[id]) return null; // Milestone 25: off sick, off the roster until they are back
    const ag = agencyOf(id);
    if (ag) return t >= ag.start && t < ag.end ? ag.shift : null;
    const own = R().shifts[id];
    if (own && SHIFTS[own] && instanceAt(own, t)) return own;
    for (const sid of SHIFT_IDS) {
      const i = instanceAt(sid, t);
      if (i && R().cover[i.key]?.includes(id)) return sid;
    }
    return null;
  }
  const roster = {
    instanceAt,
    nextInstance,
    shiftInstance,
    shiftOf,
    isAgency: (id) => !!agencyOf(id),
    agencyOf,
    isFloat: (id) => !!R().floats[id],
    // Their wing (a float, an agency worker or someone Off is tied to none).
    wingOf(id) {
      if (agencyOf(id) || R().floats[id] || !shiftOf(id)) return null;
      const w = R().wings[id];
      if (w && w !== DEFAULT_WING && wingExists && !wingExists(w)) return DEFAULT_WING; // (Milestone 24: a wing that was cleared away)
      return w === undefined ? DEFAULT_WING : w; // (null: tied to no wing)
    },
    // Their wing as set on the roster, whether or not they are on a shift now (the roster sheet's wing lanes).
    assignedWing: (id) => {
      const w = R().wings[id] ?? DEFAULT_WING;
      return w !== DEFAULT_WING && wingExists && !wingExists(w) ? DEFAULT_WING : w;
    },
    wingOfRoom: (roomId) => (!roomId ? null : wingOfRoom ? wingOfRoom(roomId) : WINGS.find((w) => w.rooms === 'all' || w.rooms.includes(roomId))?.id ?? null),
    get onCall() {
      return !!R().onCall;
    },
    // Milestone 10 fix: the nurse-on-call switch by shift ('night' is the M7 flag above)
    onCallFor: (shiftId) => (shiftId === 'night' ? !!R().onCall : shiftId === 'afternoon' ? !!R().onCallAfternoon : false),
    onShift: (id) => !!workingAt(id, abs()),
    workingShift: (id) => workingAt(id, abs()),
    workingAt,
    // On the shift that plans this band's tasks, now (a band belongs to one shift: data/shifts.js bands).
    coversBand(id, bandId) {
      const sid = workingAt(id, abs());
      return !!sid && SHIFTS[sid].bands.includes(bandId);
    },
    onShiftIds() {
      return [...Object.keys(R().shifts), ...R().agency.map((a) => a.id)].filter((id) => roster.onShift(id));
    },
    // Who works that instance: everyone on the shift, the floats covering it, its agency workers.
    peopleOn(inst) {
      const own = Object.keys(R().shifts).filter((id) => R().shifts[id] === inst.shift && !R().training?.[id] && !R().sick?.[id]);
      const cover = (R().cover[inst.key] ?? []).filter((id) => !R().sick?.[id]);
      const agency = R().agency.filter((a) => a.key === inst.key).map((a) => a.id);
      return [...new Set([...own, ...cover, ...agency])];
    },
    // Floats who could cover that instance: on another shift that doesn't overlap it, not already on it.
    floatsFor(inst) {
      return Object.keys(R().floats).filter((id) => {
        if (!R().floats[id] || agencyOf(id) || R().training?.[id] || R().sick?.[id]) return false;
        const own = R().shifts[id];
        if (!own || own === OFF || !SHIFTS[own] || own === inst.shift) return false;
        if (R().cover[inst.key]?.includes(id)) return false;
        return [inst.day - 1, inst.day, inst.day + 1].every((d) => !overlaps(shiftInstance(own, d), inst));
      });
    },
    addCover(inst, id) {
      const list = (R().cover[inst.key] ??= []);
      if (!list.includes(id)) list.push(id);
    },
    label(id) {
      const ag = agencyOf(id);
      const s = ag ? { ...SHIFTS[ag.shift] } : shiftOf(id);
      if (!s) return 'Off: on no shift (resting)';
      const float = !ag && R().floats[id] ? ' · float' : '';
      return `${s.name} shift · ${clockText(s.from)}–${clockText(s.to)}${ag ? ' · agency, this shift only' : float}`;
    },
    move(id, shiftId) {
      if (agencyOf(id) || !(id in R().shifts)) return false;
      if (shiftId !== OFF && !SHIFTS[shiftId]) return false;
      R().shifts[id] = shiftId;
      return true;
    },
    setFloat(id, on) {
      if (agencyOf(id) || !(id in R().shifts)) return false;
      if (on) R().floats[id] = true;
      else delete R().floats[id];
      return true;
    },
    setWing(id, wingId) {
      if (!(id in R().shifts) || !WINGS.some((w) => w.id === wingId)) return false;
      if (wingId !== DEFAULT_WING && wingExists && !wingExists(wingId)) return false; // (Milestone 24: a painted wing only)
      R().wings[id] = wingId;
      return true;
    },
    // Milestone 11: training takes them off the roster (their shift is kept for when they are back); a new hire joins
    // Off; someone who leaves goes from every list.
    isTraining: (id) => !!R().training?.[id],
    setTraining(id, on) {
      R().training ??= {};
      if (on) R().training[id] = true;
      else delete R().training[id];
    },
    // Milestone 25: off sick for a few days (a staffing surge): off the roster, their shift kept for when they are back.
    isSick: (id) => !!R().sick?.[id],
    setSick(id, on) {
      R().sick ??= {};
      if (on) R().sick[id] = true;
      else delete R().sick[id];
    },
    join(id, shiftId = OFF) {
      R().shifts[id] = shiftId;
      R().wings[id] = DEFAULT_WING;
    },
    forget(id) {
      delete R().shifts[id];
      delete R().wings[id];
      delete R().floats[id];
      delete R().training?.[id];
      delete R().sick?.[id];
      for (const k of Object.keys(R().cover)) R().cover[k] = R().cover[k].filter((x) => x !== id);
    },
    setOnCall(on, shiftId = 'night') {
      if (shiftId === 'afternoon') R().onCallAfternoon = !!on;
      else R().onCall = !!on;
    },
    // Old cover lists and finished agency hires fall away (keeps the save small).
    prune(t) {
      for (const k of Object.keys(R().cover)) {
        const [d, sid] = k.split(':');
        if (!SHIFTS[sid] || shiftInstance(sid, Number(d)).end < t) delete R().cover[k];
      }
    },
  };
  return roster;
}
