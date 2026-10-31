// Funding and the economy (Milestone 22, bible §27, §0.1 / §2.5 unsafe care is never a profit strategy, §14 under-
// staffing never saves money, §17 a ready rehab resident earns nothing). Plain data only; the rules are in
// src/systems/economy.js, src/systems/ledger.js (the month's close) and the home world. Numbers tuned in M22 by seeded
// runs (docs/DECISIONS.md has the tables); change them here.
//
// The design rule: Care Support Funding pays for the care a level needs. For each Support Level,
//   funding − required care cost ≈ the same small margin (slightly smaller at higher levels),
// where required care cost = the staff time the level needs (its care minutes a day × 28 × MINUTE_COST) + supplies +
// equipment wear. So higher acuity never beats lower acuity once the required staff are paid;
// the accommodation fee (by room) is what keeps a well-run home in a modest profit.

// --- Support Levels 1–5 (from needs) ---------------------------------------------------------------------------------------
// A resident's Support Level comes from their assessed needs (at admission): a care load = the six needs added up, the
// Clinical/Nursing need counting 1.5×; then these thresholds (care load at or above → that level). Every §7 profile lands
// on the level its support type always had (Light 1 · Social / Nutrition 2 · Mobility / Rehab 3 · Memory / Clinical 4 ·
// High Care 5); a rolled applicant may land one either side.
export const LEVEL_RULES = {
  weights: { personal: 1, clinical: 1.5, mobility: 1, nutrition: 1, memory: 1, social: 1 },
  thresholds: [0, 145, 182, 208, 255], // level 1 … 5
};
// Staff time from the task model: the care minutes a resident at each level takes a day (measured in M22: 4 residents of
// each support type, safely staffed, a week — 133 / 134 / 209 / ~150 / 231 — smoothed so it never falls as the level
// rises), and what a hands-on minute costs (a Standard carer's ~540 Credits a month over ~238 hours on shift, about half
// of it hands-on care).
export const CARE_MINUTES = { 1: 130, 2: 150, 3: 175, 4: 200, 5: 230 };
export const MINUTE_COST = 0.075;
// Per level: suppliesPerDay (Credits a day here) · equipmentPerMonth (wear) · margin (funding − required cost, a month).
// funding is worked out from these (fundingOf in src/systems/economy.js) and rounded to 5.
export const LEVELS = {
  1: { suppliesPerDay: 3, equipmentPerMonth: 10, margin: 60 },
  2: { suppliesPerDay: 4, equipmentPerMonth: 25, margin: 55 },
  3: { suppliesPerDay: 5, equipmentPerMonth: 40, margin: 50 },
  4: { suppliesPerDay: 6, equipmentPerMonth: 55, margin: 45 },
  5: { suppliesPerDay: 7, equipmentPerMonth: 70, margin: 40 },
};

// --- income ---------------------------------------------------------------------------------------------------------------------
// Accommodation fees by room template (Credits a month): Standard < Garden < Premium Suite; the care rooms cost as a
// Standard Room (their care is in the funding).
export const ROOM_FEES = { RM01: 1000, RM02: 1100, RM03: 1250, RM04: 1000, RM05: 1000, RM06: 1000, RM07: 1000, default: 1000 };
// Respite funding (a respite stay, a month; short stays carry the cost of the empty days between them). Rehab funding
// stays in data/mobility.js REHAB_FUNDING (Milestone 16).
export const RESPITE_FUNDING = { perMonth: 550 };
// Not built yet: shown on the Ledger as "comes later" and never paid.
export const STUB_INCOME = {
  // (Milestone 26: recognition bonuses are paid — each accreditation won, data/accreditations.js)
};

// --- costs --------------------------------------------------------------------------------------------------------------
// Rooms and facilities upkeep: this share of each placed piece's build cost, a month.
export const UPKEEP = { pctOfCost: 0.5 };
// Utilities and maintenance: per open floor tile, a month (a bigger home costs more to heat and clean).
export const UTILITIES = { perTile: 0.08 };
export const STUB_COSTS = { transport: { name: 'Transport and outings', milestone: 'M23' } };

// --- debt recovery (§27) ------------------------------------------------------------------------------------------------
//   below warnBelow: a plain warning (the balance shows red)
//   below floor: admissions pause (plain reason), and an Emergency Credit offer — a loan of loan.amount, repaid in
//     loan.months equal monthly payments with loan.interestPct on top; one at a time; declined, it may be offered again
//     after reofferDays
//   still sinking at sinkingMonths month-ends in a row (below the floor and lower than the month before): a Rescue
//     Investor offer — the debt (and any loan still owed) cleared to a balance of investor.buffer, then investor.sharePct
//     of each month's profit for investor.months
// Nothing here ever deletes the save, lets anyone go, or touches a resident's care.
export const DEBT = {
  warnBelow: 0,
  floor: -5000,
  loan: { amount: 15000, months: 12, interestPct: 4 },
  reofferDays: 28,
  sinkingMonths: 2,
  investor: { buffer: 2000, sharePct: 30, months: 12 },
};

// --- families moving their resident elsewhere ---------------------------------------------------------------------------------
// The small link from Mood to fees (§2.5): once a week, a resident whose Mood has been under moodBelow all week and whose
// family's Trust is under trustBelow may be moved to another home by their family (weeklyChance, seeded). Lost fees.
export const MOVE_OUT = { moodBelow: 35, trustBelow: 50, weeklyChance: 0.35, days: 7 };

// --- Care Tokens and Prestige (§27, §38) ----------------------------------------------------------------------------------
// Care Tokens: a premium convenience currency — shown only; earned in small amounts from firsts (nothing to buy and
// nothing to spend them on until Milestone 36). Prestige Tokens: account / meta — a counter only (never bought, never
// spent; New Game+ earns them later).
export const CARE_TOKENS = {
  firstAdmission: { tokens: 2, text: 'First admission' },
  firstDischarge: { tokens: 3, text: 'First successful discharge' },
  firstCompliment: { tokens: 1, text: 'First family compliment' },
  firstProgram: { tokens: 1, text: 'First specialist program' },
  firstResearch: { tokens: 2, text: 'First research finished' },
  goodMonth: { tokens: 1, text: 'A good month of care' },
};

// The Ledger page's rows: category → { name, icon, kind: 'income' | 'cost' } (icons: the bar / reward pictures).
export const LEDGER_ROWS = [
  { cat: 'fees', name: 'Accommodation fees', icon: 'care_reward_01', kind: 'income' },
  { cat: 'funding', name: 'Care Support Funding', icon: 'care_ui_01', kind: 'income' },
  { cat: 'respiteFunding', name: 'Respite funding', icon: 'care_ui_01', kind: 'income' },
  { cat: 'rehabFunding', name: 'Rehab funding', icon: 'care_ui_01', kind: 'income' },
  { cat: 'programFunding', name: 'Program funding', icon: 'care_ui_03', kind: 'income' },
  { cat: 'grants', name: 'Grants and service contracts', icon: 'care_ui_05', kind: 'income' }, // (Milestone 23)
  { cat: 'partnerSupport', name: 'Partner support', icon: 'care_ui_05', kind: 'income' }, // (Milestone 23: on signing)
  { cat: 'partnerPerk', name: 'Partner perks (savings)', icon: 'care_ui_03', kind: 'income' }, // (Milestone 23)
  { cat: 'recognition', name: 'Recognition bonuses', icon: 'care_reward_02', kind: 'income' }, // (Milestone 26: accreditations won)
  { cat: 'loan', name: 'Emergency Credit', icon: 'care_ui_05', kind: 'income' },
  { cat: 'investor', name: 'Rescue Investor', icon: 'care_ui_05', kind: 'income' },
  { cat: 'sell', name: 'Sold (50% back)', icon: 'care_ui_03', kind: 'income' },
  { cat: 'wages', name: 'Wages', icon: 'care_ui_02', kind: 'cost' },
  { cat: 'agency', name: 'Agency cover', icon: 'care_ui_02', kind: 'cost' },
  { cat: 'careRecovery', name: 'Care recovery', icon: 'care_ui_04', kind: 'cost' },
  { cat: 'food', name: 'Food', icon: 'care_ui_01', kind: 'cost' },
  { cat: 'supplies', name: 'Supplies', icon: 'care_ui_01', kind: 'cost' },
  { cat: 'equipment', name: 'Equipment upkeep', icon: 'care_ui_03', kind: 'cost' },
  { cat: 'upkeep', name: 'Rooms and facilities upkeep', icon: 'care_ui_03', kind: 'cost' },
  { cat: 'utilities', name: 'Utilities and maintenance', icon: 'care_ui_03', kind: 'cost' },
  { cat: 'training', name: 'Training', icon: 'care_ui_02', kind: 'cost' },
  { cat: 'recruit', name: 'Recruitment', icon: 'care_ui_02', kind: 'cost' },
  { cat: 'clinical', name: 'Clinician and hospital', icon: 'care_ui_04', kind: 'cost' },
  { cat: 'programs', name: 'Specialist programs', icon: 'care_ui_03', kind: 'cost' },
  { cat: 'emergency', name: 'Emergency supplies and responses', icon: 'care_ui_27', kind: 'cost' }, // (Milestone 25)
  { cat: 'transport', name: 'Transport and outings (later)', icon: 'care_ui_03', kind: 'cost' },
  { cat: 'build', name: 'Building', icon: 'care_ui_03', kind: 'cost' },
  { cat: 'loanRepay', name: 'Emergency Credit repayment', icon: 'care_ui_05', kind: 'cost' },
  { cat: 'investorShare', name: 'Rescue Investor share', icon: 'care_ui_05', kind: 'cost' },
];
// The categories posted at the month's close (the rest post as they happen).
export const CLOSE_CATS = ['fees', 'funding', 'respiteFunding', 'rehabFunding', 'wages', 'supplies', 'equipment', 'upkeep', 'utilities', 'partnerPerk']; // (Milestone 23: the partners' savings post with the close)

// Care Support Funding by level (Credits a month): the level's required care cost + its margin, rounded to 5.
//   required = CARE_MINUTES × 28 × MINUTE_COST (staff time) + suppliesPerDay × 28 + equipmentPerMonth
export const FUNDING = Object.fromEntries(
  Object.entries(LEVELS).map(([lv, L]) => [lv, Math.round((CARE_MINUTES[lv] * 28 * MINUTE_COST + L.suppliesPerDay * 28 + L.equipmentPerMonth + L.margin) / 5) * 5]),
);

// The Mood → fees link (§2.5: skipping activities and company must not pay). At the month's close, a resident whose
// average Mood that month was under `line` has their accommodation fee reduced by perPoint% for each point under it
// (at most capPct): the family is unhappy with how their relative is, and negotiates. A well-run home sits above it.
export const FEE_MOOD = { line: 85, perPoint: 2, capPct: 30 };

// The nursing supplement: a resident whose Clinical/Nursing need asks for a nurse on every shift (above
// data/balance.js ON_CALL.clinicalNeedAbove) brings this much more Care Support Funding a month — the cost of the
// nurse cover the rule adds, which the care minutes alone don't show.
export const NURSING_SUPPLEMENT = { perMonth: 250 };
