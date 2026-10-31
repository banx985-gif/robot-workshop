// Room templates (Milestone 10, bible §10): the seven resident rooms. Plain data only; the rules are in
// src/systems/homeLayout.js. Rooms are placed inside the home but never count toward the 35 facilities (§10).
//
// A room row:
//   id, name, bestFor (the §10 "best suited"), effect { key, value, text } (stored and shown now; its system comes
//   later), unlock { type, value, text } (start = buildable from day one; rank / wing / program wait for their
//   milestones and stay locked with the reason), cost (Credits), art (rooms/room_rmNN.png)
//   general   true: any resident may live in it; false: kept for the residents who need it (their requires.room)
//
// Every room has the same shape (ROOM_SHAPE), so a room placed anywhere works like Arthur's since Milestone 1: a 6 × 6
// box — the 4 × 4 picture (bed, drawers, chair: blocked), a strip of floor inside the door, its own side wall on the
// right and a front wall with one doorway. Local cells: col 0–5 left → right, row 0–5 back → front.
export const ROOM_SHAPE = {
  w: 6,
  h: 6,
  art: { col: 0, row: 0, w: 4, h: 4 }, // where the picture stands
  // blocked cells: the furniture (cols 0–4, rows 0–2 — the M5 walking frame stands at (4, 1)) and the inside corner
  // (col 0, rows 3–4: a room is closed on every side but its door, wherever it stands)
  blocked: [{ col: 0, row: 0, w: 5, h: 3 }, { col: 0, row: 3, w: 1, h: 2 }],
  // its walls: the side wall down col 5 and the front wall along row 5, with the doorway at col 2
  walls: [{ col: 5, row: 0, len: 6, dir: 'col', gaps: [] }, { col: 0, row: 5, len: 5, dir: 'row', gaps: [2] }],
  // named tiles: inside = where its resident stands, help / help2 = helpers beside them, doorway = the way in
  spots: { inside: { col: 2, row: 4 }, doorway: { col: 2, row: 5 }, help: { col: 3, row: 4 }, help2: { col: 1, row: 4 } },
  floor: { col: 0, row: 0, w: 5, h: 5 }, // the timber floor drawn under it
};

const room = (id, name, bestFor, effect, unlock, cost, general) => ({ id, name, bestFor, effect, unlock, cost, art: `room_${id.toLowerCase()}`, general });
export const ROOMS = [
  room('RM01', 'Standard Room', 'General long-term care', { key: 'roomBalanced', value: 0, text: 'Balanced' }, { type: 'start', text: 'Available from the start' }, 1200, true),
  room('RM02', 'Garden Room', 'Outdoor preference / mood support', { key: 'roomMood', value: 4, text: 'Mood +4 for its resident' }, { type: 'rank', value: 'D', text: 'Needs Rank D' }, 1800, true),
  room('RM03', 'Premium Suite', 'Privacy / family space', { key: 'roomFamilyTrust', value: 1, text: 'Family Trust +1 on every family visit (Milestone 20)' }, { type: 'rank', value: 'C', text: 'Needs Rank C' }, 2600, true),
  room('RM04', 'High-Care Room', 'Complex nursing proximity', { key: 'roomClinical', value: 5, text: 'Clinical care +5%' }, { type: 'rank', value: 'B', text: 'Needs Rank B' }, 3000, false),
  room('RM05', 'Memory Support Room', 'Low-stimulation / secure wing', { key: 'roomMemory', value: 5, text: 'Memory support +5%' }, { type: 'wing', value: 'memory', text: 'Needs the Memory Wing' }, 2800, false),
  room('RM06', 'Rehabilitation Room', 'Short-stay / therapy proximity', { key: 'roomRehab', value: 5, text: 'Rehabilitation +5%' }, { type: 'wing', value: 'rehab', text: 'Needs the Rehab Wing' }, 2400, true),
  room('RM07', 'Palliative Suite', 'Comfort / family presence', { key: 'roomComfort', value: 5, text: 'Comfort +5 for its resident' }, { type: 'program', value: 'palliative', text: 'Needs the Palliative Program' }, 3200, false),
];
export const roomById = (id) => ROOMS.find((r) => r.id === id) ?? null;
export const ROOM_IDS_ALL = ROOMS.map((r) => r.id);

// Check the list. v = a core/DataValidator.
export function validateRooms(v, list = ROOMS) {
  v.uniqueIds('rooms', list);
  v.check(list.length === 7, 'seven room templates (bible §10)');
  for (const r of list) {
    const who = `room ${r.id}`;
    v.check(/^RM0[1-7]$/.test(r.id), `${who}: id must be RM01–RM07`);
    for (const k of ['name', 'bestFor', 'art']) v.check(typeof r[k] === 'string' && r[k].length > 0, `${who}: ${k} missing`);
    v.check(r.art === `room_${r.id.toLowerCase()}`, `${who}: art must be room_${r.id.toLowerCase()}`);
    v.check(typeof r.effect?.key === 'string' && typeof r.effect.value === 'number' && !!r.effect.text, `${who}: effect { key, value, text }`);
    v.check(['start', 'rank', 'wing', 'program'].includes(r.unlock?.type) && !!r.unlock.text, `${who}: unlock { type, text }`);
    v.check(Number.isInteger(r.cost) && r.cost > 0, `${who}: cost`);
    v.check(typeof r.general === 'boolean', `${who}: general true / false`);
  }
  return v;
}
