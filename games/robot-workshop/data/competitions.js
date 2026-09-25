// Robotics competitions (bible §21) and the rival companies that race in them (§22). Plain data for
// core/CompetitionSystem.js. Milestone 12 builds only C01 Local Workshop Trial, C02 Delivery Dash and
// C07 Regional Racing Circuit (§21.5 rows); the other nine events, the trophy ladder and rankings are Milestone 13.
//
// Event:
//   weights   robot stats → % weight (sum 100), §21.5 "Main weights"
//   target    §21.5 "Target / rival level": roughly what the rival field scores
//   entry     entry fee (credits);  rewards: first place (credits, rep, trophy it counts towards)
//   unlock    rule from data/unlocks.js; inviteDelayDays: days between the rule being met and the invitation
//   field     the rivals who enter: [rivalId, offsetPct] — each rival's base = target × (1 + offset%)
//   rp        Research Points for taking part (§19.7: competitions give 15–150)
//   art       backdrop (a cut-out scene: sky colours are drawn behind it)
const rank = (r) => ({ type: 'rank', rank: r });
const built = (purpose) => ({ type: 'purposeBuilt', purpose });
const all = (...of) => ({ type: 'all', of });

export const COMPETITIONS = [
  {
    id: 'C01',
    name: 'Local Workshop Trial',
    blurb: 'A friendly test day at the town hall. Reliability and control win it.',
    weights: { REL: 30, CTL: 25, INT: 20, PWR: 15, SPD: 10 },
    target: 75,
    entry: 0,
    rewards: { credits: 1500, rep: 50, trophy: 'localCup' },
    unlock: { type: 'counter', counter: 'projectsCompleted', min: 1 }, // "First finished robot"
    inviteDelayDays: 3, // M12 choice: the invitation arrives a few days after the first robot, not on top of it
    field: [['R01', 8], ['R04', 3], ['R03', -1], ['R02', -5], ['R05', -10]],
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
    entry: 500,
    rewards: { credits: 3000, rep: 80, trophy: 'localCup' },
    unlock: all(built('delivery'), rank('D')), // "Delivery robot + Rank D"
    inviteDelayDays: 0,
    field: [['R02', 8], ['R01', 3], ['R05', 0], ['R04', -4], ['R03', -10]],
    rp: 25,
    segments: ['Loading dock start', 'Crossing rush', 'Doorstep sprint'],
    art: 'backdrop_competition_02',
    sky: ['#4A6FA5', '#F2C38B'],
  },
  {
    id: 'C07',
    name: 'Regional Racing Circuit',
    blurb: 'The big track. Speed first, control close behind.',
    weights: { SPD: 40, CTL: 30, REL: 15, INT: 10, END: 5 },
    target: 275,
    entry: 2000,
    rewards: { credits: 11000, rep: 250, trophy: 'regionalCup' },
    unlock: all(built('racing'), rank('C')), // "Racing + Rank C"
    inviteDelayDays: 0,
    field: [['R05', 9], ['R02', 5], ['R07', 1], ['R04', -4], ['R03', -9]],
    rp: 55,
    segments: ['Rolling start', 'Chicane section', 'Final lap'],
    art: 'backdrop_competition_07',
    sky: ['#2E4C7D', '#E9A66B'],
  },
];
export const COMPETITIONS_BY_ID = Object.fromEntries(COMPETITIONS.map((c) => [c.id, c]));

// §22 rival companies. strengths: the stats they build for (their specialty modifier in events that weigh them).
// Only a name, logo and strengths for now; managers, dialogue and the rivals screen are Milestone 13.
export const RIVALS = [
  { id: 'R01', name: 'BoltBarn Robotics', logo: 'logo_rival_01', color: '#FFB74D', strengths: ['REL'] },
  { id: 'R02', name: 'Swift Arc Labs', logo: 'logo_rival_02', color: '#4FC3F7', strengths: ['SPD', 'CTL'] },
  { id: 'R03', name: 'Iron Mule Automation', logo: 'logo_rival_03', color: '#A1887F', strengths: ['PWR', 'END'] },
  { id: 'R04', name: 'Lumen Logic', logo: 'logo_rival_04', color: '#B39DDB', strengths: ['INT', 'CTL'] },
  { id: 'R05', name: 'Apex Motion', logo: 'logo_rival_05', color: '#FF8A80', strengths: ['SPD'] },
  { id: 'R06', name: 'Northstar Rescue Tech', logo: 'logo_rival_06', color: '#80CBC4', strengths: ['REL', 'INT'] },
  { id: 'R07', name: 'TitanWorks', logo: 'logo_rival_07', color: '#CFD8DC', strengths: [] }, // high balanced stats
];

// The competition model (§21.3). Numbers marked "M12 choice" are not in the bible.
export const COMPETITION_RULES = {
  // M12 choice: robots in this build score ~2–4× the bible's event scale (a first Helper's C01-weighted stats are
  // ~170 against a target of 75), so the robot part of the score is multiplied by this. That keeps §21.5's targets and
  // the pilot's share of the score (§21.3) as the bible meant. To be revisited in the balance pass (Milestone 28).
  entrantScale: 0.4,
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
  rivals: {
    variancePct: 5, // seeded ± per entry
    specialtyBase: 40, // rival strengths weighing more than 40% of the event lift them, less drops them
    specialtyPctPerPoint: 0.15,
    ngPlusPct: 6, // per NG+ run (NG+ arrives later)
  },
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
  oncePerMonth: true, // M12 choice: each event runs once a game month
  resultsKept: 30,
};

// Trophies the events count towards (§21.6). The ladder itself is Milestone 13; here only the Local Cup progress.
export const TROPHIES = {
  localCup: { name: 'Local Cup', art: 'trophy_01', needs: ['C01', 'C02', 'C03'], note: 'Win C01–C03 at least once' },
  regionalCup: { name: 'Regional Cup', art: null, needs: ['C07'], note: 'Win C07' },
};

// Art (already in the folder).
export const COMPETITION_ART = {
  icon: 'ui_icon_08_competition',
  winBurst: 'vfx_10',
  lossPuff: 'vfx_11',
  firstMoment: 'event_art_04',
};
