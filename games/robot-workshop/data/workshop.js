// The workshop room: grid, standing spots, draw sizes, and how the room art fits together.
// Plain values only (bible §42.5). The grid is the logic; the 3/4 view is only how it is drawn (§18.1).

export const ROOM = {
  cellSize: 100, // grid world units per cell (walking and pathing use these)
  view: { halfW: 56, halfH: 28 }, // one cell draws as a 112 × 56 px diamond (2:1, matches the wall art)
  margin: { x: 24, top: 24, bottom: 36 }, // empty space kept round the room art in its cached layer
};

// Where staff stand when they are not at a station (cells). If a spot is built over, the nearest free
// reachable cell is used instead. Facilities themselves are in data/facilities.js (bible §18).
export const LAYOUT = {
  homeSpots: [
    { col: 0, row: 3 },
    { col: 6, row: 1 },
    { col: 1, row: 6 },
    { col: 7, row: 6 },
    { col: 2, row: 8 },
    { col: 5, row: 0 }, // Milestone 10: more people can be hired (cap 6 at Rank E, 8 at Rank D)
    { col: 0, row: 9 },
    { col: 7, row: 9 },
  ],
};

// On-screen sizes in logical px at 1080×1920 (art list: staff/robots ~96–160 px, icons 48–96 px).
export const SIZES = {
  staffH: 150,
  robotH: 118, // finished robot standing on the pedestal
  statusIcon: 60,
  nameTag: 17, // font px in the world (Milestone 17b: the camera zooms it to ~44 on screen)
};

// Props (Milestone 17b): decoration only — no effect, no collision, never in the way (a prop on a cell that has a
// facility, or on the doorway, is simply not drawn). h: height in world px; dx/dy nudge it on its cell.
export const PROPS = [
  { art: 'prop_07', col: 3, row: 0, h: 120 }, // blueprint board
  { art: 'prop_10', col: 6, row: 0, h: 70, dy: -70 }, // wall clock
  { art: 'prop_01', col: 0, row: 1, h: 95 }, // tool chest
  { art: 'prop_04', col: 3, row: 1, h: 60 }, // cable spool
  { art: 'prop_03', col: 7, row: 3, h: 85 }, // parts bins
  { art: 'prop_02', col: 1, row: 3, h: 60 }, // rolling stool
  { art: 'prop_06', col: 7, row: 8, h: 110 }, // spare limbs rack
  { art: 'prop_11', col: 3, row: 9, h: 115 }, // drink machine
  { art: 'prop_09', col: 0, row: 9, h: 100 }, // plant
  { art: 'prop_12', col: 5, row: 9, h: 80 }, // shipping crates
];

// Worker routine timings (real seconds at 1×).
export const ROUTINE = { idleSeconds: 2.5, workSeconds: 4, walkSpeed: 190 }; // walkSpeed: grid units per second

// Art keys and the measured shape of each room piece, in source-image pixels.
// Measured once from the PNGs (they are not edited): where each piece touches the floor.
export const ROOM_ART = {
  floor: {
    key: 'env_01_floor_clean',
    faceTop: [237, 7], // top corner of the tile's upper face
    halfW: 230, // half the width of the upper face
    halfH: 153, // half its height: the art is drawn a little taller than 2:1, so it is squashed to fit the walls
    cells: 2, // one tile covers 2×2 cells: each of its four panels is one cell (fewer corner blocks, calmer floor)
  },
  // Wall pieces all run from the back corner down to the right (the left wall uses them mirrored).
  //   base: left end of the line where the wall meets the floor; slope: that line's slope
  //   (each piece is sheared to the room's 0.5 slope so they all line up); span: base line width;
  //   post: width of the end post, which neighbouring pieces overlap so the posts merge.
  wallScale: 0.45, // source → logical px (walls ~190 px tall, taller than the staff)
  pieces: {
    wall: { key: 'env_04_wall_straight', base: [18, 240], slope: 0.477, span: 414, post: 56 },
    door: { key: 'env_06_door', base: [6, 299], slope: 0.267, span: 426, post: 56 },
    window: { key: 'env_07_window', base: [7, 271], slope: 0.3725, span: 454, post: 56 },
  },
  corner: { key: 'env_05_wall_corner', apex: [237, 293], arm: 230, post: 56 },
  // Pieces along each back wall, from the corner outwards.
  rightWall: ['window', 'wall'],
  leftWall: ['wall', 'door', 'window'],
};

