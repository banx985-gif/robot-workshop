// Robot Workshop's full staff roster: all 50 recruitable characters from bible §15, exactly as the tables say
// (id, name, tier, starting level, ENG/DES/PRG/FAB/TST, monthly salary, traits, unlock / first appearance).
// Shape follows bible §42.1. Art ids match the roster ids: ENG01 → staff_engineer_01 … PIL10 → staff_pilot_10.
//
// unlock — when this person can first turn up (read by Campaign.namedPool / src/systems/Candidates.js):
//   { type: 'starter' }                   in the team at the start (§15.6)
//   { type: 'tutorial', when }            a guaranteed special arrival (§15.6: Tessa in Month 1, Kai at the Local Trial)
//   any rule from data/unlocks.js         rank, counters (projects, launches…), competitions (hook stored for M12)
//   { type: 'secret', id }                legendary/secret staff: never in normal pools (§9.4); only their own
//                                         arrival events (Milestones 16–17) or the ?debug=1 override bring them
// channels — only these recruitment channels can find them (the §15 "Local Ad", "+ Agency", "+ Head Hunt" rows).
//            Without it: any channel whose roles and tier match.

// Five fixed roles (§9.1). primaryStat drives level-up growth (§9.3).
export const ROLES = {
  engineer: { name: 'Engineer', primaryStat: 'eng', badge: 'badge_role_01_engineer', idPrefix: 'ENG', artFolder: 'engineer' },
  designer: { name: 'Designer', primaryStat: 'des', badge: 'badge_role_02_designer', idPrefix: 'DES', artFolder: 'designer' },
  programmer: { name: 'Programmer', primaryStat: 'prg', badge: 'badge_role_03_programmer', idPrefix: 'PRG', artFolder: 'programmer' },
  mechanic: { name: 'Mechanic', primaryStat: 'fab', badge: 'badge_role_04_mechanic', idPrefix: 'MEC', artFolder: 'mechanic' },
  pilot: { name: 'Test Pilot', primaryStat: 'tst', badge: 'badge_role_05_pilot', idPrefix: 'PIL', artFolder: 'pilot' },
};

// Tiers (§9.4): stat cap per work stat and normal trait slots; legendary/secret add one signature trait.
export const TIERS = {
  standard: { name: 'Standard', statCap: 220, traitSlots: 1 },
  rare: { name: 'Rare', statCap: 300, traitSlots: 1 },
  elite: { name: 'Elite', statCap: 400, traitSlots: 2 },
  legendary: { name: 'Legendary', statCap: 520, traitSlots: 2, signature: true },
  secret: { name: 'Secret', statCap: 650, traitSlots: 3, signature: true },
};

// Unlock rule shorthands.
const STARTER = { type: 'starter' };
const LOCAL_AD = { unlock: { type: 'start' }, channels: ['localAd'] };
const rank = (r) => ({ unlock: { type: 'rank', rank: r } });
const RANK_B_AGENCY = { unlock: { type: 'rank', rank: 'B' }, channels: ['agency'] };
const RANK_A_HEADHUNT = { unlock: { type: 'rank', rank: 'A' }, channels: ['headHunt'] };
const counter = (name, min) => ({ unlock: { type: 'counter', counter: name, min } });
const legendary = (id) => ({ unlock: { type: 'secret', id } });
const secretNgPlus = (id) => ({ unlock: { type: 'all', of: [{ type: 'secret', id }, { type: 'flag', flag: 'ngPlus' }] } });

const ROLE_OF = Object.fromEntries(Object.entries(ROLES).map(([id, r]) => [r.idPrefix, id]));

// One §15 table row. stats: 'ENG/DES/PRG/FAB/TST' exactly as the bible writes them.
function row(id, name, tier, startLevel, stats, salary, traits, how) {
  const role = ROLE_OF[id.slice(0, 3)];
  const [eng, des, prg, fab, tst] = stats.split('/').map(Number);
  const { unlock, channels } = how.type ? { unlock: how } : how;
  return {
    id,
    name,
    nameKey: `staff.${id}.name`,
    role,
    tier,
    startLevel,
    stats: { eng, des, prg, fab, tst },
    salary,
    traits,
    unlock,
    ...(channels ? { channels } : {}),
    art: `staff_${ROLES[role].artFolder}_${id.slice(3)}`,
  };
}

export const STAFF = [
  // §15.1 Engineers
  row('ENG01', 'Mina Rowe', 'standard', 1, '58/28/24/38/22', 480, ['quickLearner'], STARTER),
  row('ENG02', 'Theo Marr', 'standard', 3, '72/30/28/44/25', 650, ['workhorse'], LOCAL_AD),
  row('ENG03', 'Priya Kade', 'rare', 4, '86/42/36/48/30', 900, ['teamPlayer'], rank('D')),
  row('ENG04', 'Luka Venn', 'standard', 5, '90/38/32/55/35', 980, ['frugal'], rank('D')),
  row('ENG05', 'Hana Quill', 'rare', 7, '112/52/40/62/42', 1350, ['inventive'], rank('C')),
  row('ENG06', 'Owen Forge', 'rare', 8, '125/35/32/78/44', 1500, ['specialist'], counter('projectsCompleted', 10)),
  row('ENG07', 'Elise Voss', 'elite', 10, '158/68/55/82/58', 2200, ['perfectionist', 'mentor'], RANK_B_AGENCY),
  row('ENG08', 'Jae Mercer', 'elite', 12, '172/60/72/96/62', 2500, ['allRounder', 'reliabilityNut'], RANK_A_HEADHUNT),
  row('ENG09', 'Dr. Mira Volta', 'legendary', 15, '245/110/105/135/95', 4200, ['inventive', 'mentor', 'masterIntegrator'], legendary('SEC-STAFF-L1')),
  row('ENG10', 'Orin Zero', 'secret', 18, '320/150/145/180/125', 6000, ['perfectionist', 'inventive', 'impossibleTolerances'], secretNgPlus('SEC-STAFF-S1')),

  // §15.2 Designers
  row('DES01', 'Tessa Vale', 'standard', 1, '24/60/22/26/28', 470, ['marketSense'], { type: 'tutorial', when: 'month1' }),
  row('DES02', 'Marco Linn', 'standard', 3, '28/74/26/28/32', 640, ['teamPlayer'], LOCAL_AD),
  row('DES03', 'Nia Bloom', 'rare', 4, '34/90/30/30/38', 920, ['quickLearner'], rank('D')),
  row('DES04', 'Sora Pike', 'standard', 5, '38/94/28/35/40', 1000, ['frugal'], rank('D')),
  row('DES05', 'Cleo Hart', 'rare', 7, '45/116/38/42/48', 1380, ['perfectionist'], rank('C')),
  row('DES06', 'Felix Rune', 'rare', 8, '48/128/42/40/45', 1520, ['specialist'], counter('commercialLaunches', 8)),
  row('DES07', 'Ava Prism', 'elite', 10, '62/162/58/50/62', 2180, ['marketSense', 'inventive'], RANK_B_AGENCY),
  row('DES08', 'Ren Calder', 'elite', 12, '72/178/65/55/70', 2550, ['teamPlayer', 'mentor'], RANK_A_HEADHUNT),
  row('DES09', 'Solenne Arc', 'legendary', 15, '112/250/95/78/102', 4100, ['perfectionist', 'marketSense', 'iconMaker'], legendary('SEC-STAFF-L2')),
  row('DES10', 'Pixel Eve', 'secret', 18, '155/325/135/100/140', 5900, ['inventive', 'allRounder', 'futureForm'], secretNgPlus('SEC-STAFF-S2')),

  // §15.3 Programmers
  row('PRG01', 'Rami Cole', 'standard', 1, '26/24/62/22/30', 490, ['debugger'], STARTER),
  row('PRG02', 'Amara Nix', 'standard', 3, '30/28/76/24/34', 670, ['quickLearner'], LOCAL_AD),
  row('PRG03', 'Kenji Orr', 'rare', 4, '34/34/92/28/40', 950, ['teamPlayer'], rank('D')),
  row('PRG04', 'Lila Kern', 'standard', 5, '36/32/96/30/44', 1020, ['frugal'], rank('D')),
  row('PRG05', 'Tomas Valez', 'rare', 7, '44/42/118/34/52', 1420, ['inventive'], rank('C')),
  row('PRG06', 'Noor Syn', 'rare', 8, '42/38/132/32/58', 1560, ['specialist'], counter('aiHeavyProjects', 5)),
  row('PRG07', 'Iris Moon', 'elite', 10, '58/55/165/44/68', 2250, ['debugger', 'mentor'], RANK_B_AGENCY),
  row('PRG08', 'Dex Rowan', 'elite', 12, '65/62/182/50/76', 2600, ['allRounder', 'teamPlayer'], RANK_A_HEADHUNT),
  row('PRG09', 'Dr. Nyla Vector', 'legendary', 15, '102/95/255/72/118', 4300, ['inventive', 'debugger', 'cleanCode'], legendary('SEC-STAFF-L3')),
  row('PRG10', 'Null Mercer', 'secret', 18, '140/130/335/95/155', 6100, ['inventive', 'nightOwl', 'ghostLogic'], secretNgPlus('SEC-STAFF-S3')),

  // §15.4 Mechanics
  row('MEC01', 'Gus Hale', 'standard', 1, '34/20/18/62/28', 460, ['fabricator'], STARTER),
  row('MEC02', 'Dani Torres', 'standard', 3, '40/22/20/78/32', 630, ['workhorse'], LOCAL_AD),
  row('MEC03', 'Bo Kellan', 'rare', 4, '48/28/25/94/36', 900, ['reliabilityNut'], rank('D')),
  row('MEC04', 'Emi Rook', 'standard', 5, '52/26/26/98/40', 990, ['frugal'], rank('D')),
  row('MEC05', 'Mack Sato', 'rare', 7, '60/34/30/122/48', 1360, ['fabricator'], rank('C')),
  row('MEC06', 'Rosa Flint', 'rare', 8, '70/32/28/136/52', 1500, ['specialist'], counter('zeroFaultProjects', 8)),
  row('MEC07', 'Vale Knox', 'elite', 10, '82/45/42/170/65', 2150, ['reliabilityNut', 'mentor'], RANK_B_AGENCY),
  row('MEC08', 'Juno Steel', 'elite', 12, '92/52/48/186/72', 2520, ['workhorse', 'allRounder'], RANK_A_HEADHUNT),
  row('MEC09', 'Bruno Atlas', 'legendary', 15, '135/75/65/260/110', 4000, ['fabricator', 'reliabilityNut', 'builtOnce'], legendary('SEC-STAFF-L4')),
  row('MEC10', 'Kestrel Nine', 'secret', 18, '180/105/95/345/145', 5800, ['workhorse', 'fabricator', 'unbreakable'], secretNgPlus('SEC-STAFF-S4')),

  // §15.5 Test Pilots
  row('PIL01', 'Kai West', 'standard', 1, '24/24/28/28/64', 500, ['calmUnderPressure'], { type: 'tutorial', when: 'localTrial' }),
  row('PIL02', 'Mae Jett', 'standard', 3, '28/28/32/30/80', 690, ['speedFreak'], { unlock: { type: 'competition', event: 'localTrial' }, channels: ['localAd'] }), // "Local Ad after Local Trial"
  row('PIL03', 'Idris Lane', 'rare', 4, '34/32/38/34/96', 980, ['tuner'], rank('D')),
  row('PIL04', 'Zoe Pace', 'standard', 5, '36/34/36/38/101', 1050, ['quickLearner'], rank('D')),
  row('PIL05', 'Arlo Quinn', 'rare', 7, '44/38/44/42/125', 1450, ['calmUnderPressure'], rank('C')),
  row('PIL06', 'Mina Drift', 'rare', 8, '46/40/42/44/138', 1600, ['specialist'], { type: 'competition', event: 'wins', min: 5 }),
  row('PIL07', 'Cruz North', 'elite', 10, '62/50/58/55/174', 2300, ['tuner', 'workhorse'], RANK_B_AGENCY),
  row('PIL08', 'Yara Flux', 'elite', 12, '68/58/65/60/190', 2650, ['riskTaker', 'calmUnderPressure'], RANK_A_HEADHUNT),
  row('PIL09', 'Rex Vantage', 'legendary', 15, '105/80/88/82/265', 4400, ['tuner', 'speedFreak', 'perfectLine'], legendary('SEC-STAFF-L5')),
  row('PIL10', 'Nova Black', 'secret', 18, '145/115/120/110/350', 6200, ['tuner', 'riskTaker', 'beyondRedline'], secretNgPlus('SEC-STAFF-S5')),
];

export const STAFF_BY_ID = Object.fromEntries(STAFF.map((s) => [s.id, s]));

export const STARTER_IDS = STAFF.filter((s) => s.unlock.type === 'starter').map((s) => s.id);

// §39.1 employee cap by Company Rank (hiring is refused at the cap).
export const EMPLOYEE_CAP = { E: 6, D: 8, C: 12, B: 16, A: 20, S: 24, 'S+': 24 };

// Tiers that ordinary recruitment can ever roll (§9.4: legendary and secret staff only arrive through their own events).
export const RECRUITABLE_TIERS = ['standard', 'rare', 'elite'];

// Unlock types that are never part of the recruitment pool (they arrive their own way).
export const NOT_IN_POOL = ['starter', 'tutorial'];

// Career record counters (core/CareerRecords.js), with their words for the staff detail screen.
// eventsEntered / eventsWon are counted once competitions arrive (Milestone 12).
export const CAREER_COUNTERS = [
  { key: 'projects', label: 'Projects worked on' },
  { key: 'robots', label: 'Robots finished' },
  { key: 'zeroFault', label: 'Zero-fault builds' },
  { key: 'eventsEntered', label: 'Competitions entered' },
  { key: 'eventsWon', label: 'Competitions won' },
  { key: 'training', label: 'Training courses done' },
];
