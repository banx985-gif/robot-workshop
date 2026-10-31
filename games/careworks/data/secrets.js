// Secrets (Milestone 29, bible §35 the secret condition engine, §36 the 40 secrets, §37 New Game+, §0.1 rule 11). Plain data
// only; the engine is core/SecretEngine and the CAREWORKS side is src/systems/secrets.js (rules, rewards, clues, saves) on
// src/systems/secretFacts.js (every fact, read from the systems that already exist).
//
// THE RULE (§35, §0.1 rule 11): no secret may want resident neglect, distress, preventable harm, a medication error, unsafe
// staffing or a death. A secret only ever rewards good care. Every fact (and every field of a list fact's items) that
// counts something harmful is marked `harm` below; the forbid-harm guard (src/systems/secrets.js validateSecretRules) runs
// on every rule at load and in the tests, and a harm fact may only appear in `forbids` ("and none of these happened"),
// never in requiresAll / requiresAny and never as "fewer than" in forbids (which would want more of it). A bad rule
// stops the game in ?debug=1 and is dropped in a release build.
//
// A rule (core/SecretEngine's format, plus CAREWORKS words):
//   { id, name, category, ngPlusMin,
//     oncePerRun | oncePerAccount,                 once per campaign (again in a later run) or once ever on this device
//     triggerEvents: [trigger],                    the only moments it is looked at (TRIGGERS)
//     requiresAll: [cond], requiresAny: [cond], forbids: [cond],
//     clueStages: [4 × { text, minMet }],          the four clue stages (§35); then found (CLUE.found)
//     reward: 'what the Secrets page says it gave',
//     rewardActions: [{ type, id?, amount? }] }    REWARD_TYPES
// A condition: core/SecretEngine's ({ fact, op, value, … } / countOf / consecutive / sequence / sameAcross / all / any) with a
// `label` in plain words for the why-false inspector ("Family Trust 85+").

// --- clue stages (§35: four, then found) -----------------------------------------------------------------------------------
// The engine reaches a stage when that share of the rule's conditions is done (part-way conditions count part-way: 4 of 6
// months is two-thirds of that condition). Stages only go up. Found = 5 for good (the account remembers it).
export const CLUE = { stages: 4, found: 5, minMet: [{ share: 0.25 }, { share: 0.5 }, { share: 0.75 }, { share: 0.9 }] };
// No easing on a repeat: the bible has none (the same rule, every run).
export const EASING = { countFactor: 1, thresholdPct: 0 };

// --- triggers: the moments a rule may be looked at ---------------------------------------------------------------------------
// 'secrets:day' (each midnight, after the quality scores) and 'secrets:month' (each month's close, after its history is
// written) are the engine's own; the rest are the home's own bus moments, read as they happen.
export const TRIGGERS = ['secrets:day', 'secrets:month', 'care:discharge', 'care:birthday', 'quality:award', 'quality:rankUp', 'partners:signed', 'staff:trained', 'home:stage', 'care:celebration']; // (Milestone 30b: a community event or a family birthday party — Havoc's arrival moment)

// --- the facts (src/systems/secretFacts.js answers each one) -------------------------------------------------------------------
// scope: run (this campaign: its save) or account (this device: the account store; New Game+ keeps it).
// kind: number · list (of items, with `fields`) · ids (a list of ids) · flag · object
// harm: true — counts something harmful (§35). Only ever in `forbids`.
// The five headline scores are `run.score.<id>` (clinicalSafety, residentWellbeing, familyTrust, staffWellbeing, environment).
export const FACTS = {
  // thresholds
  'run.score': { name: 'A headline score (run.score.<id>)', kind: 'number', group: true },
  'run.lowestScore': { name: 'The lowest headline score', kind: 'number' },
  'run.nutrition': { name: 'Nutrition (the month’s average)', kind: 'number' },
  'run.environment': { name: 'Environment (rooms and cleanliness)', kind: 'number' },
  'run.residents': { name: 'Residents living here', kind: 'number' },
  'run.capacity': { name: 'Places the home has', kind: 'number' },
  'run.occupancy': { name: 'Occupancy %', kind: 'number' },
  'run.stage': { name: 'Facility stage', kind: 'number' },
  'run.year': { name: 'Campaign year', kind: 'number' },
  'run.rank': { name: 'Rank (E 0 … S 5)', kind: 'number' },
  'run.residentList': { name: 'Each resident', kind: 'list', fields: { id: 'id', stay: 'stay type', longTerm: 'long-term stay', tags: 'life-story tags', mood: 'Mood', comfort: 'Comfort', independence: 'Independence', connection: 'Social Connection', mobility: 'mobility level', familyTrust: 'their family’s Trust', daysHere: 'days living here', memorySupport: 'memory support', starting: 'here since the home opened', plan: 'care plan options (plan.<domain>)', specialMenu: 'on a special menu the team can make', favouriteFood: 'Favourite-Food Boost active', dining: 'dining satisfaction', familiar: 'their highest Familiar Care', familiar90Days: 'days in a row with Familiar Care 90+', gardenerDays: 'days in a row a Gardening resident in the garden program at Mood 95+', musicDance: 'Music or Dancing in their story', readingHistory: 'Reading or History in their story', quietSessions: 'quiet group sessions joined', trust95Days: 'days in a row their family’s Trust 95+', memorySessions: 'personalised memory / life-story sessions (ever)', memoryChoiceMin: 'their lowest Choice score', age: 'age now' } },
  // (Milestone 30) the home's averages over the residents here
  'run.community': { name: 'Community (residents’ average Social Connection)', kind: 'number' },
  'run.mobilityOutcome': { name: 'Mobility outcome (residents’ average Independence)', kind: 'number' },
  'run.diningSatisfaction': { name: 'Dining satisfaction (residents’ average)', kind: 'number' },
  // consecutive months (written at each month's close)
  'run.months': { name: 'Each closed month', kind: 'list', fields: { bells10Pct: 'call bells answered within ten minutes %', nightShifts: 'Night shifts', nightSafePct: 'Night shifts at Safe Coverage %', shiftsAll: 'shifts', safeAllPct: 'shifts at Safe Coverage % (every shift)', agencyAllPct: 'shifts with agency cover % (every shift)', familiarCare: 'Familiar Care average', choice: 'Choice / preference adherence (Doing something they like)', m: 'month number', scores: 'headline scores (scores.<id>)', lowest: 'lowest headline score', net: 'trading net', profit: 'in profit', noMissed: 'no essential care missed', familyTrust: 'home Family Trust', nutrition: 'Nutrition', environment: 'Environment', residents: 'residents', occupancy: 'occupancy %', agencyShifts: 'agency shifts', agencyPct: 'agency shifts % of shifts', safePct: 'shifts at Safe Coverage %', essentialMissed: { name: 'essential care missed', harm: true }, falls: { name: 'falls', harm: true }, unsafeShifts: { name: 'unsafe shifts', harm: true }, medErrors: { name: 'medication-round issues', harm: true }, complaints: { name: 'complaints', harm: true }, passings: { name: 'passings', harm: true } } },
  'run.monthsClosed': { name: 'Months closed', kind: 'number' },
  // history: the firsts in the order they happened (for sequence / ever-happened rules)
  'run.timeline': { name: 'Firsts, in order (rank:D, award:C01, birthday, discharge, compliment, course, stage:2, partner:<id>)', kind: 'ids' },
  // programs
  'run.programsRunning': { name: 'Programs running', kind: 'number' },
  'run.programIds': { name: 'Programs running (ids)', kind: 'ids' },
  'run.programsEver': { name: 'Different programs ever run', kind: 'ids' },
  'run.programs': { name: 'Each program running', kind: 'list', fields: { id: 'id', days: 'days running' } },
  'run.programsCompleted': { name: 'Different programs run for a full month', kind: 'number' }, // (Milestone 30)
  // resident outcomes
  'run.rehabDischarges': { name: 'Successful rehab discharges', kind: 'number' },
  'run.discharges': { name: 'Each rehab discharge', kind: 'list', fields: { id: 'resident', day: 'day', days: 'days of rehab', independence: 'Independence at discharge' } },
  'run.birthdaysHeld': { name: 'Birthdays held', kind: 'number' },
  'run.wishesHonoured': { name: 'End-of-life periods with their wishes honoured', kind: 'number' },
  'run.wellSupported': { name: 'Well-supported end-of-life periods (comfort)', kind: 'number' },
  // friendship / familiarity
  'run.friendships': { name: 'Each friendship pair', kind: 'list', fields: { a: 'resident', b: 'resident', friendship: 'Friendship', both: 'tags they share', bothLongTerm: 'both long-term', days: 'days since they met', storyTags: 'History / Community on both' } },
  'run.bestFriendship': { name: 'The strongest friendship', kind: 'number' },
  'run.storyFriendship': { name: 'The strongest friendship between two long-term residents who share History or Community', kind: 'number' },
  'run.familiarity': { name: 'Each staff–resident familiarity', kind: 'list', fields: { staff: 'staff', resident: 'resident', familiarity: 'familiarity', starting: 'one of the starting staff' } },
  'run.familiarCare': { name: 'Familiar Care average', kind: 'number' },
  // staff continuous employment
  'run.staff': { name: 'Each staff member', kind: 'list', fields: { id: 'id', role: 'role', tier: 'tier', founder: 'the Founder', starting: 'one of the starting staff', daysEmployed: 'days employed (continuous)' } },
  'run.startingKept': { name: 'Starting staff still here', kind: 'number' },
  'run.longestServing': { name: 'Longest continuous employment (days)', kind: 'number' },
  'run.noQuitDays': { name: 'Days since anyone left', kind: 'number' },
  'run.trainedStaff': { name: 'Each staff member who finished a course', kind: 'list', fields: { id: 'id', role: 'role' } }, // (Milestone 30)
  // family trust
  'run.familyTrust': { name: 'Family Trust (the home)', kind: 'number' },
  'run.families': { name: 'Each family', kind: 'list', fields: { resident: 'resident', trust: 'Trust' } },
  // roster / agency
  'run.agencyShiftsMonth': { name: 'Agency shifts this month', kind: 'number' },
  'run.safePctMonth': { name: 'Shifts at Safe Coverage this month %', kind: 'number' },
  // awards, partners
  'run.awards': { name: 'Accreditations won', kind: 'ids' },
  'run.awardCount': { name: 'Accreditations won (count)', kind: 'number' },
  'run.partners': { name: 'Each partner', kind: 'list', fields: { id: 'id', tier: 'tier (0 Partner … 3 Strategic)', active: 'deal running' } },
  'run.partnerTopTier': { name: 'Highest partner tier', kind: 'number' },
  'run.secretsFound': { name: 'Secrets found in this campaign', kind: 'number' },
  // (Milestone 30 Batch B)
  'run.secretsFoundIds': { name: 'Secrets found in this campaign (ids)', kind: 'ids' },
  'run.centenarians': { name: 'Each 100th birthday held here', kind: 'list', fields: { id: 'resident', day: 'day', wellbeing: 'Resident Wellbeing then', trust: 'their family’s Trust then' } },
  'run.majorBirthdays': { name: 'Each round-number birthday (80, 90, 100 …) held here', kind: 'list', fields: { id: 'resident', day: 'day', age: 'age', trust: 'their family’s Trust then', trust95Days: 'days in a row their family’s Trust had been 95+' } },
  'run.nightBellResponse': { name: 'Night call bells answered within ten minutes %', kind: 'number' },
  'run.communityDoor': { name: 'Community sessions and outings on a day with no essential care missed', kind: 'number' },
  'run.familyDiningEvents': { name: 'Family dining events hosted (no system yet)', kind: 'number' },
  'run.pilotDone': { name: 'An assistive-tech pilot completed by a resident who said yes', kind: 'flag' },
  // (Milestone 30 Batch C)
  'run.hydrationOnTime': { name: 'Drinks and hydration tasks done on time %', kind: 'number' },
  'run.favouriteFoodPlans': { name: 'Residents on the Favourite-Food Boost', kind: 'number' },
  'run.independenceGains': { name: 'Residents who gained 15+ Independence with Safety never below 80', kind: 'number' },
  'run.drills': { name: 'Emergency drills (no system yet)', kind: 'list', fields: { score: 'score' } },
  'run.emergencies': { name: 'Each incident handled', kind: 'list', fields: { kind: 'kind', prep: 'Preparedness then', band: 'severity band', calm: 'nobody fell or passed during it', day: 'day' } },
  'run.otherAwardCount': { name: 'Visible accreditations won besides C10', kind: 'number' },
  'run.legendaryHired': { name: 'A Legendary or Prestige person joined the team', kind: 'flag' },
  'run.aheadOfCrownHaven': { name: 'Headline scores ahead of Crown Haven (benchmark)', kind: 'number' },
  'run.legacyMentored': { name: 'Staff a Legacy Staff member mentored to Elite (no system yet)', kind: 'number' },
  // (Milestone 30b: the Works Gods' secrets)
  'run.facilitiesLevel3': { name: 'Facilities at Level III (now)', kind: 'number' },
  'run.goodSurprises': { name: 'Good surprises (thank-you gifts, well-wishers, family birthday parties)', kind: 'number' },
  'account.godsHired': { name: 'Works Gods hired at least once (every run)', kind: 'ids', scope: 'account' },
  'account.fourGodsHired': { name: 'Of Bolt, Jinx, Zip and Kaching: how many were hired at least once (every run)', kind: 'number', scope: 'account' },
  'account.legacyStaffLevels': { name: 'New Game+ levels one Legacy Staff member was carried through (no system yet)', kind: 'number', scope: 'account' },
  // harm (§35) — only ever in forbids
  'run.essentialMissedMonth': { name: 'Essential care missed this month', kind: 'number', harm: true },
  'run.essentialMissed': { name: 'Essential care missed (ever)', kind: 'number', harm: true },
  'run.falls28': { name: 'Falls in the last 28 days', kind: 'number', harm: true },
  'run.falls6m': { name: 'Falls in the last six months', kind: 'number', harm: true }, // (Milestone 30b)
  'run.essentialMissed12m': { name: 'Essential care missed in the last twelve months', kind: 'number', harm: true }, // (Milestone 30b)
  'run.unsafeShifts12m': { name: 'Unsafe shifts in the last twelve months', kind: 'number', harm: true }, // (Milestone 30b)
  'run.unsafeShiftsMonth': { name: 'Unsafe shifts this month', kind: 'number', harm: true },
  'run.unsafeShifts': { name: 'Unsafe shifts (ever)', kind: 'number', harm: true },
  'run.medErrors': { name: 'Medication-round issues (ever)', kind: 'number', harm: true },
  'run.openMedAlerts': { name: 'Unresolved clinical alerts', kind: 'number', harm: true },
  'run.distress': { name: 'Residents in distress (Mood under 20)', kind: 'number', harm: true },
  'run.complaints': { name: 'Complaints (ever)', kind: 'number', harm: true },
  'run.passings': { name: 'Passings', kind: 'number', harm: true },
  'run.personalAutomation': { name: 'Automation used for personal care', kind: 'number', harm: true }, // (Batch B: never happens)
  'run.eolNotWellSupported': { name: 'End-of-life periods not well supported', kind: 'number', harm: true }, // (Milestone 30)
  'run.forcedDependence': { name: 'Days a resident who could walk was kept on a wheelchair or transfer plan', kind: 'number', harm: true }, // (Milestone 30)
  // account (this device; New Game+ keeps it)
  'account.ngPlus': { name: 'New Game+ level', kind: 'number', scope: 'account' },
  'account.memoryBook': { name: 'Memory Book pages (every home)', kind: 'number', scope: 'account' },
  'account.secretsFound': { name: 'Secrets found (every run)', kind: 'number', scope: 'account' },
  'account.secretsFoundIds': { name: 'Secrets found (ids)', kind: 'ids', scope: 'account' },
  'account.storySecretsFound': { name: 'Resident-story secrets found (every run)', kind: 'number', scope: 'account' }, // (Milestone 30)
  'account.prestigeTokens': { name: 'Prestige Tokens', kind: 'number', scope: 'account' },
  // the trigger's own payload: event.<field> (e.g. event.id on quality:award)
  event: { name: 'The moment’s own detail (event.<field>)', kind: 'object', group: true },
};
export const scopeOf = (fact) => (String(fact).startsWith('account.') ? 'account' : 'run');
// The fact's catalogue row (run.score.familyTrust → run.score).
export function factDef(fact) {
  if (FACTS[fact]) return FACTS[fact];
  const p = Object.keys(FACTS).filter((k) => FACTS[k].group && String(fact).startsWith(`${k}.`)).sort((a, b) => b.length - a.length)[0];
  return p ? FACTS[p] : null;
}

// --- rewards (each through an existing system; src/systems/secrets.js has one function per type) ----------------------------
// scope: account — kept on this device (New Game+ keeps it); run — in this campaign. currency: paid once per account only.
export const REWARD_TYPES = {
  prestige: { scope: 'account', currency: true, text: (a) => `${a.amount} Prestige Token${a.amount === 1 ? '' : 's'}` },
  record: { scope: 'account', text: (a) => `The ${RECORDS[a.id]?.name ?? a.id} record` },
  palette: { scope: 'account', text: (a) => `The ${PALETTES[a.id]?.name ?? a.id} palette` },
  recognition: { scope: 'run', text: (a) => RECOGNITIONS[a.id]?.name ?? a.id }, // the Founder's recognitions and this home's records
  item: { scope: 'run', text: () => 'A piece of care equipment' }, // items.grant('secret') — never bought
  arrival: { scope: 'run', text: (a) => `A special arrival: ${a.name ?? a.id}` }, // a flag the M30 special arrivals read
  event: { scope: 'run', text: (a) => CELEBRATIONS[a.id]?.name ?? a.id }, // a celebration / event chain flag (M30 builds them)
  unlock: { scope: 'run', text: (a) => UNLOCKS[a.id]?.name ?? a.id }, // (Milestone 30) an unlock flag `unlock:<id>` a later milestone reads
};
export const RECORDS = {
  fiveStarBalance: { name: 'Five-Star Balance', text: 'All five headline scores 90+ together for six months' },
  reablementChampion: { name: 'Reablement Champion', text: 'Five residents home again, steady and independent' },
  // (Milestone 30b) the series achievement (Milestone 32 will list it with the other achievements)
  pantheon: { name: 'Pantheon', text: 'Welcome all five Works Gods to your home.', achievement: true },
};
// (Milestone 30) What an unlock flag opens. `builtIn`: the milestone that builds the thing itself (until then only the flag).
export const UNLOCKS = {
  libraryCircle: { name: 'The Library Circle program boost', builtIn: 'later' },
  memoryLane: { name: 'The Memory Lane program', builtIn: 'later' },
  centenarianClue: { name: 'A clue to the Centenarian Garden', builtIn: 'later' },
  F34: { name: 'The Centenarian Garden (F34)', builtIn: 'M31' },
  PRG11: { name: 'The Centenarian Living program (PRG11)', builtIn: 'M31' },
  F35: { name: 'Legacy House (F35)', builtIn: 'M31' },
  nightComfortPlan: { name: 'The Prestige Night Comfort plan', builtIn: 'later' },
  communityDoor: { name: 'The Community Door program', builtIn: 'later' },
  gentleAssist: { name: 'Gentle-assist logistics tech', builtIn: 'later' },
  // (Batch C)
  dignityBonus: { name: 'A lasting Dignity reputation bonus', builtIn: 'later' },
  continuityPreset: { name: 'The Continuity roster preset', builtIn: 'later' },
  prestigeDining: { name: 'The Prestige Dining plan', builtIn: 'later' },
  independenceFirstUpgrade: { name: 'The Independence First trait upgrade', builtIn: 'later' },
  emergencyExcellenceClue: { name: 'A clue to an Emergency Excellence accreditation', builtIn: 'later' },
  C11: { name: 'The Master Care Circle accreditation (C11)', builtIn: 'M31' },
  C12: { name: 'The Home, Not Hospital Honour (C12)', builtIn: 'M31' },
  PRG12: { name: 'The Home, Not Hospital program (PRG12)', builtIn: 'M31' },
  benchmarkNetwork: { name: 'The prestige benchmark network', builtIn: 'later' },
  heartOfHomeEvolution: { name: 'The Founder’s Heart of the Home trait evolution', builtIn: 'later' },
  workforceStability: { name: 'A Workforce Stability bonus', builtIn: 'later' },
  legacyMentor: { name: 'The Legacy Mentor trait', builtIn: 'later' },
};
export const PALETTES = {
  heritageHome: { name: 'Heritage Home', text: 'A warm heritage palette for any home' },
};
export const RECOGNITIONS = {
  oldFriends: { name: 'Old Friends celebration', text: 'Two old friends, celebrated by the whole home' },
  // (Batch C: accolades)
  residentLedHome: { name: 'The Resident-Led Home accolade', text: 'A home where residents’ own choices lead the day' },
  balancedOperations: { name: 'The Balanced Operations accolade', text: 'Full, safe and trusted, all at once' },
  // (Milestone 31: C12's reward, given by the award itself — data/accreditations.js PRESTIGE_ACCREDITATIONS)
  homeNotHospital: { name: 'The Home, Not Hospital accolade', text: 'Safe care and a life that feels like home, both at their very best' },
};
export const CELEBRATIONS = {
  oldFriends: { name: 'The Old Friends celebration' },
  // (Milestone 30 Batch B)
  heritageGarden: { name: 'The Heritage Garden event chain' },
  residentBand: { name: 'The Resident Band event' },
  familyLegacy: { name: 'The Family Legacy celebration' },
  familyTable: { name: 'The Family Table event series' },
  trueEnding: { name: 'The true CAREWORKS ending' }, // (Batch C: SEC-NGP-03 — the ending itself is a later milestone's)
};

// --- the rules (Milestone 29: three samples from §36 to prove the engine; the other 37 are Milestone 30) ----------------------
const stages = (texts) => texts.map((text, i) => ({ text, minMet: CLUE.minMet[i] }));
const SCORE = (id, min, label) => ({ fact: `run.score.${id}`, op: 'gte', value: min, kind: 'threshold', category: 'quality', label });
export const SECRET_RULES = [
  // threshold + consecutive months
  {
    id: 'SEC-AWARD-01',
    name: 'Five-Star Balance',
    category: 'recognition',
    oncePerRun: true,
    triggerEvents: ['secrets:month'],
    requiresAll: [
      {
        fact: 'run.months',
        op: 'consecutive',
        where: [
          { field: 'scores.clinicalSafety', op: 'gte', value: 90 },
          { field: 'scores.residentWellbeing', op: 'gte', value: 90 },
          { field: 'scores.familyTrust', op: 'gte', value: 90 },
          { field: 'scores.staffWellbeing', op: 'gte', value: 90 },
          { field: 'scores.environment', op: 'gte', value: 90 },
        ],
        value: 6,
        kind: 'count',
        category: 'quality',
        label: 'All five headline scores 90+ together',
        unit: 'months',
      },
    ],
    clueStages: stages([
      'Inspectors talk of homes where every part of care shines at once.',
      'Balance is the word: no one score carried by the others.',
      'Keep it up, month after month, and someone will notice.',
      'Very close: a little longer, all together.',
    ]),
    reward: 'The Five-Star Balance record and 3 Prestige Tokens',
    rewardActions: [{ type: 'record', id: 'fiveStarBalance' }, { type: 'prestige', amount: 3 }],
  },
  // resident outcome / friendship
  {
    id: 'SEC-RES-02',
    name: 'Old Friends',
    category: 'residentStory',
    oncePerRun: true,
    triggerEvents: ['secrets:day'],
    requiresAll: [
      {
        fact: 'run.friendships',
        op: 'countOf',
        where: [
          { field: 'bothLongTerm', op: 'eq', value: true },
          { field: 'storyTags', op: 'eq', value: true },
        ],
        value: 1,
        kind: 'fixed',
        category: 'residents',
        label: 'Two long-term residents with History or Community in their stories, getting to know each other',
      },
      { fact: 'run.storyFriendship', op: 'gte', value: 100, kind: 'threshold', category: 'friendship', label: 'Their friendship reaches 100' },
    ],
    clueStages: stages([
      'Some residents arrive with stories that sound oddly familiar to each other.',
      'Long stays, long memories: history and community bring people together.',
      'Two residents seem to finish each other’s stories.',
      'Their friendship is nearly as deep as it can go.',
    ]),
    reward: 'The Old Friends celebration',
    rewardActions: [{ type: 'event', id: 'oldFriends' }, { type: 'recognition', id: 'oldFriends' }, { type: 'item' }],
  },
  // account / New Game+
  {
    id: 'SEC-NGP-01',
    name: 'Back to the Small Home',
    category: 'newGamePlus',
    ngPlusMin: 1,
    oncePerAccount: true,
    triggerEvents: ['quality:award', 'secrets:month'],
    requiresAll: [
      { fact: 'run.awards', op: 'has', value: 'C02', kind: 'fixed', category: 'recognition', label: 'Resident Choice Recognition (C02) won' },
      { fact: 'run.stage', op: 'eq', value: 1, kind: 'fixed', category: 'facility', label: 'Still a Stage 1 home' },
      { fact: 'run.residents', op: 'lt', value: 16, kind: 'fixed', category: 'facility', label: 'Under 16 residents' },
      { fact: 'run.lowestScore', op: 'gte', value: 80, kind: 'threshold', category: 'quality', label: 'Every headline score 80+' },
    ],
    clueStages: stages([
      'Some say the best care happens in the smallest homes.',
      'A second life for a small home: no need to grow to be recognised.',
      'Residents’ own choices, honoured in a home that stays small.',
      'Nearly there: keep it small and keep every score high.',
    ]),
    reward: 'The Heritage Home palette and 2 Prestige Tokens',
    rewardActions: [{ type: 'palette', id: 'heritageHome' }, { type: 'prestige', amount: 2 }],
  },
  // --- Milestone 30, Batch A: the ten staff secrets (§36 SEC-STAFF-L1…L5, S1…S5) ----------------------------------------
  // Each brings one named Legendary / Prestige person (data/staff.js, never on any board) as a special arrival: a card on
  // the Recruit board that waits until they are hired (src/systems/staffing.js arrive). Legendary: once per run, looked at
  // each month's close. Prestige (New Game+ 2 / 3): once per account.
  ...staffSecrets(),
  // --- Milestone 30, Batch B: resident stories (§36 SEC-RES-01, 03–08) and facility / program secrets (SEC-FAC-01, 02,
  // SEC-PROG-01…04). Once per run, except Legacy House (24 secrets across every run: once per account).
  ...storyAndPlaceSecrets(),
  // --- Milestone 30, Batch C: care practice (§36 SEC-CARE-01…05), recognition / peers (SEC-COMP-01, 02, SEC-RIVAL-01),
  // behaviour (SEC-BEH-01…04) and New Game+ (SEC-NGP-02, 03). Once per run, except New Game+ and anything counted across
  // every run (secrets found): once per account.
  ...practiceAndLegacySecrets(),
  // --- Milestone 30b: the Works Gods (SEC-GOD-1…5, docs/M30b_WORKS_GODS.md) — the hardest secrets in the game. Each brings
  // one god (data/staff.js GODS) as a special arrival. Category 'divine': they never count toward "secrets found" (FAC-02,
  // COMP-02, RIVAL-01 keep their numbers based on the 40). No rumour until Rank A; Havoc's not until the other four have
  // each been hired at least once (every run).
  ...godSecrets(),
];
function godSecrets() {
  const RANK_A = { fact: 'run.rank', op: 'gte', value: 4, kind: 'fixed', category: 'recognition', label: 'Rank A' };
  const RANK_A_GATE = { ...RANK_A, label: 'Rank A (before any rumour)' };
  const FOUR = { fact: 'account.fourGodsHired', op: 'gte', value: 4, kind: 'fixed', category: 'staff', label: 'Bolt, Jinx, Zip and Kaching each hired at least once (every run)' };
  const months = (where, n, label, category = 'quality') => ({ fact: 'run.months', op: 'consecutive', where, value: n, kind: 'count', category, label, unit: 'months' });
  const god = (n, name, staffId, person, requiresAll, clues, forbids = [], extra = {}) => ({ id: `SEC-GOD-${n}`, name, category: 'divine', oncePerRun: true, triggerEvents: ['secrets:month'], requiresAll, forbids, clueGate: [RANK_A_GATE], clueStages: stages(clues), reward: `${person} arrives (a special arrival on the Recruit board)`, rewardActions: [{ type: 'arrival', id: staffId, name: person }], ...extra });
  return [
    god(1, 'The Tinker in the Shed', 'AH11', 'Bolt, God of Tinkering', [
      RANK_A,
      { fact: 'run.facilitiesLevel3', op: 'gte', value: 12, kind: 'count', category: 'facility', label: 'Facilities at Level III at once' },
      months([{ field: 'scores.environment', op: 'gte', value: 90 }], 6, 'Environment & Compliance 90+'),
    ], [
      'A cheerful whistling from the workshop.',
      'Someone keeps tightening every loose screw.',
      'Residents swear they saw a golden cog float past the shed.',
      'The old handyman of the heavens is checking your toolbox.',
    ], [{ fact: 'run.falls6m', op: 'gt', value: 0, kind: 'fixed', category: 'residents', label: 'A fall in the last six months' }]),
    god(2, 'The Lucky Cat', 'LC11', 'Jinx, Goddess of Luck', [
      RANK_A,
      { fact: 'run.goodSurprises', op: 'gte', value: 12, kind: 'count', category: 'residents', label: 'Good surprises in this home (thank-you gifts, well-wishers, family birthday parties)' },
      { fact: 'account.storySecretsFound', op: 'gte', value: 6, kind: 'count', category: 'residents', label: 'Resident-story secrets found (every run)' },
      { fact: 'run.wishesHonoured', op: 'gte', value: 10, kind: 'count', category: 'comfort', label: 'Residents whose last wishes were honoured' },
    ], [
      'A lucky cat statue appeared on the front desk.',
      'Bingo seems to go everyone’s way lately.',
      'A tiny glowing dice rolled under the lounge chair.',
      'Lady Luck is thinking of moving in.',
    ]),
    god(3, 'The Blur in the Corridor', 'RN11', 'Zip, God of Speed', [
      RANK_A,
      months([{ field: 'bells10Pct', op: 'gte', value: 98 }, { field: 'shiftsAll', op: 'gt', value: 0 }, { field: 'safeAllPct', op: 'gte', value: 100 }], 12, '98% of call bells answered within ten minutes, with every shift at Safe Coverage', 'care'),
      { fact: 'run.score.clinicalSafety', op: 'gte', value: 92, kind: 'threshold', category: 'quality', label: 'Clinical Safety 92+' },
    ], [
      'A blur went past the nurses’ station.',
      'Call bells are barely ringing before they stop.',
      'Little sparks on the corridor carpet at night.',
      'Someone very fast wants to work night shift.',
    ], [{ fact: 'run.essentialMissed12m', op: 'gt', value: 0, kind: 'fixed', category: 'care', label: 'Essential care missed in the last twelve months' }]),
    god(4, 'The Jolly Benefactor', 'HN11', 'Kaching, God of Fortune', [
      RANK_A,
      months([{ field: 'profit', op: 'eq', value: true }], 12, 'A profit every month', 'economy'),
      { fact: 'run.partners', op: 'countOf', where: [{ field: 'tier', op: 'gte', value: 3 }, { field: 'active', op: 'eq', value: true }], value: 4, kind: 'count', category: 'partners', label: 'Partners at Strategic tier at once' },
      { fact: 'run.familyTrust', op: 'gte', value: 85, kind: 'threshold', category: 'family', label: 'Family Trust 85+' },
    ], [
      'A bunch of flowers arrived with no card.',
      'The accounts book smells faintly of gold.',
      'Coins keep turning up in the garden.',
      'A very jolly benefactor is asking about your home.',
    ], [{ fact: 'run.unsafeShifts12m', op: 'gt', value: 0, kind: 'fixed', category: 'staff', label: 'An unsafe shift in the last twelve months' }]),
    // Havoc: New Game+ 1, after the other four were each hired once (every run). Looked at only at a celebration (a
    // birthday tea, a family birthday party or a community event), so that is when he turns up.
    god(5, 'Far Too Many Streamers', 'LC12', 'Havoc, God of Chaos', [FOUR], [
      'Streamers on the ceiling. Nobody put them there.',
      'The party hats have gone missing again.',
      'Purple sparks in the activities cupboard.',
      'Something mischievous is waiting for the next big party.',
    ], [], { ngPlusMin: 1, triggerEvents: ['care:birthday', 'care:celebration'], clueGate: [RANK_A_GATE, { ...FOUR, label: 'The other four Works Gods each hired once (before any rumour)' }], reward: 'Someone’s brought far too many streamers… Havoc, God of Chaos arrives (a special arrival on the Recruit board)' }),
  ];
}
function practiceAndLegacySecrets() {
  const YEAR = 336;
  const MONTH = ['secrets:month'];
  const months = (where, n, label, category = 'quality') => ({ fact: 'run.months', op: 'consecutive', where, value: n, kind: 'count', category, label, unit: 'months' });
  const unlock = (...ids) => ids.map((id) => ({ type: 'unlock', id }));
  const rule = (id, name, category, requiresAll, clues, reward, rewardActions, extra = {}) => ({ id, name, category, oncePerRun: true, triggerEvents: MONTH, requiresAll, clueStages: stages(clues), reward, rewardActions, ...extra });
  // once per account (New Game+, or counted across every run)
  const account = (r, ng = 0) => {
    const { oncePerRun, ...rest } = r;
    return { ...rest, ...(ng ? { ngPlusMin: ng } : {}), oncePerAccount: true };
  };
  const C11 = { fact: 'run.awards', op: 'has', value: 'C11', kind: 'fixed', category: 'recognition', label: 'C11 won' }; // (built in Milestone 31: never true until then)
  const C10 = { fact: 'run.awards', op: 'has', value: 'C10', kind: 'fixed', category: 'recognition', label: 'C10 won' };
  const secrets = (n) => ({ fact: 'account.secretsFound', op: 'gte', value: n, kind: 'count', category: 'recognition', label: 'Secrets found (every run)' });
  const LEGACY = (n) => ({ fact: 'account.legacyStaffLevels', op: 'gte', value: n, kind: 'fixed', category: 'staff', label: `One Legacy Staff member carried through New Game+ ${n === 2 ? '1 and 2' : '1, 2 and 3'}` }); // (no system yet)
  return [
    rule('SEC-CARE-01', 'Dignity First', 'care', [
      months([{ field: 'choice', op: 'gte', value: 95 }, { field: 'residents', op: 'gte', value: 20 }], 12, 'Choice / preference adherence 95+ with 20+ residents', 'residents'),
    ], [
      'Residents here are asked, and their answers are kept.',
      'Every small wish, honoured, adds up to dignity.',
      'A full home where nobody’s wishes get lost.',
      'Nearly there: dignity has become a habit.',
    ], 'A lasting Dignity reputation bonus', unlock('dignityBonus')),
    rule('SEC-CARE-02', 'Familiar Faces', 'care', [
      months([{ field: 'familiarCare', op: 'gte', value: 90 }, { field: 'agencyAllPct', op: 'lt', value: 10 }], 12, 'Familiar Care average 90+ with agency cover on under 10% of shifts', 'familiarity'),
    ], [
      'Residents recognise every face that walks in.',
      'The same kind people, day after day.',
      'Strangers on the rota are rare here.',
      'Very close: a team everyone knows by name.',
    ], 'The Continuity roster preset', unlock('continuityPreset')),
    rule('SEC-CARE-03', 'Every Meal Matters', 'care', [
      { fact: 'run.nutrition', op: 'gte', value: 95, kind: 'threshold', category: 'nutrition', label: 'Nutrition 95+' },
      { fact: 'run.hydrationOnTime', op: 'gte', value: 99, kind: 'threshold', category: 'nutrition', label: 'Drinks and hydration tasks done on time 99%+' },
      { fact: 'run.favouriteFoodPlans', op: 'gte', value: 5, kind: 'count', category: 'nutrition', label: 'Residents on the Favourite-Food Boost' },
    ], [
      'A good cup of tea, always at the right moment.',
      'Nobody here waits long for a drink.',
      'Favourite dishes turn up on the right plates.',
      'Nearly there: every meal really matters.',
    ], 'The Prestige Dining plan', unlock('prestigeDining')),
    rule('SEC-CARE-04', 'Independence Matters', 'care', [
      { fact: 'run.independenceGains', op: 'gte', value: 10, kind: 'count', category: 'residents', label: 'Residents who gained 15+ Independence with Safety never below 80' },
    ], [
      'Some residents are doing more for themselves than when they arrived.',
      'Steady progress, with nobody put at risk.',
      'Doing it yourself, safely, is its own reward.',
      'Very close: so many small victories.',
    ], 'The Independence First trait upgrade', unlock('independenceFirstUpgrade')),
    rule('SEC-CARE-05', 'Prepared for Anything', 'care', [
      { fact: 'run.drills', op: 'countOf', where: [{ field: 'score', op: 'gte', value: 90 }], value: 3, kind: 'count', category: 'safety', label: 'Emergency drills completed at 90+' }, // (no drill system yet: never true)
      { fact: 'run.emergencies', op: 'countOf', where: [{ field: 'prep', op: 'gte', value: 90 }, { field: 'calm', op: 'eq', value: true }], value: 1, kind: 'fixed', category: 'safety', label: 'An incident handled at Preparedness 90+ with nobody hurt' },
    ], [
      'The best homes practise for the days they hope never come.',
      'Ready supplies, a ready team and a steady plan.',
      'When something goes wrong, everyone knows what to do.',
      'Nearly there: calm under pressure.',
    ], 'A clue to an Emergency Excellence accreditation', unlock('emergencyExcellenceClue')),
    rule('SEC-COMP-01', 'Master Care Circle', 'recognition', [
      C10,
      { fact: 'run.otherAwardCount', op: 'gte', value: 4, kind: 'count', category: 'recognition', label: 'Visible accreditations won besides C10' },
      { fact: 'run.legendaryHired', op: 'eq', value: true, kind: 'fixed', category: 'staff', label: 'A Legendary (or Prestige) person on the team' },
    ], [
      'There is a circle of homes that few ever join.',
      'The highest national honour is only the start.',
      'A legend on the team would not go unnoticed.',
      'Very close: the circle is ready to welcome you.',
    ], 'The Master Care Circle accreditation (C11)', unlock('C11'), { triggerEvents: ['quality:award', 'secrets:month'] }),
    account(rule('SEC-COMP-02', 'Home, Not Hospital Honour', 'recognition', [
      C11,
      months([{ field: 'scores.clinicalSafety', op: 'gte', value: 95 }, { field: 'scores.residentWellbeing', op: 'gte', value: 95 }], 12, 'Clinical Safety 95+ and Resident Wellbeing 95+ together'),
      secrets(30),
    ], [
      'Some say a care home can feel more like home than any house.',
      'Safe care and a happy life, each as important as the other.',
      'Every secret uncovered brings the honour closer.',
      'Nearly there: a home, not a hospital.',
    ], 'The Home, Not Hospital Honour (C12) and its program (PRG12)', unlock('C12', 'PRG12')), 2),
    account(rule('SEC-RIVAL-01', 'Legacy House Network', 'recognition', [
      C10,
      { fact: 'run.aheadOfCrownHaven', op: 'gte', value: 3, kind: 'count', category: 'recognition', label: 'Headline scores ahead of Crown Haven' },
      secrets(12),
    ], [
      'A famous home sets the standard everyone measures against.',
      'Beat the best at their own game, more than once.',
      'Homes that know the hidden stories share them.',
      'Very close: a network of the finest homes awaits.',
    ], 'The prestige benchmark network', unlock('benchmarkNetwork'))),
    rule('SEC-BEH-01', 'Heart of the Home', 'behaviour', [
      { fact: 'run.staff', op: 'countOf', where: [{ field: 'starting', op: 'eq', value: true }, { field: 'daysEmployed', op: 'gte', value: 15 * YEAR }], value: 1, kind: 'fixed', category: 'staff', label: 'A starting staff member employed without a break to Year 16' },
      { fact: 'run.score.staffWellbeing', op: 'gte', value: 80, kind: 'threshold', category: 'quality', label: 'Staff Wellbeing 80+' },
    ], [
      'Someone who was there on the very first day.',
      'Loyalty grows where people are looked after.',
      'A whole career, in a single home.',
      'Nearly there: the heart of the home is still beating.',
    ], 'The Founder’s Heart of the Home trait evolution', unlock('heartOfHomeEvolution')),
    rule('SEC-BEH-02', 'Resident-Led Home', 'behaviour', [
      months([{ field: 'choice', op: 'gte', value: 95 }, { field: 'residents', op: 'gte', value: 30 }], 12, 'Choice / preference adherence 95+ with 30+ residents', 'residents'),
    ], [
      'In this home, residents decide how the day goes.',
      'The bigger the home, the harder it is to listen to everyone.',
      'Listening has become the way things are done.',
      'Very close: the residents are leading.',
    ], 'The Resident-Led Home accolade', [{ type: 'recognition', id: 'residentLedHome' }]),
    rule('SEC-BEH-03', 'No Empty Chairs', 'behaviour', [
      months([{ field: 'occupancy', op: 'gte', value: 90 }, { field: 'safeAllPct', op: 'gte', value: 85 }, { field: 'scores.residentWellbeing', op: 'gte', value: 85 }, { field: 'scores.familyTrust', op: 'gte', value: 85 }], 12, 'Occupancy 90%+ with Safe Coverage, Resident Wellbeing and Family Trust all 85+', 'facility'),
    ], [
      'Every room is wanted, and every family knows why.',
      'A full house that never feels stretched.',
      'Busy, safe and trusted, all at once.',
      'Nearly there: a waiting list of people who want to come.',
    ], 'The Balanced Operations accolade', [{ type: 'recognition', id: 'balancedOperations' }]),
    rule('SEC-BEH-04', 'Agency Independence', 'behaviour', [
      months([{ field: 'agencyAllPct', op: 'lt', value: 5 }, { field: 'safeAllPct', op: 'gte', value: 100 }], 12, 'Agency cover on under 5% of shifts with every shift at Safe Coverage', 'staffing'),
    ], [
      'A home that stands on its own team.',
      'Strangers on the rota are almost never needed.',
      'Every shift covered, by people who belong here.',
      'Very close: a team that never lets a shift go short.',
    ], 'A Workforce Stability bonus', unlock('workforceStability')),
    account(rule('SEC-NGP-02', 'Continuity Across Generations', 'newGamePlus', [
      LEGACY(2),
      { fact: 'run.legacyMentored', op: 'gte', value: 5, kind: 'count', category: 'staff', label: 'Staff the Legacy Staff member mentored to Elite' }, // (no system yet)
    ], [
      'Some carers follow you from home to home.',
      'A familiar face, carried into a new beginning.',
      'They pass on what they know to the next generation.',
      'Nearly there: a mentor for every new team.',
    ], 'The Legacy Mentor trait', unlock('legacyMentor')), 2),
    account(rule('SEC-NGP-03', 'Living Legacy', 'newGamePlus', [
      { fact: 'run.awards', op: 'has', value: 'C12', kind: 'fixed', category: 'recognition', label: 'C12 won' }, // (built in Milestone 31)
      { fact: 'account.memoryBook', op: 'gte', value: 50, kind: 'count', category: 'residents', label: 'Memory Book pages (every home)' },
      LEGACY(3),
    ], [
      'Every home you have run is part of a longer story.',
      'The memories you keep are the truest record.',
      'Someone has been with you from the very beginning.',
      'The last page is nearly written.',
    ], 'The true CAREWORKS ending and 5 Prestige Tokens', [{ type: 'event', id: 'trueEnding' }, { type: 'prestige', amount: 5 }]), 3),
  ];
}
function storyAndPlaceSecrets() {
  const YEAR = 336;
  const residents = (where, n, label, category = 'residents') => ({ fact: 'run.residentList', op: 'countOf', where, value: n, kind: 'count', category, label });
  const rule = (id, name, category, triggers, requiresAll, clues, reward, rewardActions, extra = {}) => ({ id, name, category, oncePerRun: true, triggerEvents: triggers, requiresAll, clueStages: stages(clues), reward, rewardActions, ...extra });
  const MONTH = ['secrets:month'];
  return [
    rule('SEC-RES-01', 'The Gardener', 'residentStory', MONTH, [
      { fact: 'run.programIds', op: 'has', value: 'PRG01', kind: 'fixed', category: 'programs', label: 'Gardening & Horticulture running' },
      residents([{ field: 'gardenerDays', op: 'gte', value: 168 }], 1, 'A resident who loves gardening, in the garden program, at Mood 95+ for 6 months in a row'),
    ], [
      'Someone here has green fingers and a story to go with them.',
      'Soil, seedlings and sunshine do more than you might think.',
      'A gardener has been glowing for a long time now.',
      'Nearly there: the garden is almost in full bloom.',
    ], 'The Heritage Garden event chain', [{ type: 'event', id: 'heritageGarden' }]),
    rule('SEC-RES-03', 'The Band', 'residentStory', MONTH, [
      residents([{ field: 'musicDance', op: 'eq', value: true }, { field: 'connection', op: 'gte', value: 90 }], 3, 'Residents with Music or Dancing in their story, at Social Connection 90+ together'),
    ], [
      'Somebody keeps humming the same old tune.',
      'Music lovers find each other, given the chance.',
      'A few voices are starting to sound like a group.',
      'Very close: someone is tuning up.',
    ], 'The Resident Band event', [{ type: 'event', id: 'residentBand' }]),
    rule('SEC-RES-04', 'Book Club', 'residentStory', MONTH, [
      residents([{ field: 'readingHistory', op: 'eq', value: true }, { field: 'quietSessions', op: 'gte', value: 8 }], 4, 'Residents with Reading or History in their story who joined 8 quiet group sessions'),
    ], [
      'There is talk of a well-thumbed book being passed around.',
      'Readers and history lovers enjoy a calm afternoon together.',
      'Quiet sessions, again and again, build something.',
      'Nearly there: a little circle has formed.',
    ], 'The Library Circle program boost', [{ type: 'unlock', id: 'libraryCircle' }]),
    rule('SEC-RES-05', 'Home Again', 'residentStory', ['care:discharge', 'secrets:month'], [
      { fact: 'run.discharges', op: 'countOf', where: [{ field: 'independence', op: 'gte', value: 85 }], value: 5, kind: 'count', category: 'residents', label: 'Rehab discharges at Independence 85+' },
    ], [
      'Some people only come to stay for a while, and leave stronger.',
      'Going home steady and sure is the best goodbye.',
      'Several residents have walked out of the front door on their own.',
      'Very close: another proud farewell.',
    ], 'The Reablement Champion record', [{ type: 'record', id: 'reablementChampion' }]),
    rule('SEC-RES-06', 'Four Generations', 'residentStory', ['care:birthday', 'secrets:month'], [
      residents([{ field: 'trust95Days', op: 'gte', value: 3 * YEAR }], 1, 'A family with Trust 95+ for 3 years in a row', 'family'),
      { fact: 'run.majorBirthdays', op: 'countOf', where: [{ field: 'trust95Days', op: 'gte', value: 3 * YEAR }], value: 1, kind: 'fixed', category: 'family', label: 'A round-number birthday (80, 90, 100 …) held for that resident' },
    ], [
      'A large family visits as often as they can.',
      'Trust built slowly lasts the longest.',
      'A big birthday is coming for someone much loved.',
      'Nearly there: the whole family will want to be here.',
    ], 'The Family Legacy celebration', [{ type: 'event', id: 'familyLegacy' }]),
    rule('SEC-RES-07', 'Century Club', 'residentStory', ['care:birthday', 'secrets:month'], [
      { fact: 'run.centenarians', op: 'countOf', where: [{ field: 'wellbeing', op: 'gte', value: 90 }, { field: 'trust', op: 'gte', value: 80 }], value: 1, kind: 'fixed', category: 'residents', label: 'A 100th birthday held while Resident Wellbeing is 90+ and their family’s Trust 80+' },
    ], [
      'Someone here has seen a great deal of history.',
      'A very special birthday deserves a very happy home.',
      'Their family will want to share the day.',
      'Very close: get the candles ready.',
    ], 'A clue to the Centenarian Garden', [{ type: 'unlock', id: 'centenarianClue' }]),
    rule('SEC-RES-08', 'Memory Lane', 'residentStory', MONTH, [
      residents([{ field: 'memorySupport', op: 'eq', value: true }, { field: 'memorySessions', op: 'gte', value: 12 }, { field: 'memoryChoiceMin', op: 'gte', value: 80 }], 1, 'A memory-support resident with 12 personalised sessions, their Choice score never below 80', 'memory'),
    ], [
      'Old photographs can open doors that seem closed.',
      'A personal story, told again and again, brings peace.',
      'Doing it their way matters as much as doing it at all.',
      'Nearly there: another walk down a well-loved road.',
    ], 'The Memory Lane program', [{ type: 'unlock', id: 'memoryLane' }]),
    rule('SEC-FAC-01', 'Centenarian Garden', 'facility', MONTH, [
      { fact: 'run.secretsFoundIds', op: 'has', value: 'SEC-RES-07', kind: 'fixed', category: 'residents', label: 'Century Club found' },
      { fact: 'run.score.residentWellbeing', op: 'gte', value: 90, kind: 'threshold', category: 'quality', label: 'Resident Wellbeing 90+' },
      { fact: 'run.programs', op: 'countOf', where: [{ field: 'id', op: 'eq', value: 'PRG01' }, { field: 'days', op: 'gte', value: YEAR }], value: 1, kind: 'fixed', category: 'programs', label: 'Gardening & Horticulture running for 12 months' },
    ], [
      'A remarkable birthday has people talking about a special garden.',
      'Long lives deserve a beautiful place to sit.',
      'A garden kept going season after season.',
      'Very close: the first stones are being laid.',
    ], 'The Centenarian Garden (F34) and the Centenarian Living program (PRG11)', [{ type: 'unlock', id: 'F34' }, { type: 'unlock', id: 'PRG11' }], {
      // (its rumours start with Century Club: that secret's reward is the Centenarian clue)
      clueGate: [{ fact: 'run.secretsFoundIds', op: 'has', value: 'SEC-RES-07', kind: 'fixed', category: 'residents', label: 'Century Club found (before any rumour)' }],
    }),
    {
      ...rule('SEC-FAC-02', 'Legacy House', 'facility', MONTH, [
        { fact: 'account.secretsFound', op: 'gte', value: 24, kind: 'count', category: 'recognition', label: 'Secrets found (every run)' },
        { fact: 'run.awards', op: 'has', value: 'C11', kind: 'fixed', category: 'recognition', label: 'C11 won' }, // (C11 is built in Milestone 31: never true until then)
        { fact: 'run.staff', op: 'countOf', where: [{ field: 'starting', op: 'eq', value: true }, { field: 'daysEmployed', op: 'gte', value: 16 * YEAR }], value: 1, kind: 'fixed', category: 'staff', label: 'A starting staff member still here through Year 16' },
      ], [
        'Homes with a long memory leave something behind.',
        'Every secret you uncover adds to the story.',
        'Someone who opened the doors with you is still here.',
        'Nearly there: a house worth leaving as a legacy.',
      ], 'Legacy House (F35)', [{ type: 'unlock', id: 'F35' }]),
      oncePerRun: undefined,
      oncePerAccount: true,
    },
    rule('SEC-PROG-01', 'Night Comfort Excellence', 'program', MONTH, [
      { fact: 'run.months', op: 'consecutive', where: [{ field: 'nightShifts', op: 'gte', value: 26 }, { field: 'nightSafePct', op: 'gte', value: 100 }], value: 24, kind: 'count', category: 'staffing', label: 'Night shifts every night, all at Safe Coverage', unit: 'months' },
      { fact: 'run.nightBellResponse', op: 'gte', value: 95, kind: 'threshold', category: 'staffing', label: 'Night call bells answered within ten minutes 95%+' },
    ], [
      'The quietest hours say the most about a home.',
      'A steady team through the night lets everyone sleep easy.',
      'When someone calls in the dark, someone comes quickly.',
      'Very close: the calmest nights anyone can remember.',
    ], 'The Prestige Night Comfort plan', [{ type: 'unlock', id: 'nightComfortPlan' }]),
    rule('SEC-PROG-02', 'Family Table', 'program', MONTH, [
      { fact: 'run.score.familyTrust', op: 'gte', value: 92, kind: 'threshold', category: 'family', label: 'Family Trust 92+' },
      { fact: 'run.diningSatisfaction', op: 'gte', value: 90, kind: 'threshold', category: 'nutrition', label: 'Dining satisfaction 90+' },
      { fact: 'run.familyDiningEvents', op: 'gte', value: 6, kind: 'count', category: 'family', label: 'Family dining events hosted' }, // (no system yet: never true)
    ], [
      'Families talk about the food as much as the care.',
      'A good meal is better shared.',
      'Inviting families to the table becomes a tradition.',
      'Nearly there: set a few more places.',
    ], 'The Family Table event series', [{ type: 'event', id: 'familyTable' }]),
    rule('SEC-PROG-03', 'Community Door', 'program', MONTH, [
      { fact: 'run.communityDoor', op: 'gte', value: 12, kind: 'count', category: 'community', label: 'Community sessions and outings on a day with no essential care missed' },
    ], [
      'Neighbours keep dropping by with a smile.',
      'The world outside is welcome here.',
      'Busy days out, with everyone at home still well cared for.',
      'Very close: the door is almost always open.',
    ], 'The Community Door program', [{ type: 'unlock', id: 'communityDoor' }], {
      forbids: [{ fact: 'run.essentialMissedMonth', op: 'gt', value: 0, kind: 'fixed', category: 'care', label: 'Essential care missed this month' }],
    }),
    rule('SEC-PROG-04', 'BOTWORKS Gentle Assist', 'program', ['partners:signed', 'secrets:month'], [
      { fact: 'run.partners', op: 'countOf', where: [{ field: 'id', op: 'eq', value: 'SPN08' }, { field: 'tier', op: 'gte', value: 3 }], value: 1, kind: 'fixed', category: 'partners', label: 'BOTWORKS Assistive Systems (SPN08) a Strategic partner' },
      { fact: 'run.pilotDone', op: 'eq', value: true, kind: 'fixed', category: 'partners', label: 'An assistive-tech pilot completed by a resident who said yes' },
    ], [
      'A technology partner is curious about how a caring home works.',
      'Helpful machines belong in the store room, not at the bedside.',
      'Residents who try something new because they want to.',
      'Nearly there: a long and trusting partnership.',
    ], 'Gentle-assist logistics tech', [{ type: 'unlock', id: 'gentleAssist' }], {
      forbids: [{ fact: 'run.personalAutomation', op: 'gt', value: 0, kind: 'fixed', category: 'partners', label: 'Automation used for personal care' }],
    }),
  ];
}
function staffSecrets() {
  const RANK_A = { fact: 'run.rank', op: 'gte', value: 4, kind: 'fixed', category: 'recognition', label: 'Rank A' };
  const RANK_B = { fact: 'run.rank', op: 'gte', value: 3, kind: 'fixed', category: 'recognition', label: 'Rank B (before any rumour)' };
  const YEAR = 336; // (12 months of 28 days)
  const months = (where, n, label, category = 'quality') => ({ fact: 'run.months', op: 'consecutive', where, value: n, kind: 'count', category, label, unit: 'months' });
  const residents = (where, n, label, category = 'residents') => ({ fact: 'run.residentList', op: 'countOf', where, value: n, kind: 'count', category, label });
  const program = (id, days, label) => ({ fact: 'run.programs', op: 'countOf', where: [{ field: 'id', op: 'eq', value: id }, { field: 'days', op: 'gte', value: days }], value: 1, kind: 'fixed', category: 'programs', label });
  const ever = (id, label) => ({ fact: 'run.programsEver', op: 'has', value: id, kind: 'fixed', category: 'programs', label });
  const arrival = (id, name) => [{ type: 'arrival', id, name }];
  // (Batch B: no rumour of a Legendary person until the home reaches Rank B — the clue gate, src/systems/secrets.js)
  const legend = (id, name, staffId, person, requiresAll, clues, forbids = []) => ({ id, name, category: 'staff', oncePerRun: true, triggerEvents: ['secrets:month'], requiresAll, forbids, clueGate: [RANK_B], clueStages: stages(clues), reward: `${person} arrives (a special arrival on the Recruit board)`, rewardActions: arrival(staffId, person) });
  // (Prestige: no Rank gate — New Game+ already holds their rumours back)
  const prestige = (id, name, staffId, person, ng, requiresAll, clues, forbids = []) => {
    const { oncePerRun, clueGate, ...r } = legend(id, name, staffId, person, requiresAll, clues, forbids);
    return { ...r, ngPlusMin: ng, oncePerAccount: true };
  };
  return [
    legend('SEC-STAFF-L1', 'The Golden Stethoscope', 'RN09', 'Dr. Celia Grace', [
      RANK_A,
      months([{ field: 'scores.clinicalSafety', op: 'gte', value: 92 }], 12, 'Clinical Safety 92+'),
      { fact: 'run.trainedStaff', op: 'countOf', where: [{ field: 'role', op: 'eq', value: 'RN' }], value: 5, kind: 'count', category: 'staff', label: 'Registered Nurses who finished a course' },
    ], [
      'A famous nurse is said to visit only the very best homes.',
      'She watches how carefully medicines and checks are handled, every day.',
      'She cares about nurses who keep learning.',
      'Nearly there: keep the clinical care steady, with nothing left waiting.',
    ], [{ fact: 'run.openMedAlerts', op: 'gt', value: 0, kind: 'fixed', category: 'clinical', label: 'A clinical alert left unresolved' }]),
    legend('SEC-STAFF-L2', 'The Heart of the Home', 'CW09', 'Joy Mercer', [
      RANK_A,
      { fact: 'run.familiarCare', op: 'gte', value: 85, kind: 'threshold', category: 'familiarity', label: 'Familiar Care average 85+' },
      { fact: 'run.staff', op: 'countOf', where: [{ field: 'starting', op: 'eq', value: true }, { field: 'role', op: 'eq', value: 'CW' }, { field: 'daysEmployed', op: 'gte', value: 8 * YEAR }], value: 1, kind: 'fixed', category: 'staff', label: 'One of the starting Care Workers still here after 8 years' },
      { fact: 'run.score.residentWellbeing', op: 'gte', value: 88, kind: 'threshold', category: 'quality', label: 'Resident Wellbeing 88+' },
    ], [
      'Carers talk of a home where every face is familiar.',
      'Loyalty matters: someone who was here at the start, still here.',
      'Residents who know their carers well are happier for it.',
      'Very close: the home already feels like a family.',
    ]),
    legend('SEC-STAFF-L3', 'The Joy Bringer', 'LC09', 'Cass Melody', [
      RANK_A,
      { fact: 'run.programsCompleted', op: 'gte', value: 8, kind: 'count', category: 'programs', label: 'Different programs run for a full month' },
      residents([{ field: 'mood', op: 'gte', value: 95 }], 5, 'Residents with Mood 95+'),
      { fact: 'run.community', op: 'gte', value: 85, kind: 'threshold', category: 'residents', label: 'Community (average Social Connection) 85+' },
    ], [
      'A lifestyle leader is looking for a home that is never dull.',
      'Variety is the secret: many kinds of program, each given a fair run.',
      'Some residents are as happy as they have ever been.',
      'Nearly there: the whole home feels connected.',
    ]),
    legend('SEC-STAFF-L4', 'The Golden Stride', 'AH09', 'Aurelia Step', [
      RANK_A,
      { fact: 'run.rehabDischarges', op: 'gte', value: 10, kind: 'count', category: 'residents', label: 'Successful rehab discharges' },
      program('PRG04', YEAR, 'The Falls Prevention Program running for 12 months'),
      { fact: 'run.mobilityOutcome', op: 'gte', value: 90, kind: 'threshold', category: 'residents', label: 'Mobility outcome (average Independence) 90+' },
    ], [
      'A renowned therapist follows the homes that send people home stronger.',
      'Many residents have gone home on their own feet.',
      'Steady balance classes, kept going for a long time, catch her eye.',
      'Very close: everyone here is moving with confidence.',
    ]),
    legend('SEC-STAFF-L5', 'The Golden Table', 'HN09', 'Mira Harvest', [
      RANK_A,
      months([{ field: 'nutrition', op: 'gte', value: 92 }], 12, 'Nutrition 92+'),
      residents([{ field: 'specialMenu', op: 'eq', value: true }, { field: 'daysHere', op: 'gte', value: 84 }], 6, 'Residents kept on a special menu the team can make, for 3 months or more', 'nutrition'),
      { fact: 'run.diningSatisfaction', op: 'gte', value: 90, kind: 'threshold', category: 'nutrition', label: 'Dining satisfaction 90+' },
    ], [
      'A celebrated cook is said to be looking for a new kitchen.',
      'Good food, every day, for a long time.',
      'Every special menu matched, and kept up.',
      'Nearly there: mealtimes are the best part of the day.',
    ]),
    prestige('SEC-STAFF-S1', 'The Night Guardian', 'RN10', 'Nora Nightingale', 2, [
      { fact: 'run.awards', op: 'has', value: 'C11', kind: 'fixed', category: 'recognition', label: 'C11 won' }, // (C11 is built in Milestone 31: never true until then)
      months([{ field: 'scores.clinicalSafety', op: 'gte', value: 96 }], 24, 'Clinical Safety 96+'),
      program('PRG10', 168, 'The Palliative Comfort Program running for 6 months'),
      residents([{ field: 'stay', op: 'eq', value: 'Palliative' }, { field: 'comfort', op: 'gte', value: 85 }], 1, 'A resident on a palliative stay with Comfort 85+', 'comfort'),
    ], [
      'Legend tells of a nurse who keeps watch through the quietest hours.',
      'Only a home recognised for its clinical excellence will do.',
      'Peace and company at the end of life matter most to her.',
      'Very close: the calmest, safest care she has seen.',
    ], [{ fact: 'run.eolNotWellSupported', op: 'gt', value: 0, kind: 'fixed', category: 'comfort', label: 'An end-of-life period not well supported' }]),
    prestige('SEC-STAFF-S2', 'Never Rushed', 'CW10', 'Otis Kind', 2, [
      residents([{ field: 'starting', op: 'eq', value: true }, { field: 'familiar90Days', op: 'gte', value: 5 * YEAR }], 1, 'A resident here since the opening with Familiar Care 90+ for 5 years', 'familiarity'),
      { fact: 'run.score.staffWellbeing', op: 'gte', value: 85, kind: 'threshold', category: 'quality', label: 'Staff Wellbeing 85+' },
    ], [
      'A gentle carer only joins homes where nobody is ever hurried.',
      'A resident from the very beginning, cared for by people who truly know them.',
      'A happy team is a patient team.',
      'Nearly there: the same kind faces, for a very long time.',
    ]),
    prestige('SEC-STAFF-S3', 'The Golden Afternoon', 'LC10', 'Sunny Day', 2, [
      { fact: 'account.storySecretsFound', op: 'gte', value: 6, kind: 'count', category: 'residents', label: 'Resident-story secrets found' },
      ever('PRG09', 'Intergenerational Visits run'),
      ever('PRG03', 'Pet Therapy Visits run'),
      ever('PRG02', 'Music & Memory run'),
      ever('PRG01', 'Gardening & Horticulture run'),
    ], [
      'Someone is collecting the stories of residents from every home.',
      'Children, animals, songs and a garden: an afternoon with everything.',
      'The more residents’ stories you uncover, the closer she comes.',
      'Very close: just a little more sunshine.',
    ]),
    prestige('SEC-STAFF-S4', 'The Perfect Path', 'AH10', 'Kestrel Move', 3, [
      { fact: 'run.rehabDischarges', op: 'gte', value: 20, kind: 'count', category: 'residents', label: 'Successful rehab / reablement discharges' },
      { fact: 'run.mobilityOutcome', op: 'gte', value: 95, kind: 'threshold', category: 'residents', label: 'Mobility outcome (average Independence) 95+' },
    ], [
      'A master of movement is watching homes where people do things for themselves.',
      'Everyone who can walk is helped to keep walking.',
      'So many residents have gone home stronger.',
      'Nearly there: every path here leads forward.',
    ], [{ fact: 'run.forcedDependence', op: 'gt', value: 0, kind: 'fixed', category: 'residents', label: 'A resident who could walk was kept on a wheelchair or transfer plan' }]),
    prestige('SEC-STAFF-S5', 'The Home Feast', 'HN10', 'Sage Spoon', 3, [
      months([{ field: 'nutrition', op: 'gte', value: 95 }, { field: 'scores.residentWellbeing', op: 'gte', value: 95 }], 12, 'Nutrition 95+ and Resident Wellbeing 95+ together'),
      residents([{ field: 'favouriteFood', op: 'eq', value: true }], 10, 'Residents on the Favourite-Food Boost', 'nutrition'),
    ], [
      'A legendary chef is said to cook only for the happiest tables.',
      'Favourite foods, for as many residents as love them.',
      'Wonderful meals and contented residents, side by side for a long time.',
      'Very close: the feast is nearly ready.',
    ]),
  ];
}
export const SECRET_IDS = SECRET_RULES.map((r) => r.id);

// Every player-facing word here, for the banned-word check.
export function secretStrings() {
  const out = [];
  for (const r of SECRET_RULES) out.push(r.name, r.reward, ...r.clueStages.map((s) => s.text), ...[...(r.requiresAll ?? []), ...(r.requiresAny ?? []), ...(r.forbids ?? [])].map((c) => c.label ?? ''));
  for (const t of Object.values(REWARD_TYPES)) out.push(t.text({ id: 'x', amount: 2 }));
  for (const g of [RECORDS, PALETTES, RECOGNITIONS, CELEBRATIONS, UNLOCKS]) for (const v of Object.values(g)) out.push(v.name, v.text ?? '');
  for (const f of Object.values(FACTS)) out.push(f.name);
  return out.filter(Boolean);
}
