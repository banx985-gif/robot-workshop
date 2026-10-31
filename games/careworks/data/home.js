import { ROOM_SHAPE, roomById } from './rooms.js';
import { facilityById } from './facilities.js';
// The small home (Milestone 1, bible §4): one residential home on a hidden grid, seen in the 3/4 dollhouse view.
// Plain data only. Columns run along the right-hand back wall, rows along the left-hand one; (0, 0) is the far corner.
// Milestone 6 grew it to 24 × 16 so four Standard Rooms stand side by side along the back wall (a room's art rises
// above its footprint, so a room can only stand against a back wall with nothing behind it):
//
//   rows 0-5             the bedroom wing: four Standard Rooms (RM01 Arthur's, SR2, SR3, SR4), each 4 × 4 of art plus a
//                        strip of floor inside its door; their side walls on cols 5 / 11 / 17 / 23, their front walls on
//                        row 5 with a doorway in the middle
//   rows 6-9             the corridor and hall; the front entrance at the right-hand end of the corridor (new residents
//                        walk in there); the Staff Room (cols 0-2, rows 7-9) against the left-hand wall
//   cols 3-15, rows 10-15  the lounge, walled, with two doorways (cols 8-9 and 13-14): the Activity Lounge (cols 5-7) and
//                        the Dining Room (cols 10-12) in the middle, their seats in front, so a resident's walk to a meal
//                        is about the same from every room (~1.5 game hours, as Arthur's was in Milestone 5)
//   cols 16-23, rows 9-15  the Central Nurse Station (cols 17-19, rows 9-11), beside the lounge's side door (row 13)
// Milestone 10: this is the default layout. Every room and facility is a piece that Build Mode can move, sell or add
// (src/systems/homeLayout.js): DEFAULT_LAYOUT says where each stands in a new home, and a piece's spots and walls are
// data relative to it (data/rooms.js ROOM_SHAPE, data/facilities.js spots). PLACED, WALLS, ROOM_IDS, SEATS … below are
// the default layout written out as tiles (older saves' upgrades and the Milestone 1–9 tests read them).
// Walls are blocked tiles, so the A* paths (core/Pathing) can only pass through the doorways. Nothing that has art may
// stand in the two or three rows just behind a facility (its art would hide them): the M5 tests check the posts.

export const HOME = {
  cols: 24,
  rows: 48, // (Milestone 11: the Stage 1 floor — was 16; see STAGES)
  cellSize: 100, // plan units per tile (pathing and walking speed)
  // Milestone 25b: one tile draws as a 144 × 78 diamond (28.4°), the art's own floor angle — the room and facility
  // pictures' lower floor edges average 28.6° (tools/careworks-art-fit.mjs; it was 2:1, 26.6°). CAREWORKS only: core's
  // IsoProjection takes it as a setting, so the other games are untouched.
  view: { halfW: 72, halfH: 39 },
  wallH: 230, // the two outer back walls, drawn px
  innerWallH: 70, // inside walls are cut down low (dollhouse), so nobody is ever hidden behind one
  margin: 90, // empty world round the home (the camera stops at the home plus this)
  zoom: { min: 0.35, max: 1.4, start: 0.85, minByStage: { 1: 0.35, 2: 0.35, 3: 0.3, 4: 0.27, 5: 0.24 } }, // start close in (style guide §2); 0.35 shows the whole home on a phone
  // Milestone 24: a bigger home can be zoomed out a little further (by stage)
  // (the floor picture is capped at floorMaxPixels, so it is a touch softer when zoomed right in on S4 / S5)
  floorMaxPixels: 7e6, // the cached floor picture is capped at this many device pixels (bigger cost ~20 ms a frame)
};

// The Standard Rooms (Milestone 6: four, placed by data; Build Mode places more in Milestone 10). col = the room's
// left edge; each is 4 × 4 of art, a strip of floor inside (the next column and row 4), a side wall and a front wall.
const ROOM_COLS = [
  { id: 'RM01', col: 0 },
  { id: 'SR2', col: 6 },
  { id: 'SR3', col: 12 },
  { id: 'SR4', col: 18 },
];
export const ROOM_IDS = ROOM_COLS.map((r) => r.id);

// Inside walls as runs of blocked tiles: { col, row, len, dir: 'col' (along a column, rows grow) | 'row' (along a row) }.
// gaps = doorway tiles left open in the run. (Arthur's room keeps its Milestone 1 ids, roomSide / roomFront.)
// Milestone 10: the fixed walls are the building's (the lounge); a room's own walls come with the room (ROOM_SHAPE).
export const FIXED_WALLS = [
  { id: 'lounge', col: 4, row: 10, len: 11, dir: 'row', gaps: [4, 5, 9, 10] },
  { id: 'loungeLeft', col: 3, row: 10, len: 6, dir: 'col', gaps: [] },
  { id: 'loungeRight', col: 15, row: 10, len: 6, dir: 'col', gaps: [3] }, // a side door at row 13, from the Nurse Station
  // Milestone 11: the floor now carries on past the lounge, so it has a front wall of its own (it used to be the edge
  // of the home): still entered only through its doorways
  { id: 'loungeFront', col: 0, row: 16, len: 16, dir: 'row', gaps: [] }, // (from the left-hand wall: the corner under the Staff Room stays closed off, as since M5)
];
// A room's walls at (col, row), with its Milestone 1–9 ids (Arthur's are roomSide / roomFront).
export const roomWalls = (id, col, row) =>
  ROOM_SHAPE.walls.map((w, i) => ({ id: id === 'RM01' ? ['roomSide', 'roomFront'][i] : `${id}${['Side', 'Front'][i]}`, col: col + w.col, row: row + w.row, len: w.len, dir: w.dir, gaps: [...w.gaps] }));
export const WALLS = [...ROOM_COLS.flatMap((r) => roomWalls(r.id, r.col, 0)), ...FIXED_WALLS];

// Floor areas (drawn by code): where each floor finish goes. Later areas paint over earlier ones.
export const FLOORS = [
  { id: 'hall', col: 0, row: 0, w: 24, h: 16, look: 'hall' },
  ...ROOM_COLS.map((r) => ({ id: `room${r.id}`, col: r.col, row: 0, w: 5, h: 5, look: 'room' })),
  { id: 'runner', col: 3, row: 6, w: 20, h: 1, look: 'runner' }, // a sage runner down the corridor
  { id: 'lounge', col: 4, row: 11, w: 11, h: 5, look: 'lounge' },
];

// Milestone 10: where each piece stands in a new home (and in every Milestone 1–9 save). id = the piece's own id (older
// saves and spot names use these: 'F03.dining', 'SR2.inside'); def = its room template or facility. Order = the order
// they were built (room numbers and seat numbers follow it).
export const DEFAULT_LAYOUT = [
  { id: 'F01', def: 'F01', col: 17, row: 9 },
  { id: 'F05', def: 'F05', col: 5, row: 11 },
  { id: 'RM01', def: 'RM01', col: 0, row: 0 },
  { id: 'F03', def: 'F03', col: 10, row: 11 },
  { id: 'F08', def: 'F08', col: 0, row: 7 },
  ...ROOM_COLS.slice(1).map((r) => ({ id: r.id, def: 'RM01', col: r.col, row: 0 })),
];
const shift = (t, col, row) => ({ col: t.col + col, row: t.row + row });
// One piece written out as tiles (the home world and the drawing use the same shape).
//   kind 'room' | 'station', fp = where its picture stands, box = its whole footprint, spots = named tiles,
//   blocked = rects nobody walks through, walls (rooms only)
export function pieceTiles({ id, def: defId, col, row }) {
  const room = roomById(defId);
  if (room) {
    const S = ROOM_SHAPE;
    return {
      id, kind: 'room', template: defId, name: room.name, art: room.art, text: room.bestFor,
      fp: { col: col + S.art.col, row: row + S.art.row, w: S.art.w, h: S.art.h }, box: { col, row, w: S.w, h: S.h },
      walkIn: true, // the art is the room itself: drawn under the people, and its floor stays walkable
      blockedInside: S.blocked.map((b) => ({ ...shift(b, col, row), w: b.w, h: b.h })),
      spots: Object.fromEntries(Object.entries(S.spots).map(([k, t]) => [k, shift(t, col, row)])),
      walls: roomWalls(id, col, row),
    };
  }
  const f = facilityById(defId);
  return {
    id, kind: 'station', facility: defId, name: f.name, art: f.art, text: f.text,
    fp: { col, row, w: f.w, h: f.h }, box: { col, row, w: f.w, h: f.h },
    spots: Object.fromEntries(Object.entries(f.spots ?? {}).map(([k, t]) => [k, shift(t, col, row)])),
    walls: [],
  };
}
// The default layout as tiles (Milestones 1–9 had exactly this; older saves' upgrades and tests read it).
export const PLACED = DEFAULT_LAYOUT.map(pieceTiles);

// Drawing: every placed picture at one scale. width = the footprint's diamond width × this; drop = how far (in tile
// heights) its base sits below the footprint's front corner. Walk-in rooms fill their footprint a little more.
export const ART_DRAW = { station: { width: 1.05, drop: 0.25 }, room: { width: 1.12, drop: 0.35 }, prop: { width: 0.8, drop: 0.1 } };

// Milestone 5: the five early props. Decoration only: never tapped, each on one tile out of every walkway (the tile is
// blocked, so nobody walks through it and Build Mode never offers it). flip: drawn mirrored.
export const PROPS = [
  { id: 'P1', name: 'Walking frame', art: 'care_prop_early_01', col: 4, row: 1, attach: { piece: 'RM01', col: 4, row: 1 } }, // beside Arthur's bed (Milestone 10: it moves with his room)
  { id: 'P2', name: 'Wheelchair', art: 'care_prop_early_02', col: 0, row: 11 }, // parked by the Staff Room
  { id: 'P3', name: 'Activity trolley', art: 'care_prop_early_03', col: 14, row: 15 }, // in the lounge's front corner
  { id: 'P4', name: 'Dining trolley', art: 'care_prop_early_04', col: 16, row: 15, flip: true }, // outside the lounge
  { id: 'P5', name: 'Garden planter', art: 'care_prop_early_05', col: 0, row: 15 }, // under the window
];

// Windows on the left-hand outer wall (the back wall on the right is lined with rooms): rows along the wall. Each casts
// a soft pool of daylight on the floor (light comes from the upper left, like the art).
export const WINDOWS = [
  { side: 'left', from: 11.9, to: 13.4 },
  { side: 'left', from: 13.8, to: 15.3 },
];
// Milestone 10: the home's physical stages (bible §24; S3–S5 are Milestone 24). capacity = most residents (one to a
// room); the floor grows forward, away from the two back walls, so every piece stays exactly where it was. zone = the
// new floor as a core/FacilitySystem expansion. S2 unlocks at Rank D (no Rank yet: ?debug=1 upgrades).
// Milestone 11 (Aaron's choice: bigger floors, same size on screen): S1 grew 16 → 48 rows and S2 32 → 72, so a tidy
// layout fits 16 Standard Rooms and all ten Start facilities at S1, and 24 rooms and the Rank D facilities at S2 —
// bands of three rooms with a corridor in front of each, an aisle down the right-hand side and the facilities beside
// it (tests/careworks/m11.test.mjs FULL_LAYOUT places one and passes the access check). The floor only grows forward
// (the front entrance stays on the right-hand wall), so every save keeps every piece where it was.
// Milestone 24: S3–S5 (bible §24). The floor grows sideways as well as forward — a new strip beside the home (cols) and
// one in front (rows) — so the home stays compact on screen (a long strip would make the cached floor picture far
// bigger for the same tiles). The front entrance stays where it always was, at the corridor's end (now the entrance
// hall in the middle of the home), so every path, every save and every piece stays exactly where it was.
//   zones   the new floor (core/FacilitySystem expansions; each needs the stage before)
//   cost / buildDays   the upgrade's Credits and its building days (the home keeps running; the new floor opens after)
//   wings   the specialist wings this stage opens (data/wings.js)
//   look    the new floor's finish (HOME_LOOK.stageFloors): S3 cleaner clinical-residential, S4 softer zoning, S5 campus
//           with garden courtyards — residential, never hospital
//   unlock  the real rule (Rank and accreditation come in Milestone 26: shown, ?debug=1 upgrades); check: what the
//           game can already check of it
// capacity: resident rooms, one resident each; LOGICAL_CAP: never more than this in any home, whatever the stage.
export const STAGES = [
  { id: 'S1', n: 1, name: 'Small Residential Home', capacity: 16, cols: 24, rows: 48, unlock: { type: 'start', text: 'Start' } },
  { id: 'S2', n: 2, name: 'Expanded Care Home', capacity: 24, cols: 24, rows: 72, unlock: { type: 'rank', value: 'D', text: 'Needs Rank D' }, zone: { id: 'S2', col: 0, row: 48, w: 24, h: 24 }, art: 'care_event_06' },
  { id: 'S3', n: 3, name: 'Professional Nursing Facility', capacity: 36, cols: 36, rows: 72, unlock: { type: 'rank', value: 'C', text: 'Needs Rank C and the C03 accreditation', accreditation: 'C03', accreditationName: 'Family Trust Award' }, zones: [{ id: 'S3', col: 24, row: 0, w: 12, h: 72, requires: ['S2'] }], cost: 40000, buildDays: 5, wings: ['memory', 'rehab'], look: 'clinical', art: 'care_event_06' },
  { id: 'S4', n: 4, name: 'Specialist Care Centre', capacity: 50, cols: 48, rows: 80, unlock: { type: 'rank', value: 'A', text: 'Needs Rank A and a specialist program running', check: 'program' }, zones: [{ id: 'S4a', col: 36, row: 0, w: 12, h: 72, requires: ['S3'] }, { id: 'S4b', col: 0, row: 72, w: 48, h: 8, requires: ['S3'] }], cost: 75000, buildDays: 7, wings: ['highCare', 'palliative'], look: 'specialist', art: 'care_event_06' },
  { id: 'S5', n: 5, name: 'Premier Care Campus', capacity: 70, cols: 60, rows: 96, unlock: { type: 'rank', value: 'S', text: 'Needs Rank S and Year 13 or later', check: 'year', year: 13 }, zones: [{ id: 'S5a', col: 48, row: 0, w: 12, h: 80, requires: ['S4a', 'S4b'] }, { id: 'S5b', col: 0, row: 80, w: 60, h: 16, requires: ['S4a', 'S4b'] }], cost: 120000, buildDays: 10, wings: [], look: 'campus', art: 'care_event_08' },
];
export const zonesOf = (st) => st.zones ?? (st.zone ? [st.zone] : []);
export const LOGICAL_CAP = 70;
export const MAX_FLOOR = { cols: 60, rows: 96 };
// Milestone 6: new residents come in through the front entrance, the open end of the corridor (Reception is not placed
// yet), and walk to their room.
export const ENTRANCE = { col: 23, row: 7 };
// People: drawn height in logical px at zoom 1 (tested against the room and station art at phone scale).
export const PERSON = { height: 190, speed: 340, tagSize: 28 }; // speed: staff, plan units a game-second (Milestone 3: brisker, so
// helpers reach Arthur within his routine; Milestone 6: 280 → 340 for the bigger home)
// How people move (Milestone 5, style guide §6, core/CharacterMotion): a hop and a small sway while walking — one hop
// per stride of plan distance actually walked, so the feet never slide at any speed —, a gentle lean while helping, a
// slow breathe while standing, resting or sitting. Residents walk steadier (a smaller hop and sway): respectful, never
// a stagger or a slump.
export const MOTION = {
  stride: 70, // plan units walked per hop
  staff: { walkBobPx: 6, walkStepsPerSec: 1, walkTiltRad: 0.045, workTiltRad: 0.03, workTiltPerSec: 0.7, workBobPx: 2, idleBreathPx: 2.5, idleBreathPerSec: 0.25 },
  resident: { walkBobPx: 3.5, walkStepsPerSec: 1, walkTiltRad: 0.02, workTiltRad: 0, workTiltPerSec: 0.5, workBobPx: 0, idleBreathPx: 2, idleBreathPerSec: 0.2 },
};

// The home's first resident (Milestone 2: his profile is data/residents.js, his day data/routine.js) and his room.
// speed: plan units per game-second at 1× for every resident (Milestone 6: 240 → 300 for the bigger home).
export const RESIDENT = { id: 'RES01', room: 'RM01', speed: 300 };

// Where staff stand (Milestone 3). Named tiles outside the placed things (spotTile() reads these as well as PLACED spots).
// Milestone 6: rounds along the corridor and the open hall; the rest spots in front of the Staff Room.
export const SPOTS = {
  'hall.rnRound': { col: 12, row: 7 },
  'hall.cwPost': { col: 8, row: 7 },
  'hall.cwRound': { col: 21, row: 8 },
  'hall.ahPost': { col: 5, row: 8 },
  'hall.ahRound': { col: 22, row: 7 },
  'lounge.lcRound': { col: 4, row: 15 },
  'lounge.hnPost': { col: 14, row: 13 },
  'lounge.hnRound': { col: 9, row: 15 },
  // helpers beside a resident at the Dining Room and the Cards table (seat 1's pair keeps its Milestone 4 names); a
  // room's helper spots are that room's help / help2
  'help.room': { col: 3, row: 4 },
  'help.room2': { col: 1, row: 4 },
  'help.dining': { col: 10, row: 15 },
  'help.dining2': { col: 11, row: 15 },
  'help.dining3': { col: 12, row: 15 },
  'help.dining4': { col: 13, row: 14 },
  'help.dining5': { col: 9, row: 14 },
  'help.dining6': { col: 13, row: 15 },
  'help.lounge': { col: 5, row: 15 },
  'help.lounge2': { col: 6, row: 15 },
  'help.lounge3': { col: 7, row: 15 },
  'help.lounge4': { col: 8, row: 14 },
  'help.lounge5': { col: 4, row: 14 },
  'help.lounge6': { col: 8, row: 15 },
  // off shift: resting in front of the Staff Room
  'rest.1': { col: 3, row: 8 },
  'rest.2': { col: 3, row: 7 },
  'rest.3': { col: 3, row: 9 },
  'rest.4': { col: 4, row: 8 },
  'rest.5': { col: 4, row: 9 },
};
// On shift and not helping, each role walks between its post and a second spot (so the home never looks frozen).
// stay = game-seconds at each.
export const POSTS = {
  RN: { spots: ['F01.staff', 'hall.rnRound'], stay: [6, 3] },
  CW: { spots: ['hall.cwPost', 'hall.cwRound'], stay: [6, 3] },
  LC: { spots: ['F05.staff', 'lounge.lcRound'], stay: [6, 3] },
  AH: { spots: ['hall.ahPost', 'hall.ahRound'], stay: [6, 3] },
  HN: { spots: ['lounge.hnPost', 'lounge.hnRound'], stay: [6, 3] },
};
// Milestone 6: the seats at each shared place (a resident's seat follows their room: room 1 → seat 1 …) and the spots
// helpers may stand in there (the free one nearest the resident's seat is used).
export const SEATS = {
  dining: ['F03.dining', 'F03.seat2', 'F03.seat3', 'F03.seat4'],
  lounge: ['F05.resident', 'F05.seat2', 'F05.seat3', 'F05.seat4'],
};
export const HELP_POOLS = {
  dining: ['help.dining', 'help.dining2', 'help.dining3', 'help.dining4', 'help.dining5', 'help.dining6'],
  lounge: ['help.lounge', 'help.lounge2', 'help.lounge3', 'help.lounge4', 'help.lounge5', 'help.lounge6'],
};
// Where a helper stands for Arthur at each routine place (Milestones 3-5; still his, and the start of each pool).
export const HELP_SPOTS = { room: 'help.room', dining: 'help.dining', lounge: 'help.lounge' };
export const HELP_SPOTS_2 = { room: 'help.room2', dining: 'help.dining2', lounge: 'help.lounge2' };
// The two spots beside a resident at a place: in their own room, or the first pair of the shared place's pool.
export const helpSpotsFor = (place, roomId) => (place === 'room' ? (roomId === 'RM01' ? ['help.room', 'help.room2'] : [`${roomId}.help`, `${roomId}.help2`]) : HELP_POOLS[place]);

// Colours drawn by code: residential, not hospital — warm cream, sage and timber.
export const HOME_LOOK = {
  // core/IsoRoom look for the hall floor and the two outer walls
  floorA: '#F3E6CB', floorB: '#EEDDBD', grout: 'rgba(120, 90, 50, 0.10)',
  wallFace: '#DCE7D3', wallSide: '#C9D9BF', wallLine: 'rgba(60, 80, 55, 0.25)', wallCap: '#3B342C',
  skirting: '#B98C5E', rail: '#F6EFDF',
  floors: {
    hall: null, // the IsoRoom checker
    room: { a: '#E2B884', b: '#DAAE78', line: 'rgba(110, 70, 30, 0.18)' }, // timber boards
    lounge: { a: '#E7D3B0', b: '#E1CBA5', line: 'rgba(110, 80, 40, 0.10)' }, // soft carpet
    runner: { a: '#B9CDAE', b: '#B3C8A7', line: 'rgba(60, 80, 55, 0.12)' }, // Milestone 5: the hall runner
  },
  wainscot: '#C7D6BB', // Milestone 5: the lower wall panel, under the rail
  innerWall: { top: '#F6EFDF', front: '#C9D9BF', side: '#B5C9A9', line: '#3B342C' },
  shadow: 'rgba(60, 45, 25, 0.12)',
  // Milestone 5: soft floor shadows (drawn by code; the art has none) and the daylight from the windows
  softShadow: 'rgba(70, 50, 25, 0.16)',
  personShadow: 'rgba(70, 50, 25, 0.20)',
  daylight: 'rgba(255, 246, 214, 0.55)',
  window: { frame: '#FFFFFF', glass: '#BFE3EE', shine: 'rgba(255,255,255,0.55)' },
  buildTint: 'rgba(30, 156, 196, 0.10)',
  buildLine: 'rgba(30, 156, 196, 0.45)',
  // Milestone 24: each stage's new floor (a checker of two tones, like the hall) — still a home: warm timber and soft
  // vinyl, never hospital white. campus: plus garden courtyards (lawn with a few shrubs: decoration on walkable floor,
  // drawn wherever no piece stands) every `courtyardEvery` tiles.
  stageFloors: {
    clinical: { a: '#EEE6D6', b: '#E8DFCC', line: 'rgba(110, 90, 60, 0.10)' }, // S3 pale oak vinyl
    specialist: { a: '#E9E4D3', b: '#E2DCC8', line: 'rgba(90, 100, 80, 0.10)' }, // S4 soft stone
    campus: { a: '#F0E4CC', b: '#EADCBF', line: 'rgba(110, 85, 50, 0.10)', lawn: '#B7D59A', lawnB: '#ADCD8F', shrub: '#7DAA5E', courtyard: { w: 4, h: 4, every: 12 } },
  },
  // the building site while a stage is built: sandy ground, a dashed boundary, cones
  site: { ground: 'rgba(214, 190, 150, 0.55)', hatch: 'rgba(160, 120, 70, 0.35)', line: '#A87A3E', cone: '#F08A24', coneBand: '#FFFFFF' },
};
