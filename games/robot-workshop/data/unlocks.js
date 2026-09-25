// Words and allowed values for unlock rules (parts §11, purposes, facilities §18.2). Plain data.
// Everything is checked by Campaign.unlockMet() (Milestone 9: research counts for real).
//   { type: 'research', branch, level }  that research node is done (for a part or facility a node names in its
//                                        unlock actions, that action must have fired — see data/research.js)
//   { type: 'researchCount', min }       that many visible research nodes done in total
//   { type: 'feature', id }              a research feature has switched on (data/research.js FEATURES)
//   { type: 'flag', flag }  a first-time milestone of the run (first launch, first contract…)
//   { type: 'role', role }  the company employs someone in that role (e.g. its first Designer)

export const UNLOCK_TYPES = ['start', 'research', 'facility', 'rank', 'counter', 'competition', 'secret', 'flag', 'role', 'researchCount', 'feature', 'all'];

export const RESEARCH_BRANCHES = {
  mechanical: 'Mechanical Research',
  mobility: 'Mobility Research',
  ai: 'AI Research',
  tool: 'Tool Research',
  power: 'Power Research',
  special: 'Special Research',
};
export const RESEARCH_MAX_LEVEL = 6;

// Facilities referenced by part unlock rules that are not in data/facilities.js yet (F16–F35 come later).
export const FACILITY_NAMES = {
  F18: 'AI Lab',
  F21: 'Materials Lab',
  F22: 'Power Lab',
  F23: 'Sensor Lab',
  F24: 'Drive Test Bench',
  F26: 'Wind Tunnel',
};

export const COUNTERS = {
  researchPrototypes: '{n} Research Prototypes', // {n} = the rule's min
  distinctPurposesCompleted: '{n} different purposes completed',
  // Staff unlocks (§15, Milestone 11).
  projectsCompleted: 'Complete {n} projects',
  commercialLaunches: 'Launch {n} commercial models',
  aiHeavyProjects: 'Complete {n} AI-heavy projects',
  zeroFaultProjects: 'Finish {n} projects with zero faults',
};

export const COMPETITION_EVENTS = {
  firstEntry: 'First competition entered',
  regionalCup: 'Regional Cup',
  nationalCup: 'National Cup',
  worldTier: 'World-tier access',
  localTrial: 'After the Local Trial',
  wins: 'Win {n} competitions', // { type: 'competition', event: 'wins', min }
};

// M11 choice: an "AI-heavy" project (PRG06 Noor Syn's unlock) is a robot whose AI / Sensors part is
// complexity 3 or more (Lidar Array and up).
export const AI_HEAVY = { slot: 'ai', minCx: 3 };

// Run flags an unlock can wait for (Campaign.flags).
export const FLAG_NAMES = {
  firstLaunch: 'First commercial launch',
  firstContractDone: 'First contract completed',
  firstRp: 'First Research Points earned',
  ngPlus: 'New Game+',
};
