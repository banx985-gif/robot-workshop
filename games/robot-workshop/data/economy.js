// Money, debt and reputation numbers for Robot Workshop (bible §20, §9.6, §8.3).

export const CURRENCIES = {
  credits: { id: 'credits', name: 'Credits', short: 'cr', icon: 'ui_icon_01_money' },
  techChips: { id: 'techChips', name: 'Tech Chips', short: 'TC', icon: 'ui_icon_02_premium' },
};

// §20.2 first run
export const STARTING_MONEY = { credits: 18000, techChips: 5 };

// §20.6 Emergency Credit (first run)
export const DEBT_RULES = {
  warnBelow: 0,
  limit: -25000,
  monthlyInterestPct: 5,
  closureMonths: 3, // month-ends in a row below the limit → Workshop Closure
  blockedWhileNegative: ['facility', 'paidResearch', 'headHunt'], // nothing in the game uses these yet
};
export const BLOCK_NAMES = { facility: 'build facilities', paidResearch: 'paid research', headHunt: 'Head Hunt / Global Search' };

// §9.6 salary: +2% every five levels, rounded to the nearest 10 credits.
export const SALARY_RULES = { raisePct: 2, everyLevels: 5, roundTo: 10 };

// §20.5 project operating cost per project day
export const OPERATING_COST = {
  base: 60,
  componentCostDivisor: 180,
  salaryDivisor: 336,
  perAdvancedFacility: 10,
  focusMultiplier: { lean: 0.8, balanced: 1.0, push: 1.25 },
};

// §20.7 Tech Chip gameplay sources (first time only)
export const TECH_CHIP_REWARDS = { firstLaunch: 2 };

// §8.3 company ranks by reputation
export const RANKS = [
  { id: 'E', min: 0 },
  { id: 'D', min: 250 },
  { id: 'C', min: 900 },
  { id: 'B', min: 2500 },
  { id: 'A', min: 6000 },
  { id: 'S', min: 12000 },
  { id: 'S+', min: 20000 },
];

// Reputation gains (not set in the bible — Milestone 4 choice).
export const REPUTATION_RULES = {
  launchPerQuality: 0.5, // launch: +Quality × 0.5 (Quality 50 → +25)
  salesPerUnit: 0.5, // each month on sale: +units × 0.5
};
