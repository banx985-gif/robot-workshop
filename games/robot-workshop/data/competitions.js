// Robotics competitions (bible §21): all 12 events of the ladder (§21.5), the 6 trophies (§21.6) and the
// competition model's numbers. Plain data for core/CompetitionSystem.js, core/RivalSystem.js (rivals are in
// data/rivals.js), core/Rankings.js and core/TrophyCase.js.
//
// Event:
//   weights    robot stats → % weight (sum 100), §21.5 "Main weights". QLT / INN = the robot's Quality / Innovation
//              on the stat scale (× QUALITY_STAT_SCALE, C10 only).
//   rotate     C08 / C12: the weights change every running (once a month): base on each stat in the pool + boosts
//   hiddenWeights  C12: the weights stay hidden until the first attempt (§21.5)
//   target     §21.5 "Target / rival level" at the event's beatYear
//   beatYear   where the event sits in the 16-year campaign (§4.3): rivals get stronger each year after it (data/rivals.js)
//   entry      entry fee;  rewards: first place (credits, rep, prestigeTokens, the trophy it counts towards)
//   unlock     rule (data/unlocks.js + core/CompetitionPrereqs.js); inviteDelayDays: days from the rule holding to the invite
//   field      the rivals who enter: [rivalId, offsetPct]
//   rankWeight how much the event counts in the rankings (points × this)
//   rp         Research Points for taking part (§19.7: 15–150)
//   art / sky  backdrop (a cut-out scene: the sky colours are painted behind it)
const rank = (r) => ({ type: 'rank', rank: r });
const built = (purpose) => ({ type: 'purposeBuilt', purpose });
const research = (branch, level) => ({ type: 'research', branch, level });
const all = (...of) => ({ type: 'all', of });
const STATS6 = ['SPD', 'PWR', 'CTL', 'INT', 'END', 'REL'];

export const COMPETITIONS = [
  {
    id: 'C01',
    name: 'Local Workshop Trial',
    blurb: 'A friendly test day at the town hall. Reliability and control win it.',
    weights: { REL: 30, CTL: 25, INT: 20, PWR: 15, SPD: 10 },
    target: 75,
    beatYear: 1,
    entry: 0,
    rewards: { credits: 1500, rep: 50, trophy: 'localCup' },
    unlock: { type: 'counter', counter: 'projectsCompleted', min: 1 }, // "First finished robot"
    inviteDelayDays: 3, // M12 choice: the invitation arrives a few days after the first robot, not on top of it
    field: [['R01', 8], ['R04', 3], ['R03', -1], ['R02', -5], ['R05', -10]],
    rankWeight: 1,
    rp: 15,
    segments: ['Parking test', 'Obstacle slalom', 'Carry-and-place finish'],
    art: 'backdrop_competition_01',
    sky: ['#3B5C7A', '#9CC3D9'],
  },
  {
    id: 'C02',
    name: 'Delivery Dash',
    blurb: 'Parcels across town against the clock. Speed and control.',
    weights: { SPD: 30, CTL: 25, INT: 20, REL: 15, END: 10 },
    target: 115,
    beatYear: 2,
    entry: 500,
    rewards: { credits: 3000, rep: 80, trophy: 'localCup' },
    unlock: all(built('delivery'), rank('D')), // "Delivery robot + Rank D"
    field: [['R02', 8], ['R01', 3], ['R05', 0], ['R04', -4], ['R03', -10]],
    rankWeight: 1.2,
    rp: 25,
    segments: ['Loading dock start', 'Crossing rush', 'Doorstep sprint'],
    art: 'backdrop_competition_02',
    sky: ['#4A6FA5', '#F2C38B'],
  },
  {
    id: 'C03',
    name: 'Warehouse Load Challenge',
    blurb: 'Stack, lift and shift pallets. Power and stamina.',
    weights: { PWR: 35, END: 25, REL: 20, CTL: 10, INT: 10 },
    target: 145,
    beatYear: 3,
    entry: 700,
    rewards: { credits: 4000, rep: 100, trophy: 'localCup' },
    unlock: built('warehouse'), // "Warehouse robot"
    field: [['R03', 8], ['R01', 3], ['R06', 0], ['R04', -4], ['R02', -10]],
    rankWeight: 1.4,
    rp: 30,
    segments: ['Pallet pick-up', 'High-shelf stack', 'Loading bay rush'],
    art: 'backdrop_competition_03',
    sky: ['#5B6B7D', '#C9D6E0'],
  },
  {
    id: 'C04',
    name: 'City Obstacle Sprint',
    blurb: 'Kerbs, cones and crossings through the city centre.',
    weights: { CTL: 30, SPD: 25, INT: 20, REL: 15, END: 10 },
    target: 180,
    beatYear: 4,
    entry: 1000,
    rewards: { credits: 5500, rep: 130 },
    unlock: rank('C'), // "Rank C"
    field: [['R02', 7], ['R04', 4], ['R05', 0], ['R01', -4], ['R03', -9]],
    rankWeight: 1.6,
    rp: 40,
    segments: ['Kerb hop start', 'Cone maze', 'Plaza sprint'],
    art: 'backdrop_competition_04',
    sky: ['#3E5F8A', '#F5B971'],
  },
  {
    id: 'C05',
    name: 'Rescue Response',
    blurb: 'A mock disaster drill. Keep going, keep thinking, never break.',
    weights: { REL: 30, INT: 20, CTL: 15, PWR: 15, END: 15, SPD: 5 },
    target: 215,
    beatYear: 5,
    entry: 1300,
    rewards: { credits: 7000, rep: 160 },
    unlock: all(built('rescue'), research('tool', 3)), // "Rescue robot + TO04" (TO04 Rescue Cutter = Tool Research 3)
    field: [['R06', 8], ['R04', 3], ['R01', 0], ['R03', -4], ['R02', -9]],
    rankWeight: 1.8,
    rp: 45,
    segments: ['Rubble search', 'Cut and lift', 'Safe carry-out'],
    art: 'backdrop_competition_05',
    sky: ['#6A4A4A', '#E8A87C'],
  },
  {
    id: 'C06',
    name: 'Construction Challenge',
    blurb: 'Build a small wall faster and straighter than anyone.',
    weights: { PWR: 30, REL: 25, END: 20, CTL: 15, INT: 10 },
    target: 245,
    beatYear: 6,
    entry: 1600,
    rewards: { credits: 8500, rep: 190 },
    unlock: all(built('builder'), research('tool', 4)), // "Builder + TO05" (TO05 Construction Tool = Tool Research 4)
    field: [['R03', 8], ['R07', 3], ['R01', -1], ['R06', -5], ['R04', -10]],
    rankWeight: 2,
    rp: 50,
    segments: ['Foundations', 'Brick run', 'Level and finish'],
    art: 'backdrop_competition_06',
    sky: ['#4B6584', '#F7D794'],
  },
  {
    id: 'C07',
    name: 'Regional Racing Circuit',
    blurb: 'The big track. Speed first, control close behind.',
    weights: { SPD: 40, CTL: 30, REL: 15, INT: 10, END: 5 },
    target: 275,
    beatYear: 7, // Regional: Years 6–9
    entry: 2000,
    rewards: { credits: 11000, rep: 250, trophy: 'regionalCup' },
    unlock: all(built('racing'), rank('C')), // "Racing + Rank C"
    field: [['R05', 9], ['R02', 5], ['R07', 1], ['R04', -4], ['R03', -9]],
    rankWeight: 2.5,
    rp: 55,
    segments: ['Rolling start', 'Chicane section', 'Final lap'],
    art: 'backdrop_competition_07',
    sky: ['#2E4C7D', '#E9A66B'],
  },
  {
    id: 'C08',
    name: 'National Robotics Arena',
    blurb: 'All-round tests in the national arena. Two stats are boosted each month.',
    weights: Object.fromEntries(STATS6.map((k) => [k, 10])), // replaced every running by rotate
    rotate: { pool: STATS6, base: 10, boosts: [20, 20] }, // "balanced, event rotates two boosted stats"
    target: 325,
    beatYear: 11, // National: Years 10–14
    entry: 3000,
    rewards: { credits: 16000, rep: 400, trophy: 'nationalCup' },
    unlock: { type: 'eventWins', events: ['C04', 'C05', 'C06', 'C07'], min: 3 }, // "Win C04–C07 any 3"
    field: [['R07', 8], ['R05', 4], ['R02', 1], ['R04', -3], ['R06', -8]],
    rankWeight: 3,
    rp: 70,
    segments: ['Arena entrance', 'Spotlight test', 'Grand final'],
    art: 'backdrop_competition_08',
    sky: ['#26334D', '#7A8FB8'],
  },
  {
    id: 'C09',
    name: 'World Robotics Championship',
    blurb: 'The best robots on the planet. Balanced, with Reliability and Intelligence slightly favoured.',
    weights: { SPD: 15, PWR: 15, CTL: 15, INT: 20, END: 15, REL: 20 },
    target: 395,
    beatYear: 15, // the Year 15–16 finale
    entry: 5000,
    rewards: { credits: 28000, rep: 800, trophy: 'worldCup' },
    // "Rank A + National Cup + 5 advanced robots" (advanced = Advanced-tier projects or above)
    unlock: all(rank('A'), { type: 'trophy', id: 'nationalCup' }, { type: 'counter', counter: 'advancedRobots', min: 5 }),
    field: [['R07', 9], ['R05', 5], ['R04', 2], ['R02', -2], ['R06', -6]],
    rankWeight: 4,
    rp: 100,
    segments: ['World stage opening', 'Champions challenge', 'Title decider'],
    art: 'backdrop_competition_09',
    sky: ['#1F2A44', '#C9A227'],
  },
  {
    id: 'C10',
    name: 'Elite Technology Expo',
    blurb: 'Judged on everything: Quality, Innovation, Appeal and every stat.',
    weights: { QLT: 15, INN: 15, APL: 15, SPD: 10, PWR: 10, CTL: 10, INT: 10, END: 5, REL: 10 },
    target: 455,
    beatYear: 16,
    entry: 7500,
    rewards: { credits: 40000, rep: 0, prestigeTokens: 1, trophy: 'eliteMasters' },
    // "Year 16 ending + Rank S". M13 choice until the ending exists (Milestone 19): Year 16 reached + Rank S.
    unlock: all({ type: 'yearReached', year: 16 }, rank('S')),
    field: [['R07', 8], ['R04', 4], ['R05', 1], ['R02', -3], ['R06', -7]],
    rankWeight: 4,
    rp: 120,
    segments: ['Showcase', "Judges' trials", 'Grand demonstration'],
    art: 'backdrop_competition_10',
    sky: ['#2B2D42', '#8D99AE'],
  },
  {
    id: 'C11',
    name: 'Lunar Robotics League',
    blurb: 'Low gravity, long nights, no mistakes.',
    weights: { END: 25, INT: 20, REL: 20, CTL: 15, SPD: 10, PWR: 10 },
    target: 520,
    beatYear: 16,
    entry: 10000,
    rewards: { credits: 60000, rep: 0, prestigeTokens: 2, trophy: 'eliteMasters' },
    unlock: { type: 'secret', id: 'SEC-COMPETITION-01' }, // the Lunar Invitation (its rule needs the Year 16 ending: postgame or NG+)
    secret: true,
    field: [['R07', 8], ['R06', 4], ['R04', 1], ['R05', -3], ['R02', -7]],
    rankWeight: 5,
    rp: 135,
    segments: ['Crater descent', 'Regolith haul', 'Earthrise sprint'],
    art: 'backdrop_competition_11',
    sky: ['#0B0F1E', '#2D3561'],
  },
  {
    id: 'C12',
    name: 'Black Circuit',
    blurb: 'A private invitational. Nobody will tell you what it judges.',
    weights: Object.fromEntries(STATS6.map((k) => [k, 8])), // replaced every running by rotate
    rotate: { pool: STATS6, base: 8, boosts: [26, 16, 10] }, // "hidden dynamic weights"
    hiddenWeights: true, // "revealed after first attempt"
    target: 590,
    beatYear: 16,
    entry: 15000,
    rewards: { credits: 100000, rep: 0, prestigeTokens: 4, trophy: 'prestigeCrown' },
    unlock: all({ type: 'accountFlag', flag: 'blackCircuit' }, rank('A')), // SEC-COMPETITION-03 invitation + the 3-token stake, for good once Rank A
    secret: true,
    field: [['R08', 10], ['R07', 5], ['R05', 1], ['R04', -3], ['R02', -6]],
    rankWeight: 5,
    rp: 150,
    segments: ['Blackout start', 'The Maze', 'Redline'],
    art: 'backdrop_competition_12',
    sky: ['#050608', '#3A1C4A'],
  },
];
export const COMPETITIONS_BY_ID = Object.fromEntries(COMPETITIONS.map((c) => [c.id, c]));

// C10 judges Quality and Innovation too: they count on the stat scale as value × this (M13 choice: Quality 100 → 600).
export const QUALITY_STAT_SCALE = 6;

// The competition model (§21.3). Numbers marked "M12/M13 choice" are not in the bible.
export const COMPETITION_RULES = {
  // M13 choice (replaces M12's flat × 0.4): robots in this build score far above the bible's event scale, and their
  // scores rise more slowly than §21.5's targets do. The robot part of the score is (weighted − 70) × 0.7, so a first
  // Helper with Kai is a slight favourite at the Local Trial, a Rank B team can take the Regional Circuit and a Rank A
  // team with top parts can win the World Championship. To be revisited in the balance pass (Milestone 28).
  entrantScale: 0.7,
  entrantOffset: 70,
  pilotWeights: { tst: 0.28, eng: 0.04, prg: 0.04 }, // pilotContribution = TST × 0.28 + ENG × 0.04 + PRG × 0.04
  reliabilityStat: 'REL',
  statCap: 999,
  form: { min: 0.97, max: 1.03 }, // seeded per segment
  // M12 choice: event pressure per segment (Start / Mid / Final push) as a % score penalty, plus more while the
  // pilot is Stressed (Morale under 25). Calm Under Pressure halves it (§9.8).
  stressPct: [0, 2, 4],
  stressedPilotPct: 3,
  breakdown: {
    basePct: 8, // max(0.5%, 8% − effectiveREL / 55)
    minPct: 0.5,
    relDivisor: 55,
    perFaultPct: 2, // + unresolved faults × 2%
    maxPct: 45, // M12 choice: never above this per segment
    // Severity when one happens (M12 choice): catastrophic only if allowed (§21.3), else it becomes major.
    shares: { catastrophic: 0.12, major: 0.3 },
    minorPct: 12, // −12% current segment
    majorPct: 30, // −30% segment
    majorNextPct: 8, // and −8% next segment
    catastrophicRelBelow: 120, // DNF only if effective REL < 120 …
    catastrophicFaults: 3, // … or unresolved faults ≥ 3
    at: [0.3, 0.7], // where in the segment it happens (for the watch view)
  },
  // componentHighComplexityPenalty (M12 choice): +0.5% breakdown chance per part of complexity 6 or more.
  highComplexity: { minCx: 6, pctEach: 0.5 },
  rivals: { variancePct: 5 }, // seeded ± per entry; everything else about rivals is in data/rivals.js
  // M12 choice: prizes below first place, as shares of the first-place prize; 4th and below get entryRep.
  prizeShares: [
    { credits: 1, rep: 1 },
    { credits: 0.4, rep: 0.5 },
    { credits: 0.2, rep: 0.25 },
  ],
  entryRep: 5,
  // M12 choice: pilot XP = target × 0.5 + a placing bonus.
  xp: { perTarget: 0.5, place: [60, 40, 25], other: 10 },
  winMorale: { min: 5, max: 12 }, // §9.5 competition win +5 to +12 (the pilot)
  oncePerMonth: true, // M12 choice: each event runs once a game month (a "running"; rotating weights change with it)
  resultsKept: 30,
};

// M13 choice: ranking points per placing (× the event's rankWeight), like a racing league.
export const RANKING_POINTS = [25, 18, 15, 12, 10, 8];

// §21.6 trophies: awarded once, kept for the run.
export const TROPHIES = [
  { id: 'localCup', name: 'Local Cup', art: 'trophy_01', rule: { type: 'eventWins', events: ['C01', 'C02', 'C03'], min: 3 }, note: 'Win C01, C02 and C03 at least once' },
  { id: 'regionalCup', name: 'Regional Cup', art: 'trophy_02', rule: { type: 'eventWins', events: ['C07'], min: 1 }, note: 'Win the Regional Racing Circuit (C07)' },
  { id: 'nationalCup', name: 'National Cup', art: 'trophy_03', rule: { type: 'eventWins', events: ['C08'], min: 1 }, note: 'Win the National Robotics Arena (C08)' },
  { id: 'worldCup', name: 'World Cup', art: 'trophy_04', rule: { type: 'eventWins', events: ['C09'], min: 1 }, note: 'Win the World Robotics Championship (C09)' },
  { id: 'eliteMasters', name: 'Elite Masters', art: 'trophy_05', rule: { type: 'eventWins', events: ['C10', 'C11'], min: 2 }, note: 'Win the Elite Expo (C10) and the Lunar League (C11)' },
  { id: 'prestigeCrown', name: 'Secret Prestige Crown', art: 'trophy_06', rule: { type: 'eventWins', events: ['C12'], min: 1 }, note: 'Win the Black Circuit (C12)', secret: true },
];
export const TROPHIES_BY_ID = Object.fromEntries(TROPHIES.map((t) => [t.id, t]));

// Art (already in the folder).
export const COMPETITION_ART = {
  icon: 'ui_icon_08_competition',
  winBurst: 'vfx_10',
  lossPuff: 'vfx_11',
  firstMoment: 'event_art_04',
  worldMoment: 'event_art_06', // the World Championship invitation
  rankingsIcon: 'ui_icon_18',
  trophiesIcon: 'ui_icon_19',
  rankUpBurst: 'vfx_07',
};
