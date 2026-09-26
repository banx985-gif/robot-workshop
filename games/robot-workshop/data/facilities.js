// Workshop facilities F01–F35 (bible §18.2), expansions (§18.1) and project bays (§18.3). Plain data only.
// F01–F15 Milestone 8, F33 Milestone 9, the secret F34–F35 Milestone 17, F16–F32 Milestone 19.
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
//   runningCostPerDay     added to each project's daily running cost (§20.5)
//   faultPts.<phase>      percentage points on the daily fault chance in that stage (F18)
//   tierCx.<slot>         complexity added to that slot's part when the project tier is worked out (F22)
//   tagStat.<tag>.<STAT>  flat stat on robots with a part carrying that tag (F26: hover / rocket / aero)
//   heavyBay              lets CH08–CH10 robots be built (F20, HEAVY_BAY)
//   progressPct.mixedTeam +% stage progress when the team has MEETING_ROOM.minRoles roles (F30)
//   competitionPrep       added to every competition score (F25)
//   salesUnitsPct         +% units sold (F31)       sponsorBenefitPct  +% on the active sponsor's benefits (F32)
//   moraleFloor           nobody's Morale drops below this (F29)
//   trainingSlots / pilotTrainingSlots / trainingDaysPct / pilotTrainingDaysPct / simulatorTst  training (F27, F28)
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

// F16–F32 (Milestone 19, from the fixes queue — bible §18.2): the advanced facilities. Numbers are the bible's;
// "M19 reading" marks how a line of §18.2 became an effect key.
const advanced = (id, name, cost, w, h, effects, blurb, unlock, art, extra = {}) => ({ id, name, cost, w, h, effects, blurb, unlock, art, ...extra });
const research = (branch, level) => ({ type: 'research', branch, level });
const rank = (r) => ({ type: 'rank', rank: r });
Object.assign(FACILITIES, {
  F16: advanced('F16', 'Advanced Engineering', 4000, 2, 2, [{ key: 'progressPct.engineering', value: 15, maxCount: 1 }, { key: 'robotStat.PWR', value: 4, maxCount: 1 }, { key: 'robotStat.END', value: 4, maxCount: 1 }], '+15% Engineering, +4 PWR and END.', rank('C'), 'facility_16_advanced_engineering'),
  F17: advanced('F17', 'Advanced CAD', 4000, 2, 2, [{ key: 'progressPct.concept', value: 15, maxCount: 1 }, { key: 'robotStat.APL', value: 4, maxCount: 1 }], '+15% Concept stage, +4 APL.', rank('C'), 'facility_17_advanced_cad'),
  // M19 reading of "-1% software fault chance": one point off the 2.5% daily fault chance in the Software stage.
  F18: advanced('F18', 'AI Lab', 5000, 3, 2, [{ key: 'progressPct.software', value: 15, maxCount: 1 }, { key: 'faultPts.software', value: -1, maxCount: 1 }], '+15% Software, fewer software faults.', research('ai', 4), 'facility_18_ai_lab'),
  // With Rank C, F19 or F20 opens the second project bay (PROJECT_BAYS below).
  F19: advanced('F19', 'Precision Assembly', 5500, 3, 2, [{ key: 'progressPct.assembly', value: 15, maxCount: 1 }, { key: 'robotStat.REL', value: 5, maxCount: 1 }], '+15% Assembly, +5 REL; a second bay.', research('mechanical', 5), 'facility_19_precision_assembly'),
  F20: advanced('F20', 'Heavy Assembly Bay', 6500, 4, 3, [{ key: 'heavyBay', value: 1, maxCount: 1 }], 'Builds CH08–CH10 robots; a second bay.', { type: 'all', of: [rank('B'), { type: 'partOpen', id: 'CH08' }] }, 'facility_20_heavy_assembly'),
  F21: advanced('F21', 'Materials Lab', 5500, 3, 2, [{ key: 'robotStat.END', value: 6, maxCount: 1 }, { key: 'robotStat.REL', value: 6, maxCount: 1 }], '+6 END and REL. Needed for CH06.', research('mechanical', 4), 'facility_21_materials_lab'),
  // M19 reading of "-1 complexity for PO components for tier calc": the power part counts 1 less when the project tier is worked out.
  F22: advanced('F22', 'Power Lab', 5500, 3, 2, [{ key: 'robotStat.PWR', value: 6, maxCount: 1 }, { key: 'robotStat.END', value: 6, maxCount: 1 }, { key: 'tierCx.power', value: -1, maxCount: 1 }], '+6 PWR and END; power parts count −1.', research('power', 4), 'facility_22_power_lab'),
  F23: advanced('F23', 'Sensor Lab', 5000, 3, 2, [{ key: 'robotStat.INT', value: 6, maxCount: 1 }, { key: 'robotStat.CTL', value: 6, maxCount: 1 }], '+6 INT and CTL on every robot.', research('ai', 3), 'facility_23_sensor_lab'),
  F24: advanced('F24', 'Drive Test Bench', 5000, 3, 2, [{ key: 'robotStat.SPD', value: 6, maxCount: 1 }, { key: 'robotStat.CTL', value: 6, maxCount: 1 }], '+6 SPD and CTL on every robot.', research('mobility', 4), 'facility_24_drive_test_bench'),
  // M19 reading of "+12 Testing phase score for competition prototypes": +12 to the preparation part of every competition score.
  F25: advanced('F25', 'Dyno Test Rig', 6500, 3, 2, [{ key: 'competitionPrep', value: 12, maxCount: 1 }], '+12 on every competition score.', rank('B'), 'facility_25_dyno_test_rig'),
  // Aero / Hover / Rocket builds: a robot whose parts carry one of those tags (MO07 Hover Drive, MO08 Rocket/Skate Drive).
  F26: advanced('F26', 'Wind Tunnel', 8000, 4, 2, ['hover', 'rocket', 'aero'].flatMap((t) => [{ key: `tagStat.${t}.SPD`, value: 10, maxCount: 1 }, { key: `tagStat.${t}.CTL`, value: 6, maxCount: 1 }]), 'Aero, hover, rocket builds: +10 SPD, +6 CTL.', research('mobility', 5), 'facility_26_wind_tunnel'),
  // M19 reading of "+3 TST from first use/worker/year": a pilot finishing a course here gains +3 TST, once a year each.
  F27: advanced('F27', 'Pilot Simulator', 5500, 2, 2, [{ key: 'pilotTrainingDaysPct', value: -25, maxCount: 1 }, { key: 'pilotTrainingSlots', value: 1, maxCount: 1 }, { key: 'simulatorTst', value: 3, maxCount: 1 }], 'Pilot slot, pilot courses −25%, +3 TST.', rank('C'), 'facility_27_simulator'),
  F28: advanced('F28', 'Training Station', 4500, 2, 2, [{ key: 'trainingDaysPct', value: -20, maxCount: 1 }, { key: 'trainingSlots', value: 1, maxCount: 1 }], 'A second training slot, courses −20%.', rank('C'), 'facility_28_training_station'),
  F29: advanced('F29', 'Staff Lounge', 4000, 3, 2, [{ key: 'restEnergyPct', value: 60, maxCount: 1 }, { key: 'moraleFloor', value: 5, maxCount: 1 }], 'Rest 60% faster; Morale never below 5.', rank('C'), 'facility_29_staff_lounge', { rest: 4 }),
  F30: advanced('F30', 'Meeting Room', 4500, 3, 2, [{ key: 'progressPct.mixedTeam', value: 5, maxCount: 1 }], '+5% progress with 3+ roles on a team.', rank('B'), 'facility_30_meeting_room'),
  F31: advanced('F31', 'Showroom', 7000, 4, 2, [{ key: 'salesUnitsPct', value: 8, maxCount: 1 }], 'Robots on sale sell 8% more.', rank('B'), 'facility_31_showroom'),
  F32: advanced('F32', 'Sponsor Wall', 3500, 2, 1, [{ key: 'sponsorBenefitPct', value: 10, maxCount: 1 }], 'Sponsor benefits +10%.', { type: 'flag', flag: 'firstSponsor' }, 'facility_32_sponsor_wall'),
});
// F20: the chassis that need the Heavy Assembly Bay (§18.2). F30: how many roles make a "mixed" team.
export const HEAVY_BAY = { effect: 'heavyBay', parts: ['CH08', 'CH09', 'CH10'] };
export const MEETING_ROOM = { effect: 'progressPct.mixedTeam', minRoles: 3 };

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
// Milestone 19: the advanced desks join their stage (both are used, whoever is free first); trainees go to the
// Training Station or the Pilot Simulator when there is one.
export const STATIONS = {
  concept: ['F03', 'F17'],
  engineering: ['F02', 'F16'],
  software: ['F04', 'F18'],
  assembly: ['F05'],
  testing: ['F08', 'F25'],
  research: ['F11'], // a worker on a research queue sits at the Research Desk
  training: ['F28', 'F27'],
};
export const FALLBACK_STATIONS = ['F01', 'F05'];

// §18.3 project bays: one bay (the Assembly Bay) to start; a second at Rank C with F19 or F20.
export const PROJECT_BAYS = {
  effect: 'projectBays',
  second: { rank: 'C', needsAny: ['F19', 'F20'] },
  max: 2,
};

// F15: each displayed robot earns reputation daily, up to a cap per robot (§18.2).
export const DISPLAY_RULES = { repPerDay: 1, capPerModel: 50 };

// §18.1 expansions, as rectangles on the grid (the starting room is cols 0–7, rows 0–9).
// Each opens next to the last. buyable: false = shown but not for sale yet (all four are for sale since Milestone 19).
export const EXPANSIONS = [
  { id: 'X1', name: 'Expansion 1', note: '+4 columns', col: 8, row: 0, w: 4, h: 10, cost: 8000, unlock: { type: 'rank', rank: 'D' }, requires: [], buyable: true },
  { id: 'X2', name: 'Expansion 2', note: '+4 rows', col: 0, row: 10, w: 12, h: 4, cost: 18000, unlock: { type: 'rank', rank: 'C' }, requires: ['X1'], buyable: true },
  { id: 'X3', name: 'Expansion 3', note: '+6 columns', col: 12, row: 0, w: 6, h: 14, cost: 35000, unlock: { type: 'rank', rank: 'B' }, requires: ['X2'], buyable: true },
  { id: 'X4', name: 'Expansion 4', note: '+6 rows', col: 0, row: 14, w: 18, h: 6, cost: 60000, unlock: { type: 'rank', rank: 'A' }, requires: ['X3'], buyable: true },
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
  // What a new run starts with. Milestone 17b: a fuller, readable factory from minute one (existing saves keep their
  // own layout): the desks along the back wall, the parts rack by the Assembly Bay, the bench in front, the break
  // table by the door, the pedestal where finished robots are shown.
  layout: [
    { def: 'F02', col: 1, row: 0, rot: 0 }, // Engineering Desk
    { def: 'F04', col: 4, row: 0, rot: 0 }, // Programming Station
    { def: 'F06', col: 7, row: 0, rot: 0 }, // Parts Rack
    { def: 'F01', col: 2, row: 3, rot: 0 }, // Basic Workbench
    { def: 'F05', col: 4, row: 4, rot: 0 }, // Assembly Bay (the robot-building machine)
    { def: 'F15', col: 7, row: 6, rot: 0 }, // Prototype Pedestal
    { def: 'F12', col: 1, row: 7, rot: 0 }, // Break Table
    { def: 'F14', col: 6, row: 9, rot: 0 }, // Storage Crates
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

// Milestone 17b station menus: what a station could become (bible §18.2), shown in its Upgrade section (all real
// facilities since Milestone 19: the menu reads their live price and unlock rule).
export const STATION_UPGRADES = {
  F01: [{ id: 'F16', name: 'Advanced Engineering', cost: 4000, needs: 'Company Rank C', note: '+15% Engineering, +4 PWR/END' }],
  F02: [{ id: 'F16', name: 'Advanced Engineering', cost: 4000, needs: 'Company Rank C', note: '+15% Engineering, +4 PWR/END' }],
  F03: [{ id: 'F17', name: 'Advanced CAD', cost: 4000, needs: 'Company Rank C', note: '+15% Concept, +4 APL' }],
  F04: [{ id: 'F18', name: 'AI Lab', cost: 5000, needs: 'AI Research 4', note: '+15% Software, fewer software faults' }],
  F05: [
    { id: 'F19', name: 'Precision Assembly', cost: 5500, needs: 'Mechanical Research 5', note: '+15% Assembly, +5 REL' },
    { id: 'F20', name: 'Heavy Assembly Bay', cost: 6500, needs: 'Company Rank B', note: 'needed for CH08–CH10 robots' },
  ],
  F07: [{ id: 'F22', name: 'Power Lab', cost: 5500, needs: 'Power Research 4', note: '+6 PWR/END' }],
  F08: [{ id: 'F25', name: 'Dyno Test Rig', cost: 6500, needs: 'Company Rank B', note: '+12 Testing for competition robots' }],
  F10: [{ id: 'F29', name: 'Staff Lounge', cost: 4000, needs: 'Company Rank C', note: 'rest +60%, morale floor +5' }],
  F11: [{ id: 'F33', name: 'Server Rack', cost: 6000, needs: 'Company Rank A', note: 'a second research queue' }],
  F12: [{ id: 'F29', name: 'Staff Lounge', cost: 4000, needs: 'Company Rank C', note: 'rest +60%, morale floor +5' }],
  F13: [{ id: 'F32', name: 'Sponsor Wall', cost: 3500, needs: 'First sponsor', note: 'sponsor rewards +10%' }],
  F15: [{ id: 'F31', name: 'Showroom', cost: 7000, needs: 'Company Rank B', note: '+8% units sold' }],
};
