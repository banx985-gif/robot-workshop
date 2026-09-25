// Workshop facilities F01–F15 plus the Server Rack F33 (bible §18.2), expansions (§18.1) and project bays (§18.3).
// Plain data only. The other facilities (F16–F32, F34–F35) arrive in later milestones.
//
// w × h: footprint in grid cells (rotating swaps them and mirrors the picture).
// effects: summed over every owned copy by core/FacilitySystem.js, and read by the game systems:
//   progressPct.<phase>   +% daily progress in that phase               (ProjectSystem progressModifier)
//   stationStatPct.<stat> +% of that work stat in every worker's score   (ProjectSystem statModifier)
//   gainPct.<STAT>        +% robot stat gains from phase work             (RobotBuildSystem)
//   robotStat.<STAT>      flat stat on every robot built                  (RobotBuildSystem)
//   commercialStat.<STAT> flat stat on commercial models only (not contract builds)
//   materialCostPct       % on the parts bill when a project starts
//   contractPayoutPct     +% contract pay
//   restEnergyPct         +% Energy regained per resting day
//   restMorale            + Morale per resting day
//   displaySlots          finished robots on show (each earns reputation, see DISPLAY_RULES)
//   projectBays           physical project bays (see PROJECT_BAYS)
//   researchQueues        research queues this facility can open (the rules are RESEARCH_QUEUES in data/research.js)
//   runningCostPerDay     added to each project's daily running cost (§20.5; advanced facilities, later)
// maxCount: how many copies count towards the bonus (a second desk gives another work spot, not a second bonus).
// cap: limit on that facility's total (Parts Racks: -3% each, three stack to -7%).
// unlock: see data/unlocks.js. art: picture in assets/images/facilities/ (feet: where its legs end, 0–1 down the image).
// Numbers marked "M8 choice" are not in the bible.

export const FACILITIES = {
  F01: {
    id: 'F01',
    name: 'Basic Workbench',
    cost: 600,
    w: 2,
    h: 1,
    effects: [{ key: 'stationStatPct.eng', value: 5, maxCount: 1 }],
    blurb: '+5% ENG contribution. Used when a stage has no station of its own.',
    unlock: { type: 'start' },
    art: 'facility_01_basic_workbench',
  },
  F02: {
    id: 'F02',
    name: 'Engineering Desk',
    cost: 900,
    w: 2,
    h: 1,
    effects: [{ key: 'progressPct.engineering', value: 8, maxCount: 1 }],
    blurb: '+8% Engineering stage progress.',
    unlock: { type: 'start' },
    art: 'facility_02_engineering_desk',
  },
  F03: {
    id: 'F03',
    name: 'CAD Station',
    cost: 900,
    w: 2,
    h: 1,
    effects: [{ key: 'progressPct.concept', value: 8, maxCount: 1 }],
    blurb: '+8% Concept stage progress.',
    unlock: { type: 'role', role: 'designer' },
    art: 'facility_03_cad_station',
  },
  F04: {
    id: 'F04',
    name: 'Programming Station',
    cost: 900,
    w: 2,
    h: 1,
    effects: [{ key: 'progressPct.software', value: 8, maxCount: 1 }],
    blurb: '+8% Software & Control stage progress.',
    unlock: { type: 'start' },
    art: 'facility_04_programming_station',
  },
  F05: {
    id: 'F05',
    name: 'Assembly Bay',
    cost: 1500,
    w: 3,
    h: 2,
    effects: [{ key: 'projectBays', value: 1 }],
    blurb: 'Your project bay: needed to build robots.',
    unlock: { type: 'start' },
    art: 'facility_05_assembly_bay',
    scale: 0.85, // the big bay picture, a little smaller so it doesn't swamp its neighbours
  },
  F06: {
    id: 'F06',
    name: 'Parts Rack',
    cost: 500,
    w: 1,
    h: 2,
    effects: [{ key: 'materialCostPct', value: -3, maxCount: 3, cap: -7 }],
    blurb: '-3% parts cost. Up to 3 racks stack to -7%.',
    unlock: { type: 'start' },
    art: 'facility_06_parts_rack',
  },
  F07: {
    id: 'F07',
    name: 'Battery Bench',
    cost: 1200,
    w: 2,
    h: 1,
    effects: [{ key: 'gainPct.END', value: 5, maxCount: 1 }],
    blurb: '+5% END gains on projects.',
    unlock: { type: 'research', branch: 'power', level: 1 },
    art: 'facility_07_battery_bench',
  },
  F08: {
    id: 'F08',
    name: 'Test Rig',
    cost: 1600,
    w: 2,
    h: 2,
    effects: [
      { key: 'progressPct.testing', value: 8, maxCount: 1 },
      { key: 'robotStat.REL', value: 2, maxCount: 1 },
    ],
    blurb: '+8% Testing progress, +2 REL on every robot.',
    unlock: { type: 'competition', event: 'firstEntry' },
    art: 'facility_08_test_rig',
    floor: 'env_03_floor_hazard', // test-zone floor under it
  },
  F09: {
    id: 'F09',
    name: 'Paint Booth',
    cost: 1800,
    w: 2,
    h: 2,
    effects: [{ key: 'commercialStat.APL', value: 5, maxCount: 1 }],
    blurb: '+5 APL on commercial models (not contract builds).',
    unlock: { type: 'rank', rank: 'D' },
    art: 'facility_09_paint_booth',
  },
  F10: {
    id: 'F10',
    name: 'Charging Dock',
    cost: 900,
    w: 1,
    h: 2,
    effects: [{ key: 'restEnergyPct', value: 25, maxCount: 1 }],
    blurb: 'Resting staff recover Energy 25% faster.',
    unlock: { type: 'rank', rank: 'D' },
    art: 'facility_10_charging_dock',
    rest: 2, // resting workers that can stand at it (visual)
  },
  F11: {
    id: 'F11',
    name: 'Research Desk',
    cost: 1200,
    w: 2,
    h: 1,
    effects: [{ key: 'researchQueues', value: 1, maxCount: 1 }],
    blurb: 'Opens a research queue: spend RP on new parts.',
    unlock: { type: 'flag', flag: 'firstRp' },
    art: 'facility_11_research_desk',
  },
  F12: {
    id: 'F12',
    name: 'Break Table',
    cost: 500,
    w: 2,
    h: 2,
    // M8 choice: the bible says "rest restores morale/energy" without numbers.
    effects: [
      { key: 'restEnergyPct', value: 10, maxCount: 1 },
      { key: 'restMorale', value: 0.5, maxCount: 1 },
    ],
    blurb: 'Resting staff sit here: +10% Energy and +0.5 Morale a day.',
    unlock: { type: 'start' },
    art: 'facility_12_staff_break_table',
    rest: 4,
  },
  F13: {
    id: 'F13',
    name: 'Reception Desk',
    cost: 700,
    w: 2,
    h: 1,
    effects: [{ key: 'contractPayoutPct', value: 5, maxCount: 1 }],
    blurb: '+5% contract pay.',
    unlock: { type: 'flag', flag: 'firstContractDone' },
    art: 'facility_13_reception_desk',
  },
  F14: {
    id: 'F14',
    name: 'Storage Crates',
    cost: 350,
    w: 1,
    h: 1,
    // M8 choice: "tiny cost reduction; max effect -2%" → -1% each, two count.
    effects: [{ key: 'materialCostPct', value: -1, maxCount: 2, cap: -2 }],
    blurb: 'Tidy storage: -1% parts cost each, up to -2%.',
    unlock: { type: 'start' },
    art: 'facility_14_storage_crates',
  },
  F15: {
    id: 'F15',
    name: 'Prototype Pedestal',
    cost: 1000,
    w: 1,
    h: 1,
    effects: [{ key: 'displaySlots', value: 1 }],
    blurb: 'Shows a finished robot: +1 reputation a day, up to 50 per model.',
    unlock: { type: 'flag', flag: 'firstLaunch' },
    art: 'facility_15_prototype_pedestal',
    feet: 0.985,
    stand: 0.47, // where a displayed robot's feet go (0–1 down the image)
    drop: 0.9, // how far below its centre the legs sit, in half-cell heights (default 0.3 × (w + h))
  },
};

// F33 (Milestone 9): the second research queue. Built at Rank A; the queue itself needs Rank A too.
FACILITIES.F33 = {
  id: 'F33',
  name: 'Server Rack',
  cost: 6000,
  w: 2,
  h: 1,
  effects: [{ key: 'researchQueues', value: 1, maxCount: 1 }],
  blurb: 'Opens a second research queue at Rank A.',
  unlock: { type: 'rank', rank: 'A' },
  art: 'facility_33_server_rack',
};

// F34–F35 (Milestone 17, §18.2): the two secret facilities. Neither shows in the Build catalogue until its secret opens it.
// F34 Secret Lab: comes with the hidden basement (zone XB, SEC-FAC-01) — it is never bought on its own.
FACILITIES.F34 = {
  id: 'F34',
  name: 'Secret Lab',
  cost: 25000,
  w: 4,
  h: 3,
  effects: [{ key: 'secretLab', value: 1, maxCount: 1 }],
  blurb: 'Prestige research and rumours. Some secrets need it.',
  unlock: { type: 'secret', id: 'SEC-FAC-01' },
  art: 'facility_34_secret_lab',
  catalogue: false, // arrives with the basement
  secret: true,
};
// F35 Prestige Trophy Display (SEC-FAC-02): +1% elite recruitment weight per prestige trophy, up to +5%.
FACILITIES.F35 = {
  id: 'F35',
  name: 'Prestige Trophy Display',
  cost: 18000,
  w: 3,
  h: 2,
  effects: [{ key: 'prestigeDisplay', value: 1, maxCount: 1 }],
  blurb: '+1% elite recruitment per prestige trophy (up to +5%). A proud display.',
  unlock: { type: 'secret', id: 'SEC-FAC-02' },
  art: 'facility_35_prestige_trophy_display',
  secret: true,
};
// F35: each trophy on the shelf counts (M17 reading of "per prestige trophy": the six §21.6 trophies), capped at +5%.
export const PRESTIGE_DISPLAY = { pctPerTrophy: 1, capPct: 5 };

export const FACILITY_ORDER = Object.keys(FACILITIES);

// Where staff work in each stage (§8.2): the stage's own station if the workshop has one, else a workbench,
// else the Assembly Bay.
export const STATIONS = {
  concept: ['F03'],
  engineering: ['F02'],
  software: ['F04'],
  assembly: ['F05'],
  testing: ['F08'],
  research: ['F11'], // a worker on a research queue sits at the Research Desk
};
export const FALLBACK_STATIONS = ['F01', 'F05'];

// §18.3 project bays: one bay (the Assembly Bay) to start; a second at Rank C with F19 or F20 (later milestones).
export const PROJECT_BAYS = {
  effect: 'projectBays',
  second: { rank: 'C', needsAny: ['F19', 'F20'] },
  max: 2,
};

// F15: each displayed robot earns reputation daily, up to a cap per robot (§18.2).
export const DISPLAY_RULES = { repPerDay: 1, capPerModel: 50 };

// §18.1 expansions, as rectangles on the grid (the starting room is cols 0–7, rows 0–9).
// Each opens next to the last. buyable: false = shown but not for sale yet in this build.
export const EXPANSIONS = [
  { id: 'X1', name: 'Expansion 1', note: '+4 columns', col: 8, row: 0, w: 4, h: 10, cost: 8000, unlock: { type: 'rank', rank: 'D' }, requires: [], buyable: true },
  { id: 'X2', name: 'Expansion 2', note: '+4 rows', col: 0, row: 10, w: 12, h: 4, cost: 18000, unlock: { type: 'rank', rank: 'C' }, requires: ['X1'], buyable: false },
  { id: 'X3', name: 'Expansion 3', note: '+6 columns', col: 12, row: 0, w: 6, h: 14, cost: 35000, unlock: { type: 'rank', rank: 'B' }, requires: ['X2'], buyable: false },
  { id: 'X4', name: 'Expansion 4', note: '+6 rows', col: 0, row: 14, w: 18, h: 6, cost: 60000, unlock: { type: 'rank', rank: 'A' }, requires: ['X3'], buyable: false },
  // §18.1 prestige basement: a separate 8×8 room (its own stairs), hidden until SEC-FAC-01 opens it; 25,000 credits
  // uncovers it and the Secret Lab (F34) comes built inside (§29.4).
  { id: 'XB', name: 'Secret basement', note: 'a hidden 8×8 room with the Secret Lab', col: 22, row: 0, w: 8, h: 8, cost: 25000, unlock: { type: 'secret', id: 'SEC-FAC-01' }, requires: [], buyable: true, secret: true, entrance: { col: 22, row: 7 }, comesWith: { def: 'F34', col: 24, row: 2 } },
];
export const LOCKED_LATER = 'Opens in a later update';

// The starting workshop (§18.1: 8 × 10). The door is on the left wall; its cell is always kept clear.
export const WORKSHOP_START = {
  cols: 8,
  rows: 10,
  entrance: { col: 0, row: 5 },
  sellRefundPct: 50, // §20.3
  // What a new run starts with (the bench and pedestal of Milestones 1–7, plus the Assembly Bay every project needs).
  layout: [
    { def: 'F01', col: 3, row: 4, rot: 0 },
    { def: 'F15', col: 6, row: 3, rot: 0 },
    { def: 'F05', col: 4, row: 7, rot: 0 },
  ],
};

// Art for the build screen and the room.
export const BUILD_ART = {
  buildIcon: 'ui_icon_16',
  expansionIcon: 'ui_icon_17',
  lockIcon: 'ui_icon_30',
  boundary: 'env_08_expansion_boundary',
};

// Drawing: a footprint's picture is (w + h) × half-cell width × this wide (the M1 bench: 2×1 → 200 px).
export const FACILITY_DRAW = { widthPerCell: 1.19, feet: 0.97 };
