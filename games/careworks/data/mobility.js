// Mobility, rehabilitation and discharge (Milestone 16, bible §17, §9 MO01–MO08, §10 RM06, §25 F07 / F18 / F19, §12
// Allied Health, §27 respite / rehab funding). Plain data only; the rules are in src/systems/mobility.js and the home
// world. Placeholder numbers, logged in docs/DECISIONS.md — tune here. No secret rehab conditions (M29 / M30), no falls
// or incidents yet (M25): the falls-risk number is stored, shown and tested only.

// --- mobility per resident ---------------------------------------------------------------------------------------------
// Each resident has a mobility level 0–100 (higher = steadier on their feet) and the aid that goes with it. speed: × the
// walking speed (the M14 numbers: a frame 0.8, a wheelchair 0.85; a stick a little slower than walking unaided).
// prop: the early prop drawn beside them where they sit (none for a stick: shown on the card only).
export const AIDS = {
  none: { name: 'Walks unaided', short: 'Independent', speed: 1, prop: null },
  stick: { name: 'Walking stick', short: 'Walking stick', speed: 0.9, prop: null },
  frame: { name: 'Walking frame', short: 'Walking frame', speed: 0.8, prop: 'care_prop_early_01' },
  wheelchair: { name: 'Wheelchair', short: 'Wheelchair', speed: 0.85, prop: 'care_prop_early_02' },
};
export const AID_IDS = ['none', 'stick', 'frame', 'wheelchair'];
// The aid by level: at least `from` for that aid (best first). hysteresis: a level has to pass a line by this much to
// change aid, so it doesn't flicker day to day.
export const AID_LEVELS = [
  { aid: 'none', from: 70 },
  { aid: 'stick', from: 55 },
  { aid: 'frame', from: 35 },
  { aid: 'wheelchair', from: 0 },
];
export const AID_HYSTERESIS = 3;
// Their starting level from their profile (primary support) — M14's "aid by primary support" gives the same aids on day
// one — moved by their own rolled Mobility need (half a point of level per point of need away from the profile's).
export const BASE_LEVEL = { 'Light Support': 82, 'Social Support': 80, 'Nutrition Support': 78, 'Memory Support': 76, 'Clinical Support': 76, 'Mobility Support': 45, Rehabilitation: 48, 'High Care': 28 };
export const PROFILE_MOBILITY = { 'Light Support': 18, 'Social Support': 20, 'Nutrition Support': 22, 'Memory Support': 25, 'Clinical Support': 28, 'Mobility Support': 55, Rehabilitation: 50, 'High Care': 50 };
// Each day their level moves pull of the way towards: base + (needFrom − their average Mobility need) × perNeed (at most
// ±maxShift: good care keeps them steady, a run of high need lets them decline) + their rehab progress (the average
// rise of their transfer and walking goals × rehabShare).
export const LEVEL_DRIFT = { needFrom: 40, perNeed: 0.25, maxShift: 8, pull: 0.25, rehabShare: 0.6 };

// --- mobility tasks ----------------------------------------------------------------------------------------------------
// MO04 Transfer Assist: two-person when their Mobility need is high (the M8 PC04 pattern: a second "second carer" task).
export const TWO_PERSON = { needAt: 70, name: 'Second helper for the transfer', roles: ['CW', 'AH', 'RN'] };
// Which done tasks count for rehab goals (by plan task name → kind), and the daily therapy step for anyone in rehab.
export const GOAL_TASKS = {
  therapy: ['Therapy session', 'Strength and balance session', 'Afternoon balance exercises', 'Reablement practice'], // (Milestone 20: the Reablement Pathway's practice)
  walk: ['Supervised walk', 'Afternoon supervised walk', 'Walk with his frame', 'Afternoon walk with his frame', 'Steady walk'],
  transfer: ['Morning transfer', 'Midday transfer', 'Evening transfer', 'Wheelchair transfer'],
};
// The daily therapy step (a routine step for anyone in rehab, data/routine.js THERAPY_STEP): at the Rehabilitation Gym
// (F18), else the Basic Physio Space (F07), else their Rehabilitation Room (RM06) or their own room. mult: × goal gains.
export const THERAPY_PLACES = [
  { id: 'F18', kind: 'facility', mult: 1.15, name: 'the Rehabilitation Gym' },
  { id: 'F07', kind: 'facility', mult: 1.08, name: 'the Basic Physio Space' },
  { id: 'RM06', kind: 'room', mult: 1.05, name: 'their Rehabilitation Room' },
];
export const THERAPY_NO_SPACE = { mult: 0.85, name: 'their room' };

// --- rehab goals (§17) -------------------------------------------------------------------------------------------------
// Four measurable goals, 0–100, each with a start and a target from their profile:
//   start = 100 − (the need it reads) − startGap          target = targetBase − (age over targetAgeFrom) × perYear
export const GOALS = [
  { id: 'transfer', name: 'Transfer independence', need: 'mobility', startGap: 15, targetBase: 75 },
  { id: 'walking', name: 'Walking endurance', need: 'mobility', startGap: 20, targetBase: 70 },
  { id: 'confidence', name: 'Confidence', need: 'social', startGap: 30, targetBase: 70 },
  { id: 'dailyLiving', name: 'Daily-living independence', need: 'personal', startGap: 25, targetBase: 75 },
];
export const GOAL_TARGET_AGE = { from: 75, perYear: 0.35, min: 55 };
// Gains per session done with a helper (goal points), before multipliers:
export const GOAL_GAINS = {
  therapy: { transfer: 0.9, walking: 0.8, confidence: 0.7, dailyLiving: 0.7 },
  walk: { walking: 0.45, confidence: 0.3 },
  transfer: { transfer: 0.4, dailyLiving: 0.25 },
  self: { transfer: 0.15, walking: 0.15, confidence: 0.1, dailyLiving: 0.15 }, // a therapy step done alone (no one on shift)
};
// Multipliers and slow-downs: a well-matched plan (MO07 Rehabilitation Plan; MO06 / MO03 help less) × planMatch; Mood
// under lowMood × lowMoodMult; Nutrition need over poorNutrition × poorNutritionMult (M15: a poor eater recovers
// slower); a missed therapy step costs missedConfidence; a day with no therapy at all fades every goal by fadePerDay.
export const GOAL_RULES = {
  planMatch: { MO07: 1.25, MO06: 1.1, MO03: 1.05 },
  lowMood: 40, lowMoodMult: 0.6,
  poorNutrition: 60, poorNutritionMult: 0.7,
  missedConfidence: 1.5,
  fadePerDay: 0.3,
  history: 7, // days of progress kept for the "On track / Slow" line
  onTrackPerDay: 3, // goal points a day (all four together) over the last few days to count as on track
};
// Who gets goals: every Rehab / Short Stay resident, and anyone on MO07 Rehabilitation Plan.
export const REHAB_STAY = 'Rehab/Short Stay';
export const REHAB_OPTION = 'MO07';

// --- falls-prevention modifiers (stored, shown, tested; falls themselves are Milestone 25) --------------------------
// risk = (100 − mobility level) × perLevel + aid (a supported walker is steadier) − each modifier present, × the Falls
// Prevention Lab (F19: −12%). 0–100. Bands for the card.
export const FALLS = {
  perLevel: 0.6,
  aid: { none: 0, stick: -3, frame: -6, wheelchair: -10 },
  modifiers: {
    EN05: { value: -10, text: 'Falls-Safe Layout' },
    MO05: { value: -10, text: 'Falls Prevention Plan' },
    fallsStaff: { value: -8, text: 'Falls specialist on shift' },
  },
  lab: { facility: 'F19', mult: 0.88, text: 'Falls Prevention Lab' },
  bands: [
    { from: 45, name: 'High' },
    { from: 25, name: 'Medium' },
    { from: 0, name: 'Low' },
  ],
};

// --- discharge (§17) ---------------------------------------------------------------------------------------------------
// All four goals at target: ready to go home (a card notice, an Inbox item). The player confirms, or it happens
// autoDays later. A successful discharge frees the bed and grants the placeholder rewards (counters for later systems:
// Reputation M26, Research Points M21, Family Trust on their family record M19) and a positive care outcome.
export const DISCHARGE = {
  autoDays: 3,
  rewards: { reputation: 10, research: 5, familyTrust: 10 },
  firstArt: 'care_event_05', // First Rehab Discharge (the big beat, the first time)
};
// §27 respite / rehab funding: Credits a month (by days) while a rehab resident is working on their goals. Once they are
// ready to go home, keeping them earns less: their Care Support Funding drops to readyFundingPct (and no rehab funding),
// so holding a ready resident never beats discharging them and admitting the next applicant.
export const REHAB_FUNDING = { perMonth: 300, readyFundingPct: 0 };
