// Training (bible §17, §39.2). Plain data for core/TrainingSystem.js.
// effect.kind: 'stat' (one stat), 'primary' (the role's main stat), 'lowest' (the `count` lowest), 'all'.
// Gains are always clamped to the worker's tier cap (§9.4); facilities may shorten courses, never raise caps.

export const COURSES = [
  { id: 'engWorkshop', name: 'Engineering Workshop', cost: 900, currency: 'credits', days: 14, effect: { kind: 'stat', stat: 'eng', min: 6, max: 10 } },
  { id: 'designSprint', name: 'Design Sprint', cost: 900, currency: 'credits', days: 14, effect: { kind: 'stat', stat: 'des', min: 6, max: 10 } },
  { id: 'codeCamp', name: 'Code Camp', cost: 900, currency: 'credits', days: 14, effect: { kind: 'stat', stat: 'prg', min: 6, max: 10 } },
  { id: 'fabDrill', name: 'Fabrication Drill', cost: 900, currency: 'credits', days: 14, effect: { kind: 'stat', stat: 'fab', min: 6, max: 10 } },
  { id: 'simSession', name: 'Simulator Session', cost: 900, currency: 'credits', days: 14, effect: { kind: 'stat', stat: 'tst', min: 6, max: 10 } },
  { id: 'crossTraining', name: 'Cross-Training', cost: 1400, currency: 'credits', days: 21, effect: { kind: 'lowest', count: 3, min: 3, max: 6 } },
  { id: 'conference', name: 'Industry Conference', cost: 2200, currency: 'credits', days: 14, effect: { kind: 'all', min: 2, max: 5, morale: 8 }, limit: { perWorkerPerYear: 1 } },
  { id: 'certification', name: 'Advanced Certification', cost: 4000, currency: 'credits', days: 28, effect: { kind: 'primary', min: 12, max: 18 }, requires: { type: 'rank', rank: 'B' } },
  // Stored for later: needs New Game+ and Rank S, paid in Prestige Tokens (not in the game yet).
  {
    id: 'prestigeSeminar',
    name: 'Prestige Seminar',
    cost: 1,
    currency: 'prestigeTokens',
    days: 28,
    effect: { kind: 'all', min: 8, max: 15 },
    requires: { type: 'all', of: [{ type: 'flag', flag: 'ngPlus' }, { type: 'rank', rank: 'S' }] },
    limit: { perWorkerPerRun: 1 },
  },
];

// §39.2 slots: 1 general to start; F28 Training Station +1 general (max 2); F27 Pilot Simulator +1 pilot-only (max 1).
// F27/F28 arrive with the later facilities; their effect keys are read already.
export const TRAINING_SLOTS = [
  { id: 'general', name: 'Training slot', roles: null, base: 1, effect: 'trainingSlots', max: 2 },
  { id: 'pilot', name: 'Pilot slot', roles: ['pilot'], base: 0, effect: 'pilotTrainingSlots', max: 1 },
];

// §18.2 F27 −25% pilot training days, F28 −20% non-pilot training days (effect keys, summed from facilities).
export const TRAINING_DURATION_EFFECTS = { pilot: 'pilotTrainingDaysPct', other: 'trainingDaysPct' };

export const TRAINING_RULES = {
  successMorale: 2, // §9.5 training success +2 Morale
  xpPerDay: 2, // M10 choice: §9.3 lists training as an XP source; 2 XP per training day
};

export const TRAINING_ART = { icon: 'ui_icon_15', manual: 'reward_06', levelUp: 'vfx_08' };
