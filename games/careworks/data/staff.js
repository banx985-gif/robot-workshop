// Staff (bible §12): all 50. Milestone 3: the ten Standard rows (RN01/02, CW01/02, LC01/02, AH01/02, HN01/02);
// Milestone 11: the twenty Rare rows (xx03–xx06); Milestone 12: the Elite (xx07–08), Legendary (xx09) and Secret (xx10)
// rows, every trait as data and the eligibility column as rules. Plain data only; validateStaff() runs the list through
// core/DataValidator (staffRoster: tier caps, trait slots, one signature for Legendary / Secret). Stats are
// CLN / PER / MOB / SOC / NUT; salary is Credits a month.
//   eligibility: the §12 column's kind — 'start' (Start staff) · 'candidate' (Start candidate) · 'rank' (Rank D) ·
//     'milestone' (Role milestone) · 'facility' (Rank B + specialist facility) · 'excellence' (Rank A + excellence
//     condition) · 'secret' (Secret SEC-STAFF-…)
//   rule: that column as data (RULES below; src/systems/staffing.js reads it). A recruitment channel only offers people
//     whose rule passes. Legendary / Secret rules never pass on a board: they arrive through the secret engine
//     (Milestones 29 / 30), never force-spawned.
//   shiftPref (Milestone 7, bible §11): the shift they prefer — 'morning' · 'afternoon' · 'night'
//   traits: ids in TRAITS. Legendary / Secret staff also carry their signature trait (the §12 trait column) after one
//     (Legendary) or two (Secret) ordinary ones from their role's Elite traits, so their tier's trait slots are used.
import { ROLES, STAT_IDS, TIERS } from './roles.js';
import { ROLE_LIKES } from './items.js';
import { ROLE_MILESTONES, scoreById } from './quality.js'; // (Milestone 26: a role milestone reads its headline score)

const stats = (s) => Object.fromEntries(s.split('/').map((v, i) => [STAT_IDS[i], Number(v)]));

// --- eligibility rules (bible §12 column) ---------------------------------------------------------------------------
// type: start / candidate (always), rank (the home's Rank), milestone (a role milestone: its system is Milestone 26's;
// until then it stands in as Rank D, the tier's own gate), facility (Rank + a built specialist facility), excellence
// (Rank + a headline quality score: the scores are Milestone 26's, so it can't pass yet), secret (never on a board).
// ?debug=1 "Unlock Elite staff" counts as passing facility / excellence; nothing unlocks secret.
export const RULES = {
  start: () => ({ type: 'start', text: 'Start staff' }),
  candidate: () => ({ type: 'candidate', text: 'Start candidate' }),
  rank: (rank) => ({ type: 'rank', rank, text: `Rank ${rank}` }),
  // (Milestone 26: Rank D and the role's own headline score held at the line — data/quality.js ROLE_MILESTONES)
  milestone: (role) => ({ type: 'milestone', role, rank: 'D', score: ROLE_MILESTONES[role].score, min: ROLE_MILESTONES[role].min, text: `Rank D + ${scoreById(ROLE_MILESTONES[role].score).name} ${ROLE_MILESTONES[role].min}+ (a ${ROLES[role].short.toLowerCase()} role milestone)` }),
  facility: (rank, facility, name) => ({ type: 'facility', rank, facility, text: `Rank ${rank} + a ${name}` }),
  excellence: (rank, score, min, name) => ({ type: 'excellence', rank, score, min, text: `Rank ${rank} + ${name} ${min}+` }),
  secret: (secret) => ({ type: 'secret', secret, text: 'Arrives by itself when the home earns it' }),
};
export const RULE_TYPES = ['start', 'candidate', 'rank', 'milestone', 'facility', 'excellence', 'secret'];

const row = (id, name, role, tier, level, s, salary, traits, rule, shiftPref) => ({ id, name, role, tier, level, stats: stats(s), salary, traits: Array.isArray(traits) ? traits : [traits], eligibility: rule.type, rule, shiftPref, art: `staff_${id.toLowerCase()}` });
const std = (id, name, role, level, s, salary, trait, elig, shiftPref) => row(id, name, role, 'standard', level, s, salary, trait, RULES[elig](), shiftPref);
const rare = (id, name, role, level, s, salary, trait, elig, shiftPref) => row(id, name, role, 'rare', level, s, salary, trait, elig === 'rank' ? RULES.rank('D') : RULES.milestone(role), shiftPref);
const elite = (id, name, role, level, s, salary, trait, rule, shiftPref) => row(id, name, role, 'elite', level, s, salary, trait, rule, shiftPref);

// The Elite rows' conditions (the §12 column names the kind; which facility / score is Claude Code's call, logged in
// docs/DECISIONS.md). Facilities are data/facilities.js ids; scores are the five §5 headline scores.
const FAC = {
  RN: RULES.facility('B', 'F23', 'Clinical Treatment Room'),
  CW: RULES.facility('B', 'F12', 'Hair & Grooming Salon'),
  LC: RULES.facility('B', 'F25', 'Community Day Room'),
  AH: RULES.facility('B', 'F18', 'Rehabilitation Gym'),
  HN: RULES.facility('B', 'F16', 'Commercial Kitchen'),
};
const EXC = {
  RN: RULES.excellence('A', 'clinicalSafety', 90, 'Clinical Safety'),
  CW: RULES.excellence('A', 'residentWellbeing', 90, 'Resident Wellbeing'),
  LC: RULES.excellence('A', 'familyTrust', 90, 'Family Trust'),
  AH: RULES.excellence('A', 'clinicalSafety', 88, 'Clinical Safety'),
  HN: RULES.excellence('A', 'residentWellbeing', 88, 'Resident Wellbeing'),
};
// The five headline quality scores (bible §5) an excellence rule may name.
export const QUALITY_SCORES = { clinicalSafety: 'Clinical Safety', residentWellbeing: 'Resident Wellbeing', familyTrust: 'Family Trust', staffWellbeing: 'Staff Wellbeing', environment: 'Environment & Compliance' };

export const STAFF = [
  std('RN01', 'Maya Finch', 'RN', 1, '105/57/64/71/78', 520, 'calmRound', 'start', 'morning'),
  std('RN02', 'Daniel Cross', 'RN', 2, '118/70/77/53/60', 560, 'carefulChart', 'candidate', 'night'),
  std('CW01', 'Ruby Hale', 'CW', 1, '59/121/73/80/56', 520, 'gentleHands', 'start', 'morning'),
  std('CW02', 'Arun Moss', 'CW', 2, '72/134/55/62/69', 560, 'morningPerson', 'candidate', 'morning'),
  std('LC01', 'Zoe Quinn', 'LC', 1, '68/75/51/113/65', 520, 'conversationStarter', 'start', 'afternoon'),
  std('LC02', 'Oscar Bell', 'LC', 2, '50/57/64/126/78', 560, 'creativeClub', 'candidate', 'afternoon'),
  std('AH01', 'Nia Foster', 'AH', 1, '77/53/115/67/74', 520, 'steadySteps', 'start', 'morning'),
  std('AH02', 'Hugo Pike', 'AH', 2, '59/66/128/80/56', 560, 'safeTransfers', 'candidate', 'afternoon'),
  std('HN01', 'Sam Kitchen', 'HN', 1, '55/62/69/76/107', 520, 'warmWelcome', 'start', 'morning'),
  std('HN02', 'Noor Price', 'HN', 2, '68/75/51/58/120', 560, 'hydrationEye', 'candidate', 'night'),
  // Milestone 11: the Rare rows
  rare('RN03', 'Priya Vale', 'RN', 4, '194/115/122/129/136', 1020, 'skinWise', 'rank', 'morning'),
  rare('RN04', 'Noah Mercer', 'RN', 6, '176/128/135/142/118', 1080, 'sugarWatch', 'milestone', 'afternoon'),
  rare('RN05', 'Hana Reed', 'RN', 8, '189/141/117/124/131', 1140, 'familyCommunicator', 'milestone', 'afternoon'),
  rare('RN06', 'Elise Hart', 'RN', 10, '171/123/130/137/113', 1200, 'medicationFocus', 'milestone', 'night'),
  rare('CW03', 'Tessa Cole', 'CW', 4, '117/179/131/138/114', 1020, 'dignityFirst', 'rank', 'morning'),
  rare('CW04', 'Milo Grant', 'CW', 6, '130/192/113/120/127', 1080, 'fastResponse', 'milestone', 'night'),
  rare('CW05', 'Leila Park', 'CW', 8, '143/174/126/133/140', 1140, 'memoryFriendly', 'milestone', 'afternoon'),
  rare('CW06', 'Ben Rowan', 'CW', 10, '125/187/139/115/122', 1200, 'companion', 'milestone', 'morning'),
  rare('LC03', 'Mei Hart', 'LC', 4, '126/133/140/171/123', 1020, 'gardenLover', 'rank', 'morning'),
  rare('LC04', 'Theo Vale', 'LC', 6, '139/115/122/184/136', 1080, 'musicMaker', 'milestone', 'afternoon'),
  rare('LC05', 'Imani Reed', 'LC', 8, '121/128/135/197/118', 1140, 'communityLink', 'milestone', 'afternoon'),
  rare('LC06', 'Eli Bloom', 'LC', 10, '134/141/117/179/131', 1200, 'quietConnector', 'milestone', 'morning'),
  rare('AH03', 'Freya Lane', 'AH', 4, '135/142/173/125/132', 1020, 'balanceCoach', 'rank', 'morning'),
  rare('AH04', 'Joel Nash', 'AH', 6, '117/124/186/138/114', 1080, 'rehabPlanner', 'milestone', 'morning'),
  rare('AH05', 'Mina Stone', 'AH', 8, '130/137/168/120/127', 1140, 'fallsWatch', 'milestone', 'afternoon'),
  rare('AH06', 'Soren Ward', 'AH', 10, '143/119/181/133/140', 1200, 'independenceFirst', 'milestone', 'afternoon'),
  rare('HN03', 'Kira Wells', 'HN', 4, '113/120/127/134/196', 1020, 'comfortFood', 'rank', 'morning'),
  rare('HN04', 'Leo March', 'HN', 6, '126/133/140/116/178', 1080, 'textureExpert', 'milestone', 'afternoon'),
  rare('HN05', 'Zara Bloom', 'HN', 8, '139/115/122/129/191', 1140, 'dietMatch', 'milestone', 'morning'),
  rare('HN06', 'Dorian Cole', 'HN', 10, '121/128/135/142/173', 1200, 'diningHost', 'milestone', 'night'),
  // Milestone 12: the Elite rows (Rank B + specialist facility; Rank A + excellence condition)
  elite('RN07', 'Rafi Stone', 'RN', 14, '324/246/253/229/236', 2200, 'clinicalMentor', FAC.RN, 'morning'),
  elite('RN08', 'Keira Bell', 'RN', 17, '337/228/235/242/249', 2280, 'complexCareLead', EXC.RN, 'afternoon'),
  elite('CW07', 'Amaya Lane', 'CW', 14, '248/309/231/238/245', 2200, 'trustedCarer', FAC.CW, 'morning'),
  elite('CW08', 'Finn West', 'CW', 17, '230/322/244/251/227', 2280, 'familiarFace', EXC.CW, 'afternoon'),
  elite('LC07', 'Talia Song', 'LC', 14, '226/233/240/332/223', 2200, 'eventLeader', FAC.LC, 'afternoon'),
  elite('LC08', 'Luca Wynn', 'LC', 17, '239/246/253/314/236', 2280, 'memoryMaker', EXC.LC, 'afternoon'),
  elite('AH07', 'Ren Ito', 'AH', 14, '235/242/334/225/232', 2200, 'mobilityMentor', FAC.AH, 'morning'),
  elite('AH08', 'Selene Cross', 'AH', 17, '248/224/316/238/245', 2280, 'reablementLead', EXC.AH, 'morning'),
  elite('HN07', 'Eva Hearth', 'HN', 14, '244/251/227/234/326', 2200, 'kitchenMentor', FAC.HN, 'morning'),
  elite('HN08', 'Cassian Reed', 'HN', 17, '226/233/240/247/308', 2280, 'nutritionLead', EXC.HN, 'afternoon'),
  // Milestone 12: the Legendary (SEC-STAFF-L1–L5) and Secret / Prestige (SEC-STAFF-S1–S5) rows — condition-driven
  // arrivals only (bible §12, §36): never on a board, never force-spawned
  row('RN09', 'Dr. Celia Grace', 'RN', 'legendary', 21, '416/338/345/321/328', 4200, ['clinicalMentor', 'goldenStethoscope'], RULES.secret('SEC-STAFF-L1'), 'morning'),
  row('RN10', 'Nora Nightingale', 'RN', 'secret', 24, '529/420/427/434/441', 5900, ['clinicalMentor', 'complexCareLead', 'nightGuardian'], RULES.secret('SEC-STAFF-S1'), 'night'),
  row('CW09', 'Joy Mercer', 'CW', 'legendary', 21, '340/432/323/330/337', 4200, ['trustedCarer', 'heartOfTheHome'], RULES.secret('SEC-STAFF-L2'), 'morning'),
  row('CW10', 'Otis Kind', 'CW', 'secret', 24, '422/514/436/443/450', 5900, ['trustedCarer', 'familiarFace', 'neverRushed'], RULES.secret('SEC-STAFF-S2'), 'night'),
  row('LC09', 'Cass Melody', 'LC', 'legendary', 21, '349/325/332/424/346', 4200, ['eventLeader', 'joyBringer'], RULES.secret('SEC-STAFF-L3'), 'afternoon'),
  row('LC10', 'Sunny Day', 'LC', 'secret', 24, '431/438/445/506/428', 5900, ['eventLeader', 'memoryMaker', 'goldenAfternoon'], RULES.secret('SEC-STAFF-S3'), 'afternoon'),
  row('AH09', 'Aurelia Step', 'AH', 'legendary', 21, '327/334/426/348/324', 4200, ['mobilityMentor', 'goldenStride'], RULES.secret('SEC-STAFF-L4'), 'morning'),
  row('AH10', 'Kestrel Move', 'AH', 'secret', 24, '440/447/508/430/437', 5900, ['mobilityMentor', 'reablementLead', 'perfectPath'], RULES.secret('SEC-STAFF-S4'), 'afternoon'),
  row('HN09', 'Mira Harvest', 'HN', 'legendary', 21, '336/343/350/326/418', 4200, ['kitchenMentor', 'goldenTable'], RULES.secret('SEC-STAFF-L5'), 'morning'),
  row('HN10', 'Sage Spoon', 'HN', 'secret', 24, '449/425/432/439/531', 5900, ['kitchenMentor', 'nutritionLead', 'homeFeast'], RULES.secret('SEC-STAFF-S5'), 'afternoon'),
];
// --- Milestone 30b: the Works Gods (SERIES_WORKS_GODS.md, docs/M30b_WORKS_GODS.md) -----------------------------------------
// Five Divine staff above Secret / Prestige. Never on a board, never bought: each arrives through their own secret
// (data/secrets.js SEC-GOD-1…5) as a special card on the Recruit board. Their ids follow the role (the game reads a staff
// id's role from its first two letters); `god` names them; their art is assets/images/staff/staff_god_<god>.png. Three
// ordinary traits from their role, then their blessing (a live signature, BLESSINGS below). Kept out of STAFF (the §12 50).
const god = (id, god, name, role, s, traits, secret, shiftPref) => ({ ...row(id, name, role, 'divine', 1, s, BLESSING_SALARY, traits, RULES.secret(secret), shiftPref), god, art: `staff_god_${god}` });
const BLESSING_SALARY = 6500; // (a little above the Secret staff's 5,900)
export const GODS = [
  god('AH11', 'bolt', 'Bolt, God of Tinkering', 'AH', '452/446/568/440/458', ['mobilityMentor', 'reablementLead', 'safeTransfers', 'blessingTinkering'], 'SEC-GOD-1', 'morning'),
  god('LC11', 'jinx', 'Jinx, Goddess of Luck', 'LC', '441/455/448/566/450', ['eventLeader', 'memoryMaker', 'communityLink', 'blessingLuck'], 'SEC-GOD-2', 'afternoon'),
  god('RN11', 'zip', 'Zip, God of Speed', 'RN', '570/458/452/444/446', ['clinicalMentor', 'complexCareLead', 'medicationFocus', 'blessingSpeed'], 'SEC-GOD-3', 'morning'),
  god('HN11', 'kaching', 'Kaching, God of Fortune', 'HN', '446/452/440/458/566', ['kitchenMentor', 'nutritionLead', 'diningHost', 'blessingFortune'], 'SEC-GOD-4', 'afternoon'),
  god('LC12', 'havoc', 'Havoc, God of Chaos', 'LC', '448/440/456/572/444', ['eventLeader', 'creativeClub', 'musicMaker', 'blessingChaos'], 'SEC-GOD-5', 'afternoon'),
];
export const GOD_IDS = GODS.map((g) => g.id);
export const godOf = (id) => GODS.find((g) => g.id === id || g.god === id) ?? null;
// The blessings' numbers (Cowork's starting picks, tuned in M30b: docs/DECISIONS.md). src/systems/blessings.js reads them.
//   bolt     while on the team: facility builds, level-ups and stage builds cost buildCostPct% less and level-ups / stages
//            take buildDaysPct% fewer days; Environment & Compliance +environment
//   jinx     while on the team: the good surprises (a family's thank-you gift, a well-wisher, a family birthday party
//            asked for) come surprisePct% more often; a program session while she is on shift: luckyChance of a lucky
//            day, Mood +luckyMood for everyone there
//   zip      his tasks take taskTimePct% less time (the same care, the same checks); while he is on shift, call bells
//            are answered first (bellFirst on the task AI's score)
//   kaching  while on the team: partner support and grant goals pay partnerPct% more; accommodation fees feePct% more.
//            Never touches care spending (wages, supplies, equipment, agency)
//   havoc    each program session, community event or birthday tea while he is on shift: joyChance of a big joy boost
//            (Mood +joyMood, Social Connection +joyConnection for everyone there), else a harmless mishap (MISHAPS: a
//            small clean-up cost in Credits, or a funny line) — never anything to do with care, safety or health
export const BLESSINGS = {
  bolt: { buildCostPct: 15, buildDaysPct: 50, environment: 5 },
  jinx: { surprisePct: 50, luckyChance: 0.15, luckyMood: 6 },
  zip: { taskTimePct: 20, bellFirst: 1000 },
  kaching: { partnerPct: 15, feePct: 10 },
  havoc: { joyChance: 0.7, joyMood: 12, joyConnection: 8 },
};
export const MISHAPS = [
  { id: 'cake', text: 'The cake fell over', cost: 120 },
  { id: 'streamers', text: 'Streamers everywhere', cost: 80 },
  { id: 'confetti', text: 'Confetti in the teapot', cost: 60 },
  { id: 'late', text: 'It started a little late: someone hid the music', cost: 0 },
];
export const ALL_STAFF = [...STAFF, ...GODS];
export const staffById = (id) => ALL_STAFF.find((s) => s.id === id) ?? null;
// The trait the §12 table names for this person (a Legendary / Secret person's signature, else their first).
export const namedTrait = (def) => def.traits.find((t) => TRAITS[t]?.signature) ?? def.traits[0];

// --- traits ----------------------------------------------------------------------------------------------------------
// Every trait §12 names: name, one plain line, and either
//   live: [effect]   small effects on hooks the game already has (src/systems/traitEffects.js reads them):
//     { kind: 'task', types: [task type], pct }   tasks of these types ease the resident's needs pct% more when they help
//     { kind: 'match', types: [task type] }       a specialty-like tip in the task AI on these task types (SPECIALTY_SCORE)
//     { kind: 'energy', pct, shift? }             Energy used on shift changes by pct% (only on that shift, if given)
//     { kind: 'morale', perHour }                 Morale drifts up this much an hour while they work
//     { kind: 'familiar', pct }                   Familiar Care builds pct% faster with them
//     { kind: 'shift', pct }                      their preferred shift lifts Morale pct% more
//     { kind: 'diet', diets: [diet id], pct }     Milestone 15: they can make these special menus (data/dining.js DIETS),
//                                                 and a resident on one of them is pct% more satisfied when they cook it
//     { kind: 'memory', pct }                     Milestone 17: life-story sessions and calm with a memory-support
//                                                 resident go pct% further, and they never count as a "new face"
//     { kind: 'clinical', pct }                   Milestone 18: complex residents weigh pct% less on their medicine-round
//                                                 safety, and their assessments and senior reviews resolve pct% more
//     { kind: 'rehab', pct, goals? }              Milestone 16: rehab goals move pct% more in sessions they lead (only
//                                                 these goals, if given)
//     { kind: 'family', pct }                     Milestone 19: a visit's good parts go pct% further while they are on
//                                                 shift, and a family meeting they attend lifts Family Trust pct% more
//     { kind: 'activity', activities, events?, pct, outcomes? }   Milestone 20: sessions of these activities (or any
//                                                 community event) lift pct% more while they are on shift (only these
//                                                 outcomes, if given)
//     { kind: 'dining', pct }                     Milestone 15: meals they serve lift Social Connection pct% more, and
//                                                 dining satisfaction a little (data/dining.js SATISFACTION.host)
//   or pendingSystem: 'Mnn'  the effect needs a system built in that milestone: stored and shown, a no-op until then
//     (effects keeps its placeholder numbers for that milestone).
// signature (Legendary / Secret): { hook, params } in the core/StaffSystem signature format; every signature is
// pending (no hook is registered, so it does nothing) until its milestone switches it on.
const live = (name, text, ...fx) => ({ name, text, live: fx });
const later = (name, text, pendingSystem, effects = {}) => ({ name, text, pendingSystem, effects });
const sig = (name, text, pendingSystem, hook, params) => ({ name, text, pendingSystem, signature: { hook, params } });
// (Milestone 30b) a Works God's blessing: a signature that is live from the day they join (no hook in core/StaffSystem;
// src/systems/blessings.js reads the god's BLESSINGS numbers where each one lands)
const blessing = (godKey, name, text) => ({ name, text, live: [], blessing: godKey, signature: { hook: `blessing:${godKey}`, params: {} } });
const task = (types, pct) => ({ kind: 'task', types, pct });
const match = (types) => ({ kind: 'match', types });

export const TRAITS = {
  // Standard (Milestone 3 lines)
  calmRound: live('Calm Round', 'Medicine rounds go a little further', task(['meds'], 5)),
  carefulChart: live('Careful Chart', 'Health checks are a little more thorough', task(['observation'], 5)),
  gentleHands: live('Gentle Hands', 'Personal care is a little more comfortable', task(['personal'], 5)),
  morningPerson: live('Morning Person', 'Tires more slowly on the Morning shift', { kind: 'energy', pct: -10, shift: 'morning' }),
  conversationStarter: live('Conversation Starter', 'Activities go a little further', task(['activity'], 5)),
  creativeClub: live('Creative Club', 'Group activities go further', task(['activity'], 8)),
  steadySteps: live('Steady Steps', 'Walking support goes a little further', task(['mobility'], 5)),
  safeTransfers: live('Safe Transfers', 'Keen to help with moving and walking', match(['mobility', 'wake'])),
  warmWelcome: live('Warm Welcome', 'Meals feel more welcoming', task(['meal'], 5)),
  hydrationEye: live('Hydration Eye', 'Spots when a resident needs a drink', task(['hydration'], 8), match(['hydration'])),
  // Rare (Milestone 11 lines)
  skinWise: live('Skin Wise', 'Skin and health checks are more thorough', task(['observation'], 8)),
  sugarWatch: live('Sugar Watch', 'Keeps a closer eye at health checks and meals', task(['observation', 'meal'], 8)), // (Milestone 18: live)
  familyCommunicator: live('Family Communicator', 'Families feel better informed: visits and family meetings go 6% better', { kind: 'family', pct: 6 }), // (Milestone 19: live)
  medicationFocus: live('Medication Focus', 'Medicine rounds go further', task(['meds'], 8)),
  dignityFirst: live('Dignity First', 'Personal care keeps dignity and choice', task(['personal'], 8)),
  fastResponse: later('Fast Response', 'Answers call bells a little faster', 'M25', { bellResponsePct: -10 }),
  memoryFriendly: live('Memory Friendly', 'Calmer support for residents with memory needs: never a new face to them', { kind: 'memory', pct: 8 }), // (Milestone 17)
  companion: live('Companion', 'One-to-one time goes further', task(['visit'], 8)),
  // (Milestone 20: the lifestyle-programme traits M12 / M14 left waiting are live — kind 'activity', while they are on shift)
  gardenLover: live('Garden Lover', 'Gardening sessions go 10% further while they are on shift', { kind: 'activity', activities: ['gardening'], pct: 10 }),
  musicMaker: live('Music Maker', 'Music sessions lift Social Connection 10% more while they are on shift', { kind: 'activity', activities: ['music'], pct: 10, outcomes: ['connection'] }),
  communityLink: live('Community Link', 'Visitors and volunteers: community sessions go 8% further while they are on shift', { kind: 'activity', activities: ['petTherapy', 'communityVisit'], events: true, pct: 8 }),
  quietConnector: live('Quiet Connector', 'Reaches the residents who keep to themselves', match(['visit'])),
  balanceCoach: live('Balance Coach', 'Walking practice builds confidence', task(['mobility'], 8)),
  rehabPlanner: live('Rehab Planner', 'Rehab goals move a little faster in their sessions', { kind: 'rehab', pct: 8 }), // (Milestone 16)
  fallsWatch: live('Falls Watch', 'Spots a fall risk early: keen on room checks and walks', match(['roomCheck', 'mobility'])),
  independenceFirst: live('Independence First', 'Helps residents do more for themselves: transfers and daily living', { kind: 'rehab', pct: 12, goals: ['transfer', 'dailyLiving'] }),
  comfortFood: live('Comfort Food', 'Meals go further', task(['meal'], 8)),
  // (Milestone 15: the dining traits are live — src/systems/dining.js)
  textureExpert: live('Texture Expert', 'Can make the soft menu, and soft meals are nicer', { kind: 'diet', diets: ['texture'], pct: 10 }),
  dietMatch: live('Diet Match', 'Can make every special menu, and matches it with care', { kind: 'diet', diets: ['lowSugar', 'texture', 'smallFrequent', 'highProtein'], pct: 8 }),
  diningHost: live('Dining Host', 'Mealtimes are more sociable when they serve', { kind: 'dining', pct: 8 }),
  // Elite (Milestone 12)
  clinicalMentor: live('Clinical Mentor', 'A steady hand: rounds and checks go further, and Morale holds up', task(['meds', 'observation'], 10), { kind: 'morale', perHour: 0.2 }),
  complexCareLead: live('Complex Care Lead', 'Leads care for residents with complex clinical needs: safer rounds and better assessments', { kind: 'clinical', pct: 12 }), // (Milestone 18: live)
  trustedCarer: live('Trusted Carer', 'Wake-ups, personal care and settling go further', task(['wake', 'personal', 'settle'], 10)),
  familiarFace: live('Familiar Face', 'Residents get to know them twice as fast', { kind: 'familiar', pct: 100 }),
  eventLeader: live('Event Leader', 'Leads activities: they go further and they seek them out', task(['activity'], 12), match(['activity'])),
  memoryMaker: live('Memory Maker', 'Life-story and memory sessions go further', { kind: 'memory', pct: 12 }),
  mobilityMentor: live('Mobility Mentor', 'Mobility support goes much further', task(['mobility'], 12)),
  reablementLead: live('Reablement Lead', 'Rehab goals move faster in their sessions: home sooner', { kind: 'rehab', pct: 12 }),
  kitchenMentor: live('Kitchen Mentor', 'Meals and drinks go further', task(['meal', 'hydration'], 10)),
  nutritionLead: live('Nutrition Lead', 'Can make every special menu; diet plans and reviews go further', { kind: 'diet', diets: ['lowSugar', 'texture', 'smallFrequent', 'highProtein'], pct: 12 }, task(['hydration'], 5)),
  // Legendary signatures (SEC-STAFF-L1–L5)
  goldenStethoscope: sig('Golden Stethoscope', 'Clinical care across the home is safer while she is on shift', 'M18', 'goldenStethoscope', { clinicalSafetyPct: 10 }),
  heartOfTheHome: sig('Heart of the Home', 'Familiar Care lifts Mood across the home', 'M13', 'heartOfTheHome', { familiarMoodPct: 15 }),
  joyBringer: sig('Joy Bringer', 'Every activity she runs lifts the whole lounge', 'M14', 'joyBringer', { activityMoodPct: 15 }),
  goldenStride: sig('Golden Stride', 'Rehabilitation residents go home stronger', 'M16', 'goldenStride', { rehabOutcomePct: 15 }),
  goldenTable: sig('Golden Table', 'Every meal is a favourite meal', 'M15', 'goldenTable', { mealMoodPct: 15 }),
  // Secret / Prestige signatures (SEC-STAFF-S1–S5)
  nightGuardian: sig('Night Guardian', 'Nights are calm and safe while she is on shift', 'M25', 'nightGuardian', { nightIncidentPct: -50 }),
  neverRushed: sig('Never Rushed', 'Care is never hurried: familiarity never fades', 'M13', 'neverRushed', { familiarDecayPct: -100 }),
  goldenAfternoon: sig('Golden Afternoon', 'Afternoons become the best part of the day', 'M14', 'goldenAfternoon', { afternoonMoodPct: 20 }),
  perfectPath: sig('Perfect Path', 'Every resident walks a little further', 'M16', 'perfectPath', { independencePct: 20 }),
  homeFeast: sig('Home Feast', 'A monthly feast lifts the whole home', 'M15', 'homeFeast', { feastMood: 10 }),
  // (Milestone 30b) the Works Gods' blessings: live signatures (src/systems/blessings.js), their numbers in BLESSINGS
  blessingTinkering: blessing('bolt', 'Blessing of Tinkering', 'Builds and upgrades cost 15% less and level-ups finish twice as fast; Environment & Compliance +5 while he is on the team'),
  blessingLuck: blessing('jinx', 'Blessing of Luck', 'Good surprises (thank-you gifts, well-wishers, family birthday parties) come 50% more often; a program session on her shift may become a lucky day: Mood +6 for everyone there'),
  blessingSpeed: blessing('zip', 'Blessing of Speed', 'His tasks take 20% less time with the same care and checks; call bells are answered first while he is on shift'),
  blessingFortune: blessing('kaching', 'Blessing of Fortune', 'Partner support and grants pay 15% more and accommodation fees bring 10% more; care spending is never touched'),
  blessingChaos: blessing('havoc', 'Blessing of Chaos', 'Every program, community event or birthday tea on his shift: usually a big joy boost for everyone there, sometimes a harmless funny mishap (a small clean-up cost). Never a care, safety or health setback'),
};
export const TRAIT_KINDS = ['task', 'match', 'energy', 'morale', 'familiar', 'shift', 'diet', 'dining', 'rehab', 'memory', 'clinical', 'family', 'activity'];

// Check the list (debug builds at start-up, and the Node tests). v = a core/DataValidator; taskTypes = data/tasks.js
// TASK_TYPES ids (optional: the trait task checks).
export function validateStaff(v, list = ALL_STAFF, { taskTypes = null } = {}) {
  v.staffRoster('staff', list, { roles: ROLES, tiers: TIERS, traits: TRAITS, statKeys: STAT_IDS });
  for (const s of list) {
    const who = `staff ${s.id}`;
    v.check(/^(RN|CW|LC|AH|HN)\d{2}$/.test(s.id) && s.id.startsWith(s.role), `${who}: id must be <role>nn`);
    v.check(Number.isInteger(s.level) && s.level >= 1, `${who}: level`);
    v.check(Number.isInteger(s.salary) && s.salary > 0, `${who}: salary`);
    v.check(RULE_TYPES.includes(s.eligibility) && s.rule?.type === s.eligibility && !!s.rule.text, `${who}: eligibility "${s.eligibility}"`);
    const tierRules = { standard: ['start', 'candidate'], rare: ['rank', 'milestone'], elite: ['facility', 'excellence'], legendary: ['secret'], secret: ['secret'], divine: ['secret'] };
    v.check(tierRules[s.tier]?.includes(s.eligibility), `${who}: tier ${s.tier} with eligibility ${s.eligibility}`);
    if (s.rule?.rank) v.check(['E', 'D', 'C', 'B', 'A', 'S'].includes(s.rule.rank), `${who}: rule rank ${s.rule.rank}`);
    if (s.eligibility === 'excellence') v.check(!!QUALITY_SCORES[s.rule.score] && s.rule.min > 0 && s.rule.min <= 100, `${who}: excellence score`);
    if (s.eligibility === 'secret' && s.tier === 'divine') v.check(/^SEC-GOD-[1-5]$/.test(s.rule.secret) && !!BLESSINGS[s.god] && s.traits.some((t) => TRAITS[t]?.blessing === s.god), `${who}: a Works God needs SEC-GOD-n and their own blessing`);
    else if (s.eligibility === 'secret') v.check(/^SEC-STAFF-[LS][1-5]$/.test(s.rule.secret) && s.rule.secret[10] === (s.tier === 'legendary' ? 'L' : 'S'), `${who}: secret id ${s.rule.secret}`);
    v.check(s.art === artKeyOf(s), `${who}: art key`);
    v.check(['morning', 'afternoon', 'night'].includes(s.shiftPref), `${who}: shift preference "${s.shiftPref}"`);
    // the role's primary stat is their best
    const best = STAT_IDS.reduce((a, k) => (s.stats[k] > s.stats[a] ? k : a), STAT_IDS[0]);
    v.check(best === ROLES[s.role]?.primaryStat, `${who}: primary stat is not their highest`);
  }
  for (const [id, t] of Object.entries(TRAITS)) {
    const who = `trait ${id}`;
    v.check(!!t.name && !!t.text, `${who}: name and line`);
    v.check(!!t.live !== !!t.pendingSystem, `${who}: live effects or pendingSystem (one of them)`);
    if (t.pendingSystem) v.check(/^M\d+$/.test(t.pendingSystem) && Number(t.pendingSystem.slice(1)) > 12, `${who}: pendingSystem "${t.pendingSystem}"`);
    if (t.signature && !t.blessing) v.check(!!t.pendingSystem && !!t.signature.hook, `${who}: a signature is stored and pending`);
    if (t.blessing) v.check(!!BLESSINGS[t.blessing] && !!t.signature?.hook, `${who}: a blessing names its god`); // (Milestone 30b: live)
    for (const fx of t.live ?? []) {
      v.check(TRAIT_KINDS.includes(fx.kind), `${who}: effect kind "${fx.kind}"`);
      if (fx.types && taskTypes) for (const ty of fx.types) v.check(taskTypes.includes(ty), `${who}: task type "${ty}"`);
      if (fx.kind === 'task') v.check(fx.pct > 0 && fx.pct <= 15, `${who}: a small task bonus`);
      if (fx.kind === 'activity') v.check(fx.pct > 0 && fx.pct <= 15 && (fx.activities?.length || fx.events), `${who}: a small activity bonus`);
      if (fx.shift) v.check(['morning', 'afternoon', 'night'].includes(fx.shift), `${who}: shift "${fx.shift}"`);
    }
  }
  // every trait is someone's (§12 names them all), and every §12 trait column is one of them
  const used = new Set([...list, ...GODS].flatMap((s) => s.traits));
  for (const id of Object.keys(TRAITS)) v.check(used.has(id), `trait ${id}: nobody has it`);
  return v;
}
// A person's portrait key: staff_<id>, or (Milestone 30b) staff_god_<god> for a Works God.
const artKeyOf = (s) => (s.tier === 'divine' ? `staff_god_${s.god}` : `staff_${s.id.toLowerCase()}`);

// Art mapping (Milestone 12): every staff id → its portrait file, every role → its badge file, and no two staff share
// a portrait. The M7 agency workers reuse the Start candidates' portraits (staff_rn02 / staff_cw02) on purpose and are
// tagged AGENCY, so they are left out of the "no two share" check. exists(relPath) → boolean (a file check in Node, an
// AssetManager lookup in the browser). Returns { problems: [text], checked: { portraits, badges, agency } }.
export function checkStaffArt(exists, { list = ALL_STAFF, agency = {} } = {}) {
  const problems = [];
  const path = (key) => `assets/images/staff/${key}.png`;
  const seen = new Map();
  for (const s of list) {
    if (s.art !== artKeyOf(s)) problems.push(`${s.id}: art key ${s.art}`);
    if (!exists(path(s.art))) problems.push(`${s.id}: missing ${path(s.art)}`);
    if (seen.has(s.art)) problems.push(`${s.id} shares ${s.art} with ${seen.get(s.art)}`);
    seen.set(s.art, s.id);
  }
  for (const [id, r] of Object.entries(ROLES)) if (!exists(`assets/images/badges/${r.badge}.png`)) problems.push(`role ${id}: missing badge ${r.badge}`);
  // agency workers: their art must exist and they must be tagged AGENCY (the shared portrait is allowed)
  for (const [role, a] of Object.entries(agency)) {
    if (!exists(path(a.art))) problems.push(`agency ${role}: missing ${path(a.art)}`);
    if (a.tag !== 'AGENCY') problems.push(`agency ${role}: not tagged AGENCY`);
  }
  return { problems, checked: { portraits: list.length, badges: Object.keys(ROLES).length, agency: Object.keys(agency).length } };
}

// Milestone 25c: which care-equipment groups each staff member loves (×1.5, and a small Morale lift) or dislikes (×0.5)
// — from their role (data/items.js ROLE_LIKES): their own group, one more, and for about half of them one they dislike.
// Picked by their id, so a person always has the same likes (an agency worker's role decides theirs the same way).
export function staffLikes(def) {
  const r = ROLE_LIKES[def?.role];
  if (!r) return { loves: [], dislike: null };
  let h = 0;
  for (const ch of String(def.id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const loves = [r.love, r.also[h % r.also.length]];
  const dislike = (h >> 3) % 2 === 0 ? r.dislike[(h >> 4) % r.dislike.length] : null;
  return { loves, dislike: loves.includes(dislike) ? null : dislike };
}
