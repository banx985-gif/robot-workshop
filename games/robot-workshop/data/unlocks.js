// Words and allowed values for unlock rules (parts §11, purposes). Plain data.
// The rules only describe how things open; nothing opens them yet except 'start' (research: Milestone 9).

export const UNLOCK_TYPES = ['start', 'research', 'facility', 'rank', 'counter', 'competition', 'secret', 'all'];

export const RESEARCH_BRANCHES = {
  mechanical: 'Mechanical Research',
  mobility: 'Mobility Research',
  ai: 'AI Research',
  tool: 'Tool Research',
  power: 'Power Research',
  special: 'Special Research',
};
export const RESEARCH_MAX_LEVEL = 6;

// Facilities referenced by unlock rules (the facility catalogue itself arrives in Milestone 8).
export const FACILITY_NAMES = { F21: 'Materials Lab' };

export const COUNTERS = {
  researchPrototypes: '{n} Research Prototypes', // {n} = the rule's min
  distinctPurposesCompleted: '{n} different purposes completed',
};

export const COMPETITION_EVENTS = {
  regionalCup: 'Regional Cup',
  nationalCup: 'National Cup',
  worldTier: 'World-tier access',
};
