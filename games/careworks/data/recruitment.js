// Recruitment (Milestone 11, bible §13). Plain data only; the rules are in src/systems/staffing.js on
// core/RecruitmentSystem.
//
// CHANNELS: where candidates come from. unlock = when the channel opens (Milestone 26: at the home's real Rank; ?debug=1
// opens them all); cost = Credits for a paid refresh of the board from it;
// weights = how likely each tier is on a card (the §13 pools: Local = Standard only; Agency = Standard + Rare;
// Specialist / National = Rare + Elite). Milestone 12: a card only goes to someone whose §12 eligibility rule passes
// (data/staff.js RULES); an Elite pick with no eligible Elite falls back to a Rare person (TIER_FALLBACK). Legendary /
// Secret staff never come through a channel (bible §12: condition-driven arrivals).
export const CHANNELS = [
  { id: 'local', name: 'Local Applicants', text: 'People from the area: Standard staff', unlock: { type: 'start', text: 'Open from the start' }, cost: 150, weights: { standard: 1 } },
  { id: 'agency', name: 'Care Agency', text: 'An agency with more experienced carers: Standard and Rare', unlock: { type: 'rank', value: 'D', text: 'Locked — needs Rank D' }, cost: 400, weights: { standard: 3, rare: 1 } },
  { id: 'specialist', name: 'Specialist Recruiter', text: 'Finds skilled specialists: Rare and Elite', unlock: { type: 'rank', value: 'C', text: 'Locked — needs Rank C' }, cost: 900, weights: { rare: 3, elite: 1 } },
  { id: 'national', name: 'National Search', text: 'The best in the country: Rare and Elite', unlock: { type: 'rank', value: 'A', text: 'Locked — needs Rank A' }, cost: 1800, weights: { rare: 1, elite: 2 } },
  { id: 'special', name: 'Special Arrival', text: 'Someone special turns up when the home earns it', unlock: { type: 'condition', text: 'Arrives by itself when the conditions are met (later milestones)' }, cost: 0, weights: {} },
];
export const channelById = (id) => CHANNELS.find((c) => c.id === id) ?? null;
// Tiers that never appear on a board (bible §12, §13).
export const NEVER_TIERS = ['legendary', 'secret', 'divine']; // (Milestone 30b: the Works Gods too)
// When a tier has nobody left to offer, the next one down (Elite → Rare → Standard) fills the card.
export const TIER_FALLBACK = { elite: 'rare', rare: 'standard', standard: null };

export const RECRUIT = {
  boardSize: 3, // bible §13 base board
  freeRefreshDays: 56, // a free refresh (Local Applicants) every 56 game days
  freeChannel: 'local',
  hireFee: 0, // (no fee for now: the first month's wages are the cost — tuned in Milestone 22)
};

// The employee cap by Rank (bible §13; Milestone 26: the home's real Rank).
export const EMPLOYEE_CAP = { E: 12, D: 18, C: 26, B: 36, A: 46, S: 56 };
export const RANK_NOW = 'E'; // (a new home's Rank: the rank a staffing system without a home world reads)
// Ranks from lowest to highest (Milestone 12: the eligibility rules compare them; Milestone 26: src/systems/quality.js).
export const RANKS = ['E', 'D', 'C', 'B', 'A', 'S'];
export const rankAtLeast = (have, need) => RANKS.indexOf(have) >= RANKS.indexOf(need);
