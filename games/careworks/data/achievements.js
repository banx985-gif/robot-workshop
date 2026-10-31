// Achievements, Home Records, Memory Book milestones and the Staff Hall of Fame (Milestone 32, bible §34; Kairosoft gap #3).
// Plain data only; the rules are in src/systems/achievements.js on core/AchievementSystem and core/AccountRecords.
//
// An achievement: { id, n (its bible §34 number), name, text (the plain one-line goal shown while locked),
//   triggerEvents (the moments it is checked — the home's own bus events, plus 'ach:day' each midnight and 'ach:month'
//   at each month's close), requires (core condition: { fact, op, value }), scope, reward, beat?, hidden? }
//   scope   'run'      earned in this home (shown as "this home") AND counted on the account ("best ever": once earned in
//                      any home it stays earned); its reward is paid once per account, never again in a later home
//           'account'  account only (Memory Book 25, Year-16 Legacy, Pantheon)
//   reward  [] nothing (the moment is its own reward), [{ currency: 'reputation', amount }] a small lift paid into the
//           home where it is first earned, or [{ currency: 'keepsake', id }] a cosmetic kept on the account. Never power,
//           never sold.
//   beat    'big' — the big beat (Rank S, C10, Year-16 Legacy); every other one is a quiet Inbox line
//   hidden  shows as "???" until earned (Pantheon)
// Facts: the secrets' registry (src/systems/secretFacts.js — run.*, account.*) plus the few named ach.* in
// src/systems/achievements.js.
const rep = (amount) => [{ currency: 'reputation', amount }];
const keep = (id) => [{ currency: 'keepsake', id }];
const DAY = 'ach:day';
const MONTH = 'ach:month';
const a = (n, id, name, text, triggerEvents, requires, reward = [], extra = {}) => ({ n, id, name, text, triggerEvents, requires, reward, scope: 'run', ...extra });
const gte = (fact, value) => ({ fact, op: 'gte', value });
const has = (fact, value) => ({ fact, op: 'has', value });

export const ACHIEVEMENTS = [
  a(1, 'ACH01', 'Welcome Home', 'Admit your first resident from the Admissions board', ['care:admit', DAY], gte('ach.admitted', 1), rep(10)),
  a(2, 'ACH02', 'First Care Plan', 'Review a resident’s care plan for the first time', ['care:review', DAY], gte('ach.plansReviewed', 1), rep(10)),
  a(3, 'ACH03', 'Full House', 'Fill 90% of the home’s places', ['care:admit', DAY], gte('run.occupancy', 90), rep(25)),
  a(4, 'ACH04', 'First Compliment', 'Receive a family’s first thank-you', ['care:compliment', DAY], gte('ach.compliments', 1), rep(10)),
  a(5, 'ACH05', 'First Family Review', 'Hold a care-plan review with a family for the first time', ['care:review', DAY], gte('ach.familyReviews', 1), rep(10)),
  a(6, 'ACH06', 'First Successful Rehab Discharge', 'See a rehab resident go home with their goals met', ['care:discharge', DAY], gte('run.rehabDischarges', 1), rep(20)),
  a(7, 'ACH07', 'First Birthday Celebration', 'Hold a resident’s birthday tea', ['care:birthday', DAY], gte('run.birthdaysHeld', 1), rep(10)),
  a(8, 'ACH08', 'Friendship', 'Two residents reach a strong bond (Friendship 80+)', [DAY], gte('run.bestFriendship', 80), rep(15)),
  a(9, 'ACH09', 'First Specialist Program', 'Start a specialist program', [DAY], gte('ach.programsStarted', 1), rep(15)),
  a(10, 'ACH10', 'Safe Month', 'Close a month with residents and no safety alert left unresolved', [MONTH], gte('ach.safeMonths', 1), rep(25)),
  a(11, 'ACH11', 'Safe Year', 'Clinical Safety 90+ for 12 months in a row', [MONTH], gte('ach.clinical90Months', 12), rep(100)),
  a(12, 'ACH12', 'Happy Home', 'Resident Wellbeing 90+', [DAY], gte('run.score.residentWellbeing', 90), rep(50)),
  a(13, 'ACH13', 'Family Favourite', 'Family Trust 90+', [DAY], gte('run.score.familyTrust', 90), rep(50)),
  a(14, 'ACH14', 'Good Employer', 'Staff Wellbeing 90+', [DAY], gte('run.score.staffWellbeing', 90), rep(50)),
  a(15, 'ACH15', 'Beautiful Home', 'Environment & Compliance 90+', [DAY], gte('run.score.environment', 90), rep(50)),
  a(16, 'ACH16', 'Rank D', 'Reach Rank D', ['quality:rankUp', DAY], gte('run.rank', 1)),
  a(17, 'ACH17', 'Rank C', 'Reach Rank C', ['quality:rankUp', DAY], gte('run.rank', 2)),
  a(18, 'ACH18', 'Rank B', 'Reach Rank B', ['quality:rankUp', DAY], gte('run.rank', 3)),
  a(19, 'ACH19', 'Rank A', 'Reach Rank A', ['quality:rankUp', DAY], gte('run.rank', 4)),
  a(20, 'ACH20', 'Rank S', 'Reach Rank S', ['quality:rankUp', DAY], gte('run.rank', 5), keep('frameGold'), { beat: 'big' }),
  a(21, 'ACH21', 'Expanded Home', 'Open Stage 2', ['home:stage', DAY], gte('run.stage', 2), rep(25)),
  a(22, 'ACH22', 'Professional Facility', 'Open Stage 3', ['home:stage', DAY], gte('run.stage', 3), rep(50)),
  a(23, 'ACH23', 'Specialist Centre', 'Open Stage 4', ['home:stage', DAY], gte('run.stage', 4), rep(75)),
  a(24, 'ACH24', 'Premier Campus', 'Open Stage 5', ['home:stage', DAY], gte('run.stage', 5), rep(100)),
  a(25, 'ACH25', 'Memory Program', 'Run the Music & Memory program', [DAY], has('run.programsEver', 'PRG02'), rep(15)),
  a(26, 'ACH26', 'Rehab Program', 'Run the Reablement Pathway program', [DAY], has('run.programsEver', 'PRG05'), rep(15)),
  a(27, 'ACH27', 'Palliative Program', 'Run the Palliative Comfort program', [DAY], has('run.programsEver', 'PRG10'), rep(15)),
  a(28, 'ACH28', 'National Excellence', 'Win the National Excellence award (C10)', ['quality:award', DAY], has('run.awards', 'C10'), keep('badgeNational'), { beat: 'big' }),
  a(29, 'ACH29', 'Memory Book 25', '25 pages in the Memory Book, across all your homes', ['ach:book', DAY], gte('account.memoryBook', 25), [], { scope: 'account' }),
  a(30, 'ACH30', 'Year-16 Legacy', 'See a home through to the end of Year 16', [DAY], { fact: 'ach.legacyEnding', op: 'eq', value: true }, keep('frameLegacy'), { scope: 'account', beat: 'big' }),
  // (Milestone 30b's Pantheon record, now the 31st, hidden achievement; its record and big beat stay as they were)
  a(31, 'ACH31', 'Pantheon', 'All five Works Gods have worked in your homes', ['staff:hired', DAY], { fact: 'ach.pantheon', op: 'eq', value: true }, keep('badgePantheon'), { scope: 'account', hidden: true }),
];
export const VISIBLE_COUNT = ACHIEVEMENTS.filter((x) => !x.hidden).length; // 30
export const achievementById = (id) => ACHIEVEMENTS.find((x) => x.id === id) ?? null;

// Cosmetic keepsakes (account): what they are called and where they show. Nothing here changes how the home runs.
export const KEEPSAKES = {
  frameGold: { name: 'Gold portrait frame', where: 'Around the Hall of Fame portraits' },
  frameLegacy: { name: 'Legacy portrait frame', where: 'Around the Hall of Fame portraits' },
  badgeNational: { name: 'National Excellence badge', where: 'On the Achievements page' },
  badgePantheon: { name: 'Works Gods badge', where: 'On the Achievements page' },
  coverLinen: { name: 'Linen Memory Book cover', where: 'The Memory Book' },
  coverFlowers: { name: 'Pressed-flower Memory Book cover', where: 'The Memory Book' },
  coverGold: { name: 'Gold-edged Memory Book cover', where: 'The Memory Book' },
  coverHeirloom: { name: 'Heirloom Memory Book cover', where: 'The Memory Book' },
};

// Memory Book milestones (account): each once, a cover keepsake and a quiet line. #29 "Memory Book 25" is the 25 one.
export const MEMORY_MILESTONES = [
  { pages: 10, keepsake: 'coverLinen', line: 'Ten pages in the Memory Book: ten lives remembered with care' },
  { pages: 25, keepsake: 'coverFlowers', line: 'Twenty-five pages in the Memory Book: every one of them a life well remembered' },
  { pages: 50, keepsake: 'coverGold', line: 'Fifty pages in the Memory Book: a long story of kindness' },
  { pages: 100, keepsake: 'coverHeirloom', line: 'One hundred pages in the Memory Book: a keepsake of a lifetime’s care' },
];

// Home Records: each has a run best (this home) and an account best (every home). better: 'max' (core AccountRecords).
//   unit(v) → the value in words
const days = (v) => {
  const y = Math.floor(v / 336);
  const m = Math.floor((v % 336) / 28);
  return y ? `${y} year${y === 1 ? '' : 's'}${m ? ` ${m} month${m === 1 ? '' : 's'}` : ''}` : m ? `${m} month${m === 1 ? '' : 's'}` : `${v} day${v === 1 ? '' : 's'}`;
};
const n = (word) => (v) => `${v.toLocaleString('en-GB')} ${word}${v === 1 ? '' : 's'}`;
export const RECORD_GROUPS = [
  { id: 'resident', title: 'Resident records' },
  { id: 'staff', title: 'Staff records' },
  { id: 'facility', title: 'Facility records' },
];
export const RECORD_DEFS = [
  { id: 'res.longestStay', group: 'resident', name: 'Longest stay', better: 'max', unit: days },
  { id: 'res.oldest', group: 'resident', name: 'Oldest resident', better: 'max', unit: (v) => `aged ${v}` },
  { id: 'res.mostFriends', group: 'resident', name: 'Most friendships', better: 'max', unit: n('friend') },
  { id: 'res.bestRehab', group: 'resident', name: 'Best rehab recovery', better: 'max', unit: (v) => `Independence +${v} by discharge` },
  { id: 'res.mostWishes', group: 'resident', name: 'Most wishes honoured', better: 'max', unit: (v) => `${v} end-of-life wish${v === 1 ? '' : 'es'} honoured in one home` },
  { id: 'staff.longestServing', group: 'staff', name: 'Longest serving', better: 'max', unit: days },
  { id: 'staff.mostCared', group: 'staff', name: 'Most residents cared for', better: 'max', unit: n('resident') },
  { id: 'staff.mostTrained', group: 'staff', name: 'Most trained', better: 'max', unit: n('course') },
  { id: 'staff.highestLevel', group: 'staff', name: 'Highest level', better: 'max', unit: (v) => `Level ${v}` },
  { id: 'fac.bestProfit', group: 'facility', name: 'Best month (profit)', better: 'max', unit: (v) => `${v.toLocaleString('en-GB')} Credits` },
  { id: 'fac.bestScores', group: 'facility', name: 'Best month (all five scores)', better: 'max', unit: (v) => `average ${v}` },
  { id: 'fac.mostUsed', group: 'facility', name: 'Most-used facility', better: 'max', unit: n('visit') },
  { id: 'fac.highestLevel', group: 'facility', name: 'Highest-level facility', better: 'max', unit: (v) => `Level ${['I', 'II', 'III'][v - 1] ?? v}` },
];
export const recordDefById = (id) => RECORD_DEFS.find((d) => d.id === id) ?? null;

// The Staff Hall of Fame (account, across every home): a keepsake only (the New Game+ head start is Milestone 33's Legacy
// Staff). Legendary, Secret and Divine staff go in when they first join; anyone who has served servedDays goes in then;
// anyone who leaves (let go) can be added from the Hall of Fame page (the last `candidatesKept` are offered).
export const HALL = {
  autoTiers: ['legendary', 'secret', 'divine'],
  servedDays: 5 * 336, // 5 game years
  candidatesKept: 12,
  why: { tier: 'A legend of care: joined the team', served: 'Five years of service', left: 'Added on leaving the team' },
  tag: { tier: 'Legend', served: 'Five years’ service', left: 'Added on leaving' }, // (the short word on the Hall of Fame page)
};

// The account store's key for all of this (src/main.js), next to the Memory Book and the secrets.
export const ACCOUNT_KEY = 'achievements';
export const ACH_TEXT = {
  title: 'Achievements',
  sub: 'Thirty goals for a caring home: earned once, kept in every home',
  records: 'Home Records',
  recordsSub: 'The best this home has done, and the best across all your homes',
  hall: 'Staff Hall of Fame',
  hallSub: 'The people who made your homes what they are',
  inbox: (name) => `Achievement: ${name}`,
};
