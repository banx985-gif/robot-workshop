// Secrets (bible §28, §29, §30.4a, §42.4) — plain data for core/SecretEngine.js.
// Milestone 16 builds the engine only: these are 3 TEST rules (not real secrets) that prove it works. The 34 real
// secrets of §29 arrive in Milestone 17 in this same shape.
//
// Condition words (facts, read by name from src/systems/secretFacts.js):
//   run.*      this run: run.year, run.rankIndex, run.projectsFinished, run.robots (list), run.competitions (list)…
//   account.*  every run on this device: account.staffEverHired, account.competitionWins, account.runs…
//   event.*    the trigger event's own details, e.g. event.record.result.innovation, event.result.place
// kind: 'count' (halved on a repeat, rounded up) · 'threshold' (15% easier, rounded down) · 'fixed' (default).
// category: the words clue stage 2 uses for a missing condition ("robots", "competitions", "people"…).

// §30.4a easing and the §29 legendary arrival windows (used from Milestone 17).
export const SECRET_RULES = {
  easing: { countFactor: 0.5, thresholdPct: 15 },
  arrivalDays: { first: 56, repeat: 84 },
  currencyTypes: ['currency'], // rewards paid only the first time per account
};

// Engine event names → the game's bus events (bible §28 "checks occur after", plus contracts and hires).
export const SECRET_TRIGGERS = {
  projectFinished: 'project:complete',
  monthRollover: 'clock:month',
  competitionFinished: 'competition:enter',
  researchDone: 'research:complete',
  rankUp: 'reputation:rankUp',
  staffLevelUp: 'staff:levelup',
  contractDone: 'contract:success',
  hire: 'staff:hired',
  runEnded: 'campaign:ending', // the Year 16 ending / NG+ transition (sent once the ending exists)
};

// Reward action words (run through the Milestone 9 unlock-action runner, so each fires once):
//   { type: 'currency', currency: 'techChips' | 'prestigeTokens' | 'rp', amount }   first time per account only
//   { type: 'event', id }        fire a stored event (e.g. EV20, the mysterious anonymous message)
//   { type: 'record', id }       a permanent line in Records (the Rumour Archive)
//   later (Milestone 17): part, facility, feature, competition, staffArrival (windowDays, repeat: { windowDays })
export const SECRET_REWARD_TYPES = ['currency', 'event', 'record', 'part', 'facility', 'feature', 'competition', 'staffArrival'];

export const SECRETS = [
  // 1. Simple: one count condition.
  {
    id: 'TEST-01',
    name: 'Test: Busy Bench',
    test: true,
    triggerEvents: ['projectFinished'],
    oncePerRun: true,
    requiresAll: [{ fact: 'run.projectsFinished', op: 'gte', value: 4, kind: 'count', category: 'robots', label: 'Finish robots' }],
    clueStages: [
      { text: 'Word is a busy bench gets noticed…', minMet: 0 },
      { text: 'Someone is counting how many robots you finish.', minMet: 'allButOne' },
    ],
    rewardActions: [{ type: 'currency', currency: 'rp', amount: 25, id: 'TEST-01:rp' }, { type: 'record', id: 'TEST-01' }],
  },
  // 2. Compound: all + any + forbid, a count-of over the robot list and an "all of these happened" group.
  {
    id: 'TEST-02',
    name: 'Test: Steady Hands',
    test: true,
    triggerEvents: ['projectFinished', 'competitionFinished', 'monthRollover'],
    oncePerRun: true,
    requiresAll: [
      { fact: 'run.rankIndex', op: 'gte', value: 1, category: 'reputation', label: 'Company Rank D or better' },
      { fact: 'run.robots', op: 'countOf', where: [{ field: 'faults', op: 'eq', value: 0 }], value: 2, kind: 'count', category: 'robots', label: 'Robots finished with zero faults' },
      { all: [{ fact: 'run.purposesBuilt', op: 'has', value: 'helper', category: 'robots', label: 'A Helper built' }, { fact: 'run.commercialLaunches', op: 'gte', value: 1, kind: 'count', category: 'sales', label: 'A product launched' }] },
    ],
    requiresAny: [
      { fact: 'run.bestQuality', op: 'gte', value: 60, kind: 'threshold', category: 'robots', label: 'A robot with Quality 60+' },
      { fact: 'run.competitionWins', op: 'gte', value: 1, kind: 'count', category: 'competitions', label: 'A competition win' },
    ],
    forbids: [{ fact: 'run.inDebt', op: 'eq', value: true, category: 'money', label: 'In debt' }],
    clueStages: [
      { text: 'A rumour: careful builders are being watched.', minMet: 1 },
      { text: 'Close now — something is still missing.', minMet: 'allButOne' },
    ],
    rewardActions: [{ type: 'currency', currency: 'techChips', amount: 1, id: 'TEST-02:techChips' }, { type: 'record', id: 'TEST-02' }],
  },
  // 3. NG+ gated: only from New Game+ 1; reads an account fact; its reward fires the stored mysterious message (EV20).
  {
    id: 'TEST-03',
    name: 'Test: Old Friends',
    test: true,
    ngPlusMin: 1,
    triggerEvents: ['monthRollover', 'hire'],
    oncePerRun: true,
    requiresAll: [
      { fact: 'run.year', op: 'gte', value: 2, category: 'time', label: 'Year 2 or later' },
      { fact: 'account.staffEverHired', op: 'has', value: 'DES01', category: 'people', label: 'Tessa Vale hired in any run' },
    ],
    clueStages: [
      { text: 'An old face from another run remembers you…', minMet: 1 },
      { text: 'It is about time — wait a little longer.', minMet: 'allButOne' },
    ],
    rewardActions: [{ type: 'event', id: 'EV20' }, { type: 'currency', currency: 'prestigeTokens', amount: 1, id: 'TEST-03:prestigeTokens' }],
  },
];
export const SECRETS_BY_ID = Object.fromEntries(SECRETS.map((s) => [s.id, s]));

// Rumour Archive art (already in the folder).
export const SECRET_ART = { marker: 'ui_icon_10_secret', discover: 'vfx_14', records: 'ui_icon_09_records' };
