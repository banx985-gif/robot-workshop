// Words and allowed values for unlock rules (parts §11, purposes, facilities §18.2). Plain data.
// Parts and purposes open through research from Milestone 9; facilities check their rules from Milestone 8.
//   { type: 'flag', flag }  a first-time milestone of the run (first launch, first contract…)
//   { type: 'role', role }  the company employs someone in that role (e.g. its first Designer)

export const UNLOCK_TYPES = ['start', 'research', 'facility', 'rank', 'counter', 'competition', 'secret', 'flag', 'role', 'all'];

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
export const FACILITY_NAMES = { F21: 'Materials Lab' };

export const COUNTERS = {
  researchPrototypes: '{n} Research Prototypes', // {n} = the rule's min
  distinctPurposesCompleted: '{n} different purposes completed',
};

export const COMPETITION_EVENTS = {
  firstEntry: 'First competition entered',
  regionalCup: 'Regional Cup',
  nationalCup: 'National Cup',
  worldTier: 'World-tier access',
};

// Run flags an unlock can wait for (Campaign.flags).
export const FLAG_NAMES = {
  firstLaunch: 'First commercial launch',
  firstContractDone: 'First contract completed',
  firstRp: 'First Research Points earned',
};
