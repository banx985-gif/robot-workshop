// Recruitment (bible §16, §15.7, §39.1). Plain data for core/RecruitmentSystem.js and the candidate maker
// (src/systems/Candidates.js). Legendary and secret staff are never in these pools (their arrival events come
// in Milestones 16–17). Named §15 staff join the pools once their unlock rule is met (data/staff.js).

// §16.2 channels. roles: who the channel finds. weights: §16.3 tier chances (percent).
//   eliteNeeds: elite only rolls once this rule holds (§16.2 Agency: "small elite chance after conditions").
//   Workshop Network needs Rank D and the research milestone that names it (§19.6: 2 topics done).
//   debtBlock: this paid refresh is blocked while in debt (§20.6 blocks Head Hunt / Global Search).
const ALL_ROLES = ['engineer', 'designer', 'programmer', 'mechanic', 'pilot'];
export const CHANNELS = [
  {
    id: 'localAd',
    name: 'Local Ad',
    cost: 300,
    unlock: { type: 'start' },
    roles: ['engineer', 'designer', 'programmer', 'mechanic'],
    weights: { standard: 90, rare: 10 }, // "rare low chance"
    pool: 'Engineers, designers, programmers, mechanics · mostly Standard',
  },
  {
    id: 'workshopNetwork',
    name: 'Workshop Network',
    cost: 900,
    unlock: { type: 'all', of: [{ type: 'rank', rank: 'D' }, { type: 'feature', id: 'workshopNetwork' }] },
    roles: ALL_ROLES,
    weights: { standard: 65, rare: 35 }, // "more rare"
    pool: 'All roles including test pilots · more Rare',
  },
  {
    id: 'agency',
    name: 'Agency',
    cost: 2000,
    unlock: { type: 'rank', rank: 'C' },
    roles: ALL_ROLES,
    weights: { standard: 35, rare: 62, elite: 3 }, // §16.3 elite 3% where permitted
    eliteNeeds: { type: 'rank', rank: 'B' },
    pool: 'Rare is common · a small Elite chance from Rank B',
  },
  {
    id: 'headHunt',
    name: 'Head Hunt',
    cost: 4500,
    unlock: { type: 'rank', rank: 'B' },
    roles: ALL_ROLES,
    weights: { standard: 20, rare: 65, elite: 15 },
    debtBlock: 'headHunt',
    pool: 'Mostly Rare, some Elite',
  },
  {
    id: 'globalSearch',
    name: 'Global Search',
    cost: 8000,
    unlock: { type: 'rank', rank: 'A' },
    roles: ALL_ROLES,
    weights: { standard: 25, rare: 55, elite: 20 }, // §16.3 at Rank A
    debtBlock: 'headHunt',
    pool: 'Elite-heavy',
  },
];

// §16.1 refresh rules. Free refreshes (automatic on day 1 of odd months, one manual tap a year) and the
// Tech Chip refresh (§16.4: 3 Tech Chips, ordinary candidates only) all use FREE_CHANNEL.
export const RECRUIT_RULES = {
  boardSize: 3,
  freeManualPerYear: 1,
  freeChannel: 'localAd',
  techChipItem: 'techChipRefresh',
  reappearChance: 0.1, // M10 choice: a fired worker turns up on a new card 10% of the time (§39.1: they can reappear)
  specialDays: 56, // §15.7: a special arrival stays 56 game days
  namedChance: 0.35, // M11 choice: when named §15 staff fit a card, 35% of cards are one of them
};

// Store stub items (the real store comes later). §16.4.
export const STORE_ITEMS = {
  techChipRefresh: { name: 'Tech Chip refresh', currency: 'techChips', cost: 3 },
};

// §15.7 signing fee = monthly salary × this, by tier.
export const SIGNING_FEE = { standard: 1.5, rare: 2.0, elite: 3.0, legendary: 4.0, secret: 5.0 };

// §15.6 / §26 tutorial hires. Tessa: Month 1, day `day` (bible: "Day 8–12"), and the player is topped up if
// short of her fee. Kai: when the Local Trial unlocks (competitions, later), cheap: fee × feeMult.
export const TUTORIAL_HIRES = {
  tessa: { staffId: 'DES01', day: 8, guaranteed: true, note: 'Tutorial hire: a designer for your team' },
  kai: { staffId: 'PIL01', feeMult: 0.5, note: 'A test pilot for the Local Trial' },
};

// Candidate templates (M10 choice, fitted to the §15 roster): level range (higher main stat → higher level), main stat range, the role's
// second stat as a share of the main stat, other stats as a share, salary from the main stat.
export const TIER_TEMPLATES = {
  standard: { level: [2, 5], primary: [66, 100], salary: { base: 650, ref: 72, perPoint: 15 } },
  rare: { level: [4, 8], primary: [86, 138], salary: { base: 900, ref: 86, perPoint: 14 } },
  elite: { level: [10, 12], primary: [156, 190], salary: { base: 2200, ref: 158, perPoint: 14 } },
};
export const STAT_SHARES = { second: [0.52, 0.66], other: [0.3, 0.46] };
export const ROLE_SECOND_STAT = { engineer: 'fab', designer: 'tst', programmer: 'tst', mechanic: 'eng', pilot: 'prg' };

// Candidate portraits: the role's roster pictures by tier (ids from the §15 roster; 01 = starter/tutorial,
// 09–10 = legendary/secret and never used here).
export const PORTRAITS = { standard: ['02', '04'], rare: ['03', '05', '06'], elite: ['07', '08'] };
export const PORTRAIT_FOLDER = { engineer: 'engineer', designer: 'designer', programmer: 'programmer', mechanic: 'mechanic', pilot: 'pilot' };

// Fictional names for generated candidates.
export const FIRST_NAMES = ['Alex', 'Bea', 'Caleb', 'Dana', 'Eli', 'Faye', 'Gio', 'Hollis', 'Ines', 'Jonah', 'Kira', 'Lars', 'Maya', 'Nico', 'Odette', 'Pax', 'Quinn', 'Rhea', 'Silas', 'Tova', 'Umar', 'Vera', 'Wes', 'Xan', 'Yumi', 'Zane', 'Ari', 'Bram', 'Cora', 'Dev'];
export const LAST_NAMES = ['Ashby', 'Brook', 'Crane', 'Dunn', 'Ellery', 'Fenn', 'Grady', 'Hollow', 'Ives', 'Jansen', 'Keel', 'Lark', 'Moss', 'Norrow', 'Oakes', 'Price', 'Reyes', 'Stone', 'Tate', 'Ueda', 'Vance', 'Wren', 'Yates', 'Zell', 'Brightwater', 'Cogsworth', 'Hartley', 'Pell', 'Sayer', 'Tolland'];

// Art.
export const RECRUIT_ART = {
  icon: 'ui_icon_05_staff',
  tierBadges: {
    standard: 'badge_rarity_01_common',
    rare: 'badge_rarity_02_rare',
    elite: 'badge_rarity_03_elite',
    legendary: 'badge_rarity_04_legendary',
    secret: 'badge_rarity_05_secret',
  },
};
