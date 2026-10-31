// Specialist wings (Milestone 24, bible §24 / §14 / §10 / §25). Plain data only; the rules are in
// src/systems/homeLayout.js (the tiles, the hub, what may stand where) and the home world (rosters, coverage, rooms).
//
// A wing is a zone the player paints in Build Mode (a set of floor tiles) plus its hub facility standing inside it. The
// rest of the home is the "Home" wing (data/shifts.js DEFAULT_WING), as it has been since Milestone 7.
//   id, name, short (the roster lane), stage (the stage that opens it: S3 Memory / Rehab, S4 High-Care / Palliative)
//   hubs     the facilities that make it a working wing (any one, standing fully inside its tiles)
//   rooms    the wing-only room templates: they must stand fully inside this wing (data/rooms.js)
//   supports the residents it is for (data/residents.js support): they prefer a free room in it at admission
//   beat     the big moment's picture when its first hub is placed (the Memory Wing has its own; the others show the hub)
//   tint     the soft zoning colour on its floor (stronger in Build Mode)
//   later    a system that comes in a later milestone (shown on the wing card)
export const WINGS_SPECIAL = [
  { id: 'memory', name: 'Memory Support Wing', short: 'Memory', stage: 3, hubs: ['F20', 'F22'], rooms: ['RM05'], supports: ['Memory Support'], beat: 'care_event_07', tint: 'rgba(150, 120, 200, 0.16)', line: '#7E62B0' },
  { id: 'rehab', name: 'Rehabilitation Wing', short: 'Rehab', stage: 3, hubs: ['F31'], rooms: ['RM06'], supports: ['Rehabilitation'], beat: 'facility_f31', tint: 'rgba(90, 170, 120, 0.16)', line: '#3E8A5A' },
  { id: 'highCare', name: 'High-Care Nursing Wing', short: 'High-Care', stage: 4, hubs: ['F30'], rooms: ['RM04'], supports: ['High Care', 'Clinical Support'], beat: 'facility_f30', tint: 'rgba(80, 140, 200, 0.16)', line: '#3C6E9E' },
  { id: 'palliative', name: 'Palliative Care Wing', short: 'Palliative', stage: 4, hubs: ['F32'], rooms: ['RM07'], supports: [], beat: 'facility_f32', tint: 'rgba(220, 150, 110, 0.16)', line: '#B06A3E' }, // (Milestone 27: its care is live — RM07, PRG10, F24, the comfort score)
];
export const wingById = (id) => WINGS_SPECIAL.find((w) => w.id === id) ?? null;
// The wing a resident's support belongs to (null: the Home wing).
export const wingForSupport = (support) => WINGS_SPECIAL.find((w) => w.supports.includes(support))?.id ?? null;
// The wing a room template must stand in (null: anywhere).
export const wingForRoom = (templateId) => WINGS_SPECIAL.find((w) => w.rooms.includes(templateId))?.id ?? null;
// The wing a hub-only facility must stand in (F30 / F31 / F32; the Memory hubs may stand anywhere — inside the Memory
// wing they make it a working wing).
export const HUB_ONLY = { F30: 'highCare', F31: 'rehab', F32: 'palliative' };

export function validateWings(v, { facilities, rooms, supports }) {
  v.check(WINGS_SPECIAL.length === 4, 'four specialist wings (bible §24)');
  for (const w of WINGS_SPECIAL) {
    v.check([3, 4].includes(w.stage), `wing ${w.id}: opens in S3 or S4`);
    v.check(w.hubs.length > 0 && w.hubs.every((h) => facilities.includes(h)), `wing ${w.id}: hubs`);
    v.check(w.rooms.every((r) => rooms.includes(r)), `wing ${w.id}: rooms`);
    v.check(w.supports.every((s) => supports.includes(s)), `wing ${w.id}: supports`);
  }
  return v;
}
