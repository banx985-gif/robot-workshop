// Secrets (bible §28, §29, §30.4a, §42.4) — all 34, plain data for core/SecretEngine.js (Milestone 17).
//
// Condition words (facts, read by name from src/systems/secretFacts.js):
//   run.*      this run: run.rankIndex, run.projectsFinished, run.robots (list), run.competitions (list)…
//   account.*  every run on this device: account.staffEverHired, account.competitionWins…
// kind (§30.4a repeat easing): 'count' halved (rounded up) · 'threshold' 15% easier (rounded down) · 'fixed' (the
// default: yes/no, named events, facilities, parts, NG+ level, "hired before", Company Rank, dates, payments, and
// variety — "across N purposes" stays N, or halving would make it meaningless).
// A count-of `where` test carries its own kind (e.g. "250 units" in "a Value robot that sold 250 units").
// category: the words clue stage 2 uses for a missing condition.
// Rank index: E 0 · D 1 · C 2 · B 3 · A 4 · S 5 · S+ 6.
//
// M17 interpretations (the bible names these but the game has no separate thing for them yet):
//   "Research Prototype"   = a finished robot of the Experimental purpose (its short name is Prototype; §10.1)
//   "discover" a part      = the part is open in this run (researched / unlocked), whether used or not
//   "12% below target"     = the robot's weighted event score is at least 12% under the event's rival target
//   "zero software faults" = no fault found in the Software phase
//   "Innovation 110+ before final phase" (SEC-ROBOT-03) = the finished robot's Innovation (faults can't add any)
//   "Lunar-eligible robot" (SEC-COMP-04) = the robot with PO07 is the same one with END 500+
//   "Year 16 ending"       = the ending flag (Milestone 19; debug "ending reached" until then) or an earlier run's
//   "Research Master"      = all 36 visible research topics done (the Research Mastery feature; achievements M18)
//   SEC-COMP-03's "trigger the Mysterious Anonymous Message after Year 13 or NG+": the message is part of its
//     reward — the rule fires EV20 as it opens AI08 research (the M16 hook)
//   SEC-COMPETITION-03's "pay 3 Prestige Tokens": the rule makes the invitation; paying the stake (on the Black
//     Circuit card) is the player's choice and opens C12 for good once Rank A is reached
//   SEC-FAC-01's "then pay 25,000 credits": the rule opens the basement for 25,000 (the Secret Lab comes with it)

// §30.4a easing, §29 arrival windows, §16.3 declined legendaries.
export const SECRET_RULES = {
  easing: { countFactor: 0.5, thresholdPct: 15 },
  arrivalDays: { first: 56, repeat: 84 },
  declinedPoolChance: 0.04, // per Global Search card, until hired
  blackCircuitStake: 3, // Prestige Tokens
  currencyTypes: ['currency'], // rewards paid only the first time per account
};

// Engine event names → the game's bus event(s) (bible §28 "checks occur after", plus contracts and hires).
export const SECRET_TRIGGERS = {
  projectFinished: 'project:complete',
  monthRollover: 'clock:month',
  competitionFinished: 'competition:enter',
  researchDone: 'research:complete',
  rankUp: 'reputation:rankUp',
  staffLevelUp: 'staff:levelup',
  contractDone: 'contract:success',
  hire: 'staff:hired',
  runEnded: ['campaign:ending', 'campaign:transition'], // the Year 16 ending, and the NG+ transition (Milestone 20) just before the old run closes
};

// Reward action words (run through the unlock-action runner, so each fires once a run):
//   { type: 'currency', currency: 'techChips' | 'prestigeTokens' | 'rp' | 'rep', amount, id }  first time per account only
//   { type: 'staffArrival', id, windowDays, repeat: { windowDays } }   Legendary Arrival event + special card
//   { type: 'secretResearch', id }   a Secret Lab research topic appears (data/research.js SECRET_RESEARCH)
//   { type: 'part', id }             a part opens (TO08)
//   { type: 'facility', id }         a facility can be built (F35)
//   { type: 'zone', id }             a workshop zone can be opened (the basement, XB)
//   { type: 'flag', id, value }      a run flag (Nocturne revealed, the hidden ending variant…)
//   { type: 'accountFlag', id }      an account flag (Black Circuit invitation…)
//   { type: 'competition', id }      an event invites the company (C11)
//   { type: 'combo', id }            a combo's exact recipe becomes known (SYN18 / SYN19 / SYN20)
//   { type: 'family', id }           a robot look is archived for good (V18 / V19 / V20)
//   { type: 'trait', staff, trait }  a worker gains a trait (Loyal, Homegrown Ace)
//   { type: 'event', id }            a stored event fires (EV20 the anonymous message, EV_M08 the endgame picture)
//   { type: 'clue', id, stage }      raise another secret's clue stage (a hint towards it)
//   { type: 'record', id }           a permanent line in Records (the Rumour Archive)
export const SECRET_REWARD_TYPES = ['currency', 'staffArrival', 'secretResearch', 'part', 'facility', 'zone', 'flag', 'accountFlag', 'competition', 'combo', 'family', 'trait', 'event', 'clue', 'record'];

// --- shorthands (they only build plain objects) ---
const is = (fact, op, value, label, category, kind) => ({ fact, op, value, label, category, ...(kind ? { kind } : {}) });
const countOf = (fact, where, value, label, category, kind, extra = {}) => ({ fact, op: 'countOf', where, value, label, category, ...(kind ? { kind } : {}), ...extra });
const w = (field, op, value, kind) => ({ field, op, value, ...(kind ? { kind } : {}) });
const pay = (currency, amount, id) => ({ type: 'currency', currency, amount, id: `${id}:${currency}` });
const arrival = (staff) => ({ type: 'staffArrival', id: staff, windowDays: SECRET_RULES.arrivalDays.first, repeat: { windowDays: SECRET_RULES.arrivalDays.repeat } });
const won = w('won', 'eq', true);
const ENDING = { any: [is('run.flag.endingReached', 'eq', true, 'Reach the Year 16 ending', 'time'), is('account.endings', 'gte', 1, 'An earlier run reached the ending', 'time')] };
const ALL_TRIGGERS = ['projectFinished', 'monthRollover', 'competitionFinished', 'researchDone', 'rankUp', 'hire', 'contractDone'];
const clue = (rumour, close) => [
  { text: rumour, minMet: 1 },
  { text: close, minMet: 'allButOne' },
];

export const SECRETS = [
  // ---------------------------------------------------------------- §29.1 Legendary staff — 5
  {
    id: 'SEC-STAFF-L1',
    name: 'Dr. Mira Volta, Legendary Engineer',
    group: 'legendary',
    triggerEvents: ['projectFinished', 'competitionFinished', 'rankUp', 'monthRollover'],
    oncePerRun: true,
    requiresAll: [
      is('run.rankIndex', 'gte', 4, 'Company Rank A', 'reputation'),
      is('run.projectsFinished', 'gte', 18, 'Finish 18 robot projects', 'robots', 'count'),
      countOf('run.staff', [w('role', 'eq', 'engineer'), w('robots', 'gte', 12, 'count')], 1, 'An Engineer who worked on 12 finished projects', 'people'),
      countOf('run.competitions', [won, w('underTargetPct', 'gte', 12, 'threshold')], 1, 'Win an event with a robot 12% under the target score', 'competitions'),
      is('run.partsDiscovered', 'has', 'AI06', 'Discover the Learning AI (AI06)', 'parts'),
      countOf('run.robots', [w('innovation', 'gte', 55, 'threshold')], 1, 'A project with Innovation 55+', 'robots'),
    ],
    clueStages: clue('A brilliant engineer is said to visit workshops that build a lot — and win against the odds.', "Dr. Volta's letter is written. One thing is still missing."),
    rewardActions: [arrival('ENG09')],
  },
  {
    id: 'SEC-STAFF-L2',
    name: 'Solenne Arc, Legendary Designer',
    group: 'legendary',
    triggerEvents: ['projectFinished', 'monthRollover', 'rankUp'],
    oncePerRun: true,
    requiresAll: [
      is('run.commercialLaunches', 'gte', 12, 'Launch 12 commercial models', 'sales', 'count'),
      countOf('run.robots', [w('review', 'gte', 9.0, 'threshold')], 3, 'Three reviews of 9.0+', 'sales', 'count'),
      countOf('run.robots', [w('review', 'gte', 9.0, 'threshold')], 2, '… across at least 2 purposes', 'sales', null, { by: 'purpose' }), // variety: fixed
      countOf('run.products', [w('position', 'eq', 'premium'), w('quality', 'gte', 85, 'threshold'), w('units', 'gte', 1)], 1, 'Sell a Premium model with Quality 85+', 'sales'),
      is('run.facilities', 'has', 'F31', 'Own a Showroom', 'workshop'),
      is('run.reputation', 'gte', 4000, 'Reach 4,000 reputation', 'reputation', 'threshold'),
    ],
    clueStages: clue('A famous designer only notices robots people love — beautiful, well-reviewed, on show.', 'Solenne Arc is nearly convinced.'),
    rewardActions: [arrival('DES09')],
  },
  {
    id: 'SEC-STAFF-L3',
    name: 'Dr. Nyla Vector, Legendary Programmer',
    group: 'legendary',
    triggerEvents: ['projectFinished', 'researchDone', 'monthRollover'],
    oncePerRun: true,
    requiresAll: [
      is('run.researchDone', 'has', 'AI-R6', 'Complete AI Research 6', 'research'),
      countOf('run.robots', [w('softwareFaults', 'eq', 0)], 5, 'Finish 5 projects with zero software faults', 'robots', 'count'),
      countOf('run.robots', [w('stats.INT', 'gte', 300, 'threshold')], 1, 'One robot with INT 300+', 'robots'),
      countOf('run.robots', [w('prototype', 'eq', true), w('innovation', 'gte', 65, 'threshold')], 1, 'A Research Prototype with Innovation 65+', 'robots'),
      is('run.combosDiscovered', 'has', 'SYN10', 'Discover the Wild Prototype combo (SYN10)', 'combos'),
    ],
    clueStages: clue('Somewhere, a programmer is waiting for clean code and clever machines.', "Dr. Vector's inbox has your name on it. Almost."),
    rewardActions: [arrival('PRG09')],
  },
  {
    id: 'SEC-STAFF-L4',
    name: 'Bruno Atlas, Legendary Mechanic',
    group: 'legendary',
    triggerEvents: ['projectFinished', 'monthRollover'],
    oncePerRun: true,
    requiresAll: [
      is('run.zeroFaultProjects', 'gte', 12, '12 zero-fault project completions', 'robots', 'count'),
      countOf('run.robots', [w('parts', 'has', 'CH08')], 1, 'Build with the Titanium Chassis (CH08)', 'parts'),
      countOf('run.robots', [w('faultsFound', 'gte', 3), w('quality', 'gte', 80, 'threshold')], 1, 'Repair a project that reached 3+ faults and still finish Quality 80+', 'robots'),
      countOf('run.staff', [w('role', 'eq', 'mechanic'), w('stats.fab', 'gte', 150, 'threshold')], 1, 'A Mechanic with 150+ FAB', 'people'),
      { all: [is('run.facilities', 'has', 'F19', 'Own Precision Assembly', 'workshop'), is('run.facilities', 'has', 'F20', 'Own a Heavy Assembly Bay', 'workshop')] },
    ],
    clueStages: clue('An old mechanic respects workshops that fix what breaks — and build heavy.', 'Bruno Atlas has heard of you. Nearly.'),
    rewardActions: [arrival('MEC09')],
  },
  {
    id: 'SEC-STAFF-L5',
    name: 'Rex Vantage, Legendary Pilot',
    group: 'legendary',
    triggerEvents: ['competitionFinished', 'monthRollover'],
    oncePerRun: true,
    requiresAll: [
      is('run.eventsWon', 'has', 'C07', 'Win the Regional Racing Circuit (C07)', 'competitions'),
      is('run.eventsWon', 'has', 'C08', 'Win the National Arena (C08)', 'competitions'),
      is('run.maxWinsOnePilot', 'gte', 3, 'Win any 3 events with the same pilot', 'competitions', 'count'),
      countOf('run.competitions', [won, w('strategy', 'eq', 'aggressive'), w('breakdowns', 'eq', 0)], 1, 'Win on Aggressive without a breakdown', 'competitions'),
      countOf('run.competitions', [w('pilot', 'in', ['PIL01', 'PIL02', 'PIL03', 'PIL04'])], 8, 'Pilots 01–04 in 8 event entries', 'people', 'count'),
    ],
    clueStages: clue('A racing legend watches home-grown pilots who win with nerve.', 'Rex Vantage is watching your next race.'),
    rewardActions: [arrival('PIL09')],
  },

  // ---------------------------------------------------------------- §29.2 Secret / prestige staff — 5
  {
    id: 'SEC-STAFF-S1',
    name: 'Orin Zero',
    group: 'secretStaff',
    ngPlusMin: 1,
    triggerEvents: ['projectFinished', 'researchDone', 'monthRollover'],
    oncePerRun: true,
    requiresAll: [
      is('account.staffEverHired', 'has', 'ENG09', 'Hired Dr. Mira Volta in any run', 'people'),
      is('run.branchComplete.mechanical', 'eq', true, 'All visible Mechanical research', 'research'),
      countOf('run.robots', [w('parts', 'has', 'CH09')], 3, 'CH09 used in 3 projects', 'parts', 'count'),
      countOf('run.robots', [w('tier', 'eq', 'prestige'), w('faults', 'eq', 0)], 1, 'A Prestige-tier project with zero faults', 'robots'),
      is('run.facilities', 'has', 'F34', 'Own the Secret Lab', 'workshop'),
    ],
    clueStages: clue('Someone who has seen every chassis there is wants to meet a true engineering house.', 'Orin Zero is one step away.'),
    rewardActions: [arrival('ENG10')],
  },
  {
    id: 'SEC-STAFF-S2',
    name: 'Pixel Eve',
    group: 'secretStaff',
    ngPlusMin: 1,
    triggerEvents: ['projectFinished', 'competitionFinished', 'monthRollover'],
    oncePerRun: true,
    requiresAll: [
      is('account.staffEverHired', 'has', 'DES09', 'Hired Solenne Arc in any run', 'people'),
      countOf('run.products', [w('position', 'eq', 'premium'), w('quality', 'gte', 90, 'threshold')], 5, '5 Premium models with Quality 90+', 'sales', 'count'),
      countOf('run.products', [w('position', 'eq', 'premium'), w('quality', 'gte', 90, 'threshold')], 4, '… across 4 purposes', 'sales', null, { by: 'purpose' }), // variety: fixed
      is('run.unitsSold', 'gte', 1000, '1,000+ units sold this run', 'sales', 'count'),
      countOf('run.robots', ['SPD', 'PWR', 'CTL', 'INT', 'END', 'REL', 'APL'].map((k) => w(`stats.${k}`, 'gt', 300, 'threshold')).concat([w('launched', 'eq', true)]), 1, 'One commercial robot with all 7 stats over 300', 'robots'),
      is('run.eventsWon', 'has', 'C10', 'Win the Elite Technology Expo (C10)', 'competitions'),
    ],
    clueStages: clue('A designer from nowhere collects only perfect, premium things.', 'Pixel Eve is almost impressed.'),
    rewardActions: [arrival('DES10')],
  },
  {
    id: 'SEC-STAFF-S3',
    name: 'Null Mercer',
    group: 'secretStaff',
    ngPlusMin: 2,
    triggerEvents: ['projectFinished', 'researchDone', 'monthRollover'],
    oncePerRun: true,
    requiresAll: [
      is('account.staffEverHired', 'has', 'PRG09', 'Hired Dr. Nyla Vector in any run', 'people'),
      is('run.partsDiscovered', 'has', 'AI08', 'Unlock the Neural Core (AI08)', 'parts'),
      countOf('run.robots', [w('family', 'eq', 'V18'), w('innovation', 'gte', 90, 'threshold')], 1, 'A Neural-look robot with Innovation 90+', 'robots'),
      is('run.researchByYear3', 'gte', 10, '10 research topics before the end of Year 3', 'research', 'count'),
      is('run.flag.techChipResearch', 'neq', true, 'No Tech Chips used to finish research this run', 'research'),
    ],
    clueStages: clue('A ghost in the machine is said to love fast research and a mind of pure logic.', 'Null Mercer is listening.'),
    rewardActions: [arrival('PRG10')],
  },
  {
    id: 'SEC-STAFF-S4',
    name: 'Kestrel Nine',
    group: 'secretStaff',
    ngPlusMin: 1,
    triggerEvents: ['projectFinished', 'competitionFinished', 'monthRollover'],
    oncePerRun: true,
    requiresAll: [
      is('account.staffEverHired', 'has', 'MEC09', 'Hired Bruno Atlas in any run', 'people'),
      is('account.zeroFaultProjects', 'gte', 20, '20 zero-fault completions across all runs', 'robots', 'count'),
      countOf('run.robots', [w('parts', 'has', 'CH08'), w('parts', 'has', 'PO07'), w('stats.REL', 'gte', 450, 'threshold')], 1, 'A CH08 + PO07 robot with REL 450+ this run', 'robots'),
      countOf('run.competitions', [w('eventId', 'eq', 'C11'), won, w('breakdowns', 'eq', 0)], 1, 'Win the Lunar League (C11) without a breakdown', 'competitions'),
      is('run.facilities', 'has', 'F34', 'Own the Secret Lab', 'workshop'),
    ],
    clueStages: clue('A mechanic who builds things that never break is looking for equals.', 'Kestrel Nine is nearly here.'),
    rewardActions: [arrival('MEC10')],
  },
  {
    id: 'SEC-STAFF-S5',
    name: 'Nova Black',
    group: 'secretStaff',
    ngPlusMin: 2,
    triggerEvents: ['competitionFinished', 'monthRollover'],
    oncePerRun: true,
    requiresAll: [
      is('account.staffEverHired', 'has', 'PIL09', 'Hired Rex Vantage in any run', 'people'),
      is('account.competitionWins', 'gte', 20, '20 competition wins across all runs', 'competitions', 'count'),
      countOf('run.competitions', [w('eventId', 'eq', 'C09'), won, w('strategy', 'eq', 'aggressive')], 1, 'Win the World Championship on Aggressive', 'competitions'),
      countOf('run.competitions', [w('eventId', 'eq', 'C11'), won, w('strategy', 'eq', 'aggressive')], 1, 'Win the Lunar League on Aggressive', 'competitions'),
      is('run.c12BeatenByLegend', 'eq', true, 'Enter the Black Circuit, then beat your own score there with Rex Vantage or Nova Black', 'competitions'),
    ],
    clueStages: clue('The fastest pilot nobody has seen races only against the very best.', 'Nova Black is waiting at the line.'),
    rewardActions: [arrival('PIL10')],
  },

  // ---------------------------------------------------------------- §29.3 Prestige components — 5
  {
    id: 'SEC-COMP-01',
    name: 'CH10 Prestige Chassis',
    group: 'parts',
    ngPlusMin: 1,
    triggerEvents: ['projectFinished', 'competitionFinished', 'hire', 'monthRollover'],
    oncePerRun: true,
    requiresAll: [
      countOf('run.partsDiscovered', [w('', 'in', ['CH01', 'CH02', 'CH03', 'CH04', 'CH05', 'CH06', 'CH07', 'CH08', 'CH09'])], 9, 'All 9 other chassis discovered', 'parts'),
      countOf('run.robots', [w('parts', 'has', 'CH08')], 5, 'CH08 used in 5 finished projects', 'parts', 'count'),
      countOf('run.robots', [w('parts', 'has', 'CH09'), w('quality', 'gte', 90, 'threshold')], 1, 'A CH09 project with Quality 90+', 'robots'),
      is('run.eventsWon', 'has', 'C10', 'Win the Elite Expo (C10)', 'competitions'),
      { any: [is('run.staffHired', 'has', 'ENG09', 'Dr. Mira Volta hired this run', 'people'), is('run.staffHired', 'has', 'ENG10', 'Orin Zero hired this run', 'people')] },
    ],
    clueStages: clue('An impossible frame is rumoured to exist, for a workshop that has built them all.', 'The prestige chassis blueprint is almost yours.'),
    rewardActions: [{ type: 'secretResearch', id: 'SL-CH10' }],
  },
  {
    id: 'SEC-COMP-02',
    name: 'MO08 Rocket/Skate Drive',
    group: 'parts',
    triggerEvents: ['competitionFinished', 'projectFinished', 'monthRollover'],
    oncePerRun: true,
    requiresAll: [
      countOf('run.competitions', [w('eventId', 'eq', 'C07'), won, w('robotParts', 'has', 'MO02')], 1, 'Win C07 with Performance Wheels (MO02)', 'competitions'),
      countOf('run.competitions', [w('eventId', 'eq', 'C09'), won, w('robotParts', 'has', 'MO07')], 1, 'Win C09 with the Hover Drive (MO07)', 'competitions'),
      countOf('run.robots', [w('purpose', 'eq', 'racing'), w('stats.SPD', 'gte', 450, 'threshold')], 1, 'A Racing robot with SPD 450+', 'robots'),
      is('run.maxCleanStreak', 'gte', 5, 'No breakdown in 5 competition entries in a row', 'competitions', 'count'),
    ],
    clueStages: clue('Speed freaks whisper of a drive that is half rocket, half skate.', 'The Rocket/Skate Drive is one step away.'),
    rewardActions: [{ type: 'secretResearch', id: 'SL-MO08' }],
  },
  {
    id: 'SEC-COMP-03',
    name: 'AI08 Experimental Neural Core',
    group: 'parts',
    triggerEvents: ['projectFinished', 'researchDone', 'monthRollover'],
    oncePerRun: true,
    requiresAll: [
      is('run.branchComplete.ai', 'eq', true, 'All visible AI research', 'research'),
      countOf('run.robots', [w('prototype', 'eq', true)], 5, '5 Research Prototypes', 'robots', 'count'),
      countOf('run.staff', [w('role', 'eq', 'programmer'), w('stats.prg', 'gte', 220, 'threshold')], 1, 'A Programmer with 220+ PRG', 'people'),
      countOf('run.robots', [w('innovation', 'gte', 80, 'threshold')], 2, 'Innovation 80+ twice', 'robots', 'count'),
      { any: [is('run.year', 'gt', 13, 'After Year 13', 'time'), is('run.ngPlus', 'gte', 1, 'or New Game+', 'time')] },
    ],
    clueStages: clue('An anonymous sender keeps asking about minds made of light.', 'The anonymous sender is almost ready to write.'),
    rewardActions: [{ type: 'event', id: 'EV20' }, { type: 'secretResearch', id: 'SL-AI08' }],
  },
  {
    id: 'SEC-COMP-04',
    name: 'PO08 Prestige Quantum Core',
    group: 'parts',
    triggerEvents: ['projectFinished', 'competitionFinished', 'monthRollover'],
    oncePerRun: true,
    requiresAll: [
      is('run.competitionsOpen', 'has', 'C11', 'The Lunar invite is active (C11 open)', 'competitions'),
      countOf('run.robots', [w('parts', 'has', 'PO07'), w('stats.END', 'gte', 500, 'threshold')], 1, 'A Lunar-ready PO07 robot with END 500+', 'robots'),
      { all: [is('run.facilities', 'has', 'F22', 'Own a Power Lab', 'workshop'), is('run.facilities', 'has', 'F34', 'Own the Secret Lab', 'workshop')] },
      is('run.prestigeTokens', 'gte', 3, 'Hold 3 Prestige Tokens', 'prestige'),
    ],
    clueStages: clue('A power core from the edge of physics needs a workshop that has been to the Moon.', 'The Quantum Core is nearly within reach.'),
    rewardActions: [{ type: 'secretResearch', id: 'SL-PO08' }],
  },
  {
    id: 'SEC-COMP-05',
    name: 'SP08 Secret Prestige Module',
    group: 'parts',
    triggerEvents: ['projectFinished', 'competitionFinished', 'researchDone', 'monthRollover'],
    oncePerRun: true,
    requiresAll: [
      is('run.combosDiscoveredCount', 'gte', 18, 'Discover 18 combos', 'combos', 'count'),
      is('run.branchComplete.special', 'eq', true, 'All visible Special research', 'research'),
      is('run.facilities', 'has', 'F35', 'Own the Prestige Trophy Display', 'workshop'),
      { all: [is('run.eventsWon', 'has', 'C10', 'Win C10', 'competitions'), is('run.eventsWon', 'has', 'C11', 'Win C11', 'competitions')] },
      countOf('run.robots', [w('minCx', 'gte', 7)], 1, 'A project whose six parts are all Cx 7+', 'robots'),
    ],
    clueStages: clue('Collectors speak of a module that only a master of combos could fit.', 'The Prestige Module is one step away.'),
    rewardActions: [{ type: 'secretResearch', id: 'SL-SP08' }],
  },

  // ---------------------------------------------------------------- §29.4 Facilities — 2
  {
    id: 'SEC-FAC-01',
    name: 'Secret Lab',
    group: 'facilities',
    triggerEvents: ['monthRollover', 'researchDone', 'projectFinished', 'hire', 'rankUp', 'runEnded'],
    oncePerRun: true,
    requiresAll: [ENDING],
    requiresAny: [
      { all: [is('run.researchMastery', 'eq', true, 'Research Master (all 36 visible topics)', 'research'), is('run.legendaryHired', 'gte', 1, 'and a legendary worker hired', 'people')] },
      countOf('run.robots', [w('prototype', 'eq', true), w('innovation', 'gte', 70, 'threshold')], 5, '5 Research Prototypes with Innovation 70+', 'robots', 'count'),
      { all: [is('run.ngPlus', 'gte', 1, 'In New Game+', 'time'), is('run.rankIndex', 'gte', 3, 'reach Rank B', 'reputation')] },
    ],
    clueStages: clue('Under the workshop floor, something hums. Only a finished story will open it.', 'The basement door is nearly open.'),
    rewardActions: [{ type: 'zone', id: 'XB' }],
  },
  {
    id: 'SEC-FAC-02',
    name: 'Prestige Trophy Display',
    group: 'facilities',
    triggerEvents: ['competitionFinished', 'hire', 'monthRollover'],
    oncePerRun: true,
    requiresAll: [
      is('run.trophies', 'has', 'worldCup', 'Own the World Cup', 'competitions'),
      is('run.eventsWonCount', 'gte', 4, 'Win at least 4 different events', 'competitions', 'count'),
      is('run.legendaryHired', 'gte', 1, 'A legendary worker hired', 'people'),
    ],
    clueStages: clue('A champion deserves a proper place to shine.', 'The trophy display is almost ready.'),
    rewardActions: [{ type: 'facility', id: 'F35' }],
  },

  // ---------------------------------------------------------------- §29.5 Competitions — 3
  {
    id: 'SEC-COMPETITION-01',
    name: 'Lunar Invitation',
    group: 'competitions',
    triggerEvents: ['competitionFinished', 'contractDone', 'projectFinished', 'rankUp', 'monthRollover', 'runEnded'],
    oncePerRun: true,
    requiresAll: [
      ENDING,
      is('run.eventsWon', 'has', 'C10', 'Win the Elite Expo (C10)', 'competitions'),
      is('run.flag.lunarInvite', 'eq', true, 'Complete the Orbital Research Prototype contract', 'contracts'),
      countOf('run.robots', [w('stats.END', 'gte', 420, 'threshold'), w('stats.INT', 'gte', 350, 'threshold'), w('stats.REL', 'gte', 350, 'threshold')], 1, 'One robot with END 420+, INT 350+, REL 350+', 'robots'),
      is('run.rankIndex', 'gte', 5, 'Company Rank S', 'reputation'),
    ],
    clueStages: clue('An invitation with a strange postmark: "Some races are not on Earth."', 'The Lunar League is nearly ready to call.'),
    rewardActions: [{ type: 'competition', id: 'C11' }, { type: 'record', id: 'lunarSpec' }],
  },
  {
    id: 'SEC-COMPETITION-02',
    name: 'Nocturne Contact',
    group: 'competitions',
    triggerEvents: ['competitionFinished', 'hire', 'monthRollover'],
    oncePerRun: true,
    requiresAll: [
      is('run.eventsWon', 'has', 'C11', 'Win the Lunar League (C11)', 'competitions'),
      is('run.competitionWins', 'gte', 12, '12 competition wins', 'competitions', 'count'),
      { all: ['conservative', 'balanced', 'aggressive'].map((s) => countOf('run.competitions', [won, w('strategy', 'eq', s)], 1, `A win on ${s[0].toUpperCase() + s.slice(1)}`, 'competitions')) },
      { any: [is('run.staffIds', 'has', 'PIL09', 'Rex Vantage on the team', 'people'), is('run.staffIds', 'has', 'PIL10', 'or Nova Black', 'people'), countOf('run.staff', [w('role', 'eq', 'pilot'), w('stats.tst', 'gte', 220, 'threshold')], 1, 'or a pilot with 220+ TST', 'people')] },
    ],
    clueStages: clue('A black car was seen at your last race. Nobody knows who sent it.', 'Nocturne Systems is about to make contact.'),
    rewardActions: [{ type: 'flag', id: 'rivalRevealed_R08', value: true }, { type: 'record', id: 'nocturne' }],
  },
  {
    id: 'SEC-COMPETITION-03',
    name: 'Black Circuit',
    group: 'competitions',
    ngPlusMin: 1,
    triggerEvents: ['competitionFinished', 'rankUp', 'monthRollover', 'researchDone'],
    oncePerRun: true,
    requiresAll: [
      is('account.secrets', 'has', 'SEC-COMPETITION-02', 'Nocturne Contact', 'competitions'),
      countOf('account.c09WinPurposes', [], 3, 'Win the World Championship with 3 different purposes (any runs)', 'competitions'),
      countOf('account.partsDiscovered', [w('', 'in', ['CH10', 'MO08', 'AI08', 'PO08', 'SP08', 'TO08'])], 2, 'Discover 2 prestige components', 'parts', 'count'),
      is('run.rankIndex', 'gte', 6, 'Company Rank S+', 'reputation'),
    ],
    clueStages: clue('Nocturne leaves a card: "The Black Circuit does not race for money."', 'The Black Circuit invitation is nearly written.'),
    rewardActions: [{ type: 'accountFlag', id: 'blackCircuitInvite' }],
  },

  // ---------------------------------------------------------------- §29.6 Robot paths — 3
  {
    id: 'SEC-ROBOT-01',
    name: 'Neural Machine Path',
    group: 'robots',
    triggerEvents: ['projectFinished'],
    oncePerRun: true,
    requiresAll: [countOf('run.robots', [w('parts', 'has', 'AI08'), w('purpose', 'eq', 'experimental'), w('innovation', 'gte', 85, 'threshold')], 1, 'An Experimental robot with the Neural Core (AI08) and Innovation 85+', 'robots')],
    clueStages: clue('A robot that dreams? Only with the right mind inside.', 'The Neural path is one step away.'),
    rewardActions: [{ type: 'combo', id: 'SYN18' }, { type: 'family', id: 'V18' }],
  },
  {
    id: 'SEC-ROBOT-02',
    name: 'Lunar Robot Path',
    group: 'robots',
    triggerEvents: ['projectFinished', 'monthRollover'],
    oncePerRun: true,
    requiresAll: [
      is('run.competitionsOpen', 'has', 'C11', 'The Lunar League unlocked', 'competitions'),
      countOf('run.robots', [w('purpose', 'in', ['scout', 'experimental']), w('slotNo.mobility', 'gte', 7), w('slotNo.power', 'gte', 7), w('stats.END', 'gte', 450, 'threshold')], 1, 'A Scout or Experimental robot with MO07+, PO07+ and END 450', 'robots'),
    ],
    clueStages: clue('Moon dust clings to the bravest scouts.', 'The Lunar path is one step away.'),
    rewardActions: [{ type: 'combo', id: 'SYN19' }, { type: 'family', id: 'V19' }],
  },
  {
    id: 'SEC-ROBOT-03',
    name: 'Unknown Robot — Singularity Workshop',
    group: 'robots',
    ngPlusMin: 3,
    triggerEvents: ['projectFinished'],
    oncePerRun: true,
    requiresAll: [
      countOf(
        'run.robots',
        [
          ...['CH10', 'MO08', 'AI08', 'PO08', 'SP08', 'TO08'].map((p) => w('parts', 'has', p)),
          w('secretStaff', 'gte', 1),
          w('prototype', 'eq', true),
          w('innovation', 'gte', 110, 'threshold'),
          w('faults', 'eq', 0),
        ],
        1,
        'A zero-fault Experimental Research Prototype with CH10, MO08, AI08, PO08, SP08 and TO08, a secret worker on the team and Innovation 110+',
        'robots',
      ),
      countOf('account.staffEverHired', [w('', 'in', ['ENG09', 'DES09', 'PRG09', 'MEC09', 'PIL09'])], 5, 'All five legendary staff hired (any runs)', 'people'),
      is('account.eventsWon', 'has', 'C12', 'Win the Black Circuit once (any run)', 'competitions'),
    ],
    clueStages: clue('Every prestige part, every legend, one machine. Nobody has ever seen it.', 'The Singularity is one step away.'),
    // §30.7 NG+2: an extra Rumour Archive clue stage before the rule itself opens at NG+3.
    earlyClue: { ngPlus: 2, text: 'A whisper from the Secret Lab: "Bring every prestige part and a secret mind together — one more New Game+ and it can be built."' },
    rewardActions: [
      { type: 'combo', id: 'SYN20' },
      { type: 'family', id: 'V20' },
      pay('rep', 500, 'SEC-ROBOT-03'),
      pay('prestigeTokens', 5, 'SEC-ROBOT-03'),
      { type: 'event', id: 'EV_M08' },
      { type: 'flag', id: 'hiddenEndingVariant', value: true },
      { type: 'accountFlag', id: 'finalSecretBadge' }, // §30.7 NG+3 final secret completion badge
    ],
  },

  // ---------------------------------------------------------------- §29.7 Play-style / collection — 11
  {
    id: 'SEC-BEH-01',
    name: 'Starter Loyalty',
    group: 'behaviour',
    triggerEvents: ['monthRollover'],
    oncePerRun: true,
    requiresAll: [
      is('run.year', 'gte', 9, 'Reach the end of Year 8', 'time'),
      is('run.startersLoyal', 'eq', true, 'Mina, Rami and Gus employed the whole time', 'people'),
      is('run.starterProjects', 'gte', 20, '20 combined projects with them', 'robots', 'count'),
    ],
    clueStages: clue('The first three faces in the workshop matter more than you think.', 'Your starters are nearly legends of loyalty.'),
    rewardActions: [
      ...['ENG01', 'PRG01', 'MEC01'].map((s) => ({ type: 'trait', staff: s, trait: 'loyal', ifSlot: true, id: `SEC-BEH-01:${s}` })),
      pay('prestigeTokens', 1, 'SEC-BEH-01'),
    ],
  },
  {
    id: 'SEC-BEH-02',
    name: 'Small Parts, Big Win',
    group: 'behaviour',
    triggerEvents: ['competitionFinished'],
    oncePerAccount: true,
    requiresAll: [countOf('run.competitions', [w('eventId', 'eq', 'C08'), won, w('robotMaxCx', 'lte', 4)], 1, 'Win the National Arena (C08) with no part above Cx 4', 'competitions')],
    clueStages: clue('Big arenas have been won by small, simple machines.', 'Keep it simple. Nearly there.'),
    rewardActions: [pay('rp', 150, 'SEC-BEH-02'), { type: 'clue', id: 'SEC-STAFF-L1', stage: 1 }],
  },
  {
    id: 'SEC-BEH-03',
    name: 'Cheap and Cheerful',
    group: 'behaviour',
    triggerEvents: ['monthRollover'],
    oncePerRun: true,
    requiresAll: [countOf('run.products', [w('position', 'eq', 'value'), w('tier', 'eq', 'starter'), w('units', 'gte', 250, 'count'), w('review', 'gte', 8.0, 'threshold')], 1, 'Sell 250+ units of a Value Starter-tier robot with review 8.0+', 'sales')],
    clueStages: clue('Some say the best robots are the cheap ones everybody loves.', 'Value Engineering is one step away.'),
    rewardActions: [pay('techChips', 2, 'SEC-BEH-03'), { type: 'record', id: 'valueEngineering' }],
  },
  {
    id: 'SEC-BEH-04',
    name: 'Premium Perfection',
    group: 'behaviour',
    triggerEvents: ['monthRollover'],
    oncePerRun: true,
    requiresAll: [countOf('run.products', [w('position', 'eq', 'premium'), w('units', 'gte', 100, 'count'), w('review', 'gte', 9.5, 'threshold')], 1, 'Sell 100+ units of a Premium robot with review 9.5+', 'sales')],
    clueStages: clue('Perfection sells — if the price is right.', 'Premium Perfection is one step away.'),
    rewardActions: [pay('techChips', 2, 'SEC-BEH-04'), { type: 'clue', id: 'SEC-STAFF-L2', stage: 1 }],
  },
  {
    id: 'SEC-BEH-05',
    name: 'Controlled Disaster',
    group: 'behaviour',
    triggerEvents: ['projectFinished'],
    oncePerRun: true,
    requiresAll: [countOf('run.robots', [w('faultsFound', 'gte', 5), w('faults', 'lte', 1), w('review', 'gte', 8.5, 'threshold')], 1, 'Finish a project that reached 5+ faults with at most one left, and review 8.5+', 'robots')],
    clueStages: clue('A good team can save even the messiest build.', 'Controlled Disaster is one step away.'),
    rewardActions: [pay('rp', 100, 'SEC-BEH-05'), { type: 'clue', id: 'SEC-STAFF-L4', stage: 1 }],
  },
  {
    id: 'SEC-BEH-06',
    name: 'One of Everything',
    group: 'behaviour',
    triggerEvents: ['projectFinished'],
    oncePerRun: true,
    requiresAll: [countOf('run.purposesBuilt', [], 10, 'Complete all 10 purposes in one run', 'robots')],
    clueStages: clue('A workshop that builds every kind of robot gets a very special tool.', 'One purpose left.'),
    rewardActions: [{ type: 'part', id: 'TO08' }, pay('prestigeTokens', 1, 'SEC-BEH-06')],
  },
  {
    id: 'SEC-BEH-07',
    name: 'No Refresh Run',
    group: 'behaviour',
    triggerEvents: ['rankUp'],
    oncePerRun: true,
    requiresAll: [is('run.rankIndex', 'gte', 4, 'Reach Rank A', 'reputation'), is('run.flag.techChipRefresh', 'neq', true, 'without a Tech Chip recruitment refresh', 'people')],
    clueStages: clue('Some bosses never pay to reshuffle the job board.', 'Rank A without a paid reshuffle — nearly.'),
    rewardActions: [pay('techChips', 5, 'SEC-BEH-07'), { type: 'record', id: 'noRefresh' }],
  },
  {
    id: 'SEC-BEH-08',
    name: 'Original Pilot',
    group: 'behaviour',
    triggerEvents: ['competitionFinished'],
    oncePerRun: true,
    requiresAll: [countOf('run.competitions', [w('eventId', 'eq', 'C09'), won, w('pilot', 'eq', 'PIL01')], 1, 'Win the World Championship with Kai West', 'competitions')],
    clueStages: clue('The first pilot you ever hired could go all the way.', 'Kai is ready for the world.'),
    rewardActions: [{ type: 'trait', staff: 'PIL01', trait: 'homegrownAce', id: 'SEC-BEH-08:PIL01' }, pay('prestigeTokens', 2, 'SEC-BEH-08')],
  },
  {
    id: 'SEC-BEH-09',
    name: 'Workshop Minimalist',
    group: 'behaviour',
    triggerEvents: ['rankUp'],
    oncePerRun: true,
    requiresAll: [is('run.rankIndex', 'gte', 3, 'Reach Rank B', 'reputation')],
    forbids: [is('run.expansionsOwned', 'has', 'X3', 'Expansion 3 bought', 'workshop')],
    clueStages: clue('Big things come from small workshops.', 'Rank B in a small workshop — nearly.'),
    rewardActions: [pay('prestigeTokens', 2, 'SEC-BEH-09'), { type: 'clue', id: 'SEC-FAC-01', stage: 1 }],
  },
  {
    id: 'SEC-BEH-10',
    name: 'Full House',
    group: 'behaviour',
    triggerEvents: ['hire'],
    oncePerAccount: true,
    requiresAll: [is('account.namedStaffHired', 'gte', 50, 'Hire all 50 staff (any runs)', 'people')],
    clueStages: clue('Everyone who ever worked in robots has a story. Meet them all.', 'Only a few faces left to meet.'),
    rewardActions: [pay('techChips', 10, 'SEC-BEH-10'), pay('prestigeTokens', 5, 'SEC-BEH-10'), { type: 'record', id: 'fullHouse' }],
  },
  {
    id: 'SEC-BEH-11',
    name: 'Every Machine Has a Story',
    group: 'behaviour',
    triggerEvents: ['projectFinished'],
    oncePerAccount: true,
    requiresAll: [is('account.robotFamiliesCount', 'gte', 20, 'Archive all 20 robot looks (any runs)', 'robots')],
    clueStages: clue('Twenty kinds of robot. Most people only ever see a few.', 'Only a few looks left to find.'),
    rewardActions: [pay('prestigeTokens', 5, 'SEC-BEH-11'), { type: 'record', id: 'collection' }],
  },
];

export const SECRETS_BY_ID = Object.fromEntries(SECRETS.map((s) => [s.id, s]));

// Rumour Archive art (already in the folder).
export const SECRET_ART = { marker: 'ui_icon_10_secret', discover: 'vfx_14', records: 'ui_icon_09_records', aura: 'vfx_13', badge: 'badge_rarity_05_secret', token: 'reward_10', legendary: 'event_art_07', endgame: 'event_art_08' };

// Group names for the Rumour Archive.
export const SECRET_GROUPS = {
  legendary: 'Legendary staff',
  secretStaff: 'Secret staff',
  parts: 'Prestige components',
  facilities: 'Workshop',
  competitions: 'Competitions',
  robots: 'Robot paths',
  behaviour: 'Play style',
};
