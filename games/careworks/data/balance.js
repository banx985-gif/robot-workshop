import { ROOM_FEES, FUNDING } from './economy.js';
// Staff numbers (Milestone 3). Placeholders, logged in docs/DECISIONS.md — tune here.
//   Energy and Morale are 0–100. Hours are game hours (a game hour is 3.75 real seconds at 1×).
import { SHIFT_TEMPLATES } from './shifts.js';
export const STAFF_BALANCE = {
  startEnergy: 100,
  startMorale: 75,
  energy: {
    workPerHour: -3.5, // on shift (at a post, walking, helping)
    perTask: -3, // each routine step they help with
    restPerHour: 3.5, // off shift
    restSpotBonus: 1.2, // × while standing down at their rest spot (the Staff Room, Milestone 5)
  },
  morale: {
    lowEnergyBelow: 35, // below this Energy, Morale drifts down…
    lowEnergyPerHour: -0.6,
    perTask: 1.5, // …and each finished task lifts it a little
    settleTo: 75, // otherwise it settles slowly back towards this
    settlePerHour: 0.2,
  },
  tooTiredBelow: 8, // Energy below this: not picked automatically (still choosable)
};

// The shifts (Milestone 3 had one Morning shift, 06:00–17:00). Milestone 7: the three templates live in data/shifts.js;
// SHIFTS is the same object, kept under its Milestone 3 name.
export const SHIFTS = SHIFT_TEMPLATES;

// Milestone 5: the top bar's money; Milestone 6 puts it in a ledger (core/EconomySystem). A placeholder opening
// balance, logged in docs/DECISIONS.md.
export const ECONOMY_START = { credits: 100000, careTokens: 0 };

// Milestone 6: the first pass of income and costs (bible §27 income lines; deliberately simple, tuned in Milestone 22).
// At each month's close every resident pays the accommodation fee and brings Care Support Funding by their Support
// Level (1–5, data/residents.js), both for the days they lived here that month; every team member's salary (data/staff.js)
// goes out in full. The balance may go below zero: no debt system yet, just a red number.
// Milestone 22: the real numbers live in data/economy.js (fees by room, funding by level from the care it needs); FEES
// keeps the Milestone 6 names for the code and tests that read them: a Standard Room's fee and the funding table.
export const FEES = {
  accommodationPerMonth: ROOM_FEES.RM01,
  careSupportFundingByLevel: FUNDING,
};
export const LEDGER = {
  categories: { opening: 'Opening balance', fees: 'Accommodation fees', funding: 'Care Support Funding', wages: 'Wages', agency: 'Agency cover', careRecovery: 'Care recovery', build: 'Building', sell: 'Sold (50% back)', food: 'Food', rehabFunding: 'Rehab funding', programs: 'Specialist programs', research: 'Research', respiteFunding: 'Respite funding', programFunding: 'Program funding', supplies: 'Supplies', equipment: 'Equipment upkeep', upkeep: 'Rooms and facilities upkeep', utilities: 'Utilities and maintenance', training: 'Training', recruit: 'Recruitment', clinical: 'Clinician and hospital', loan: 'Emergency Credit', loanRepay: 'Emergency Credit repayment', investor: 'Rescue Investor', investorShare: 'Rescue Investor share', tokens: 'Care Tokens', grants: 'Grants and service contracts', partnerSupport: 'Partner support', partnerPerk: 'Partner perks (savings)', emergency: 'Emergency supplies and responses' }, // (Milestone 25) // (Milestone 23) // (Milestone 22) // (Milestone 21: Research Points in and out, currency 'rp') // (Milestone 20: each running program's weekly cost — data/programs.js) // (Milestone 16: rehab funding — data/mobility.js REHAB_FUNDING) // (Milestone 15: food, per meal served — data/dining.js FOOD_COST)
  maxLines: 400, // older lines fold into one (core/EconomySystem)
};

// Milestone 7: short staffing costs money (bible §14 "understaffing does not become a cheap-profit strategy", §27 agency
// cover is a cost line). Both post to the ledger as they happen: an agency fee when the worker is hired for a shift, and
// care recovery at the end of each day for that day's missed essential tasks (a placeholder for the extra care, reviews
// and family follow-up a missed wake-up, meal, medicine round or settle brings; Milestone 22 tunes it).
//
// The design rule, checked here and by tests/careworks/m7.test.mjs (a 28-day run with one shift short costs more than
// the fully staffed run):
//   leaving one shift empty saves at most one salary: 560 Credits a month (the dearest Standard staff member)
//   an empty shift brings an agency worker every day: 28 × 120 = 3,360 Credits a month — six times the wage saved
//   when the ledger can't pay agency, the unsafe shift's missed essential tasks cost 35 each: one or two a day is
//   980–1,960 Credits a month, and the unsafe-shift counter goes up (quality scores read it in Milestone 26)
// So the cheapest safe roster always beats running short.
// Milestone 10 fix: a small home's nurse on call (bible §14 "RN or on-call"). A brand-new home (Arthur and the three-
// person opening team) must not bleed agency fees the player never chose. The roster's "nurse on call" switch, one per
// shift that allows it (data/shifts.js clinical.onCall), stands in for an RN on shift — and adds coverPoints of Safe
// Coverage — while the home is small and nobody on it needs much clinical care:
//   clinicalNeedAbove   a resident whose assessed Clinical/Nursing need (their profile, data/residents.js) is above this
//                       needs a real RN on every shift (Clinical Support and High Care are 55; everyone else 36 or less)
//   maxResidents        per shift: the switch only covers while the home has at most this many residents (Afternoon:
//                       the card's 4; Night: no limit — the coverPoints then run out for a bigger home by themselves)
//   coverPoints         Safe Coverage Points the nurse on call is worth: 4 low-support residents at Night need 0.4 ×
//                       (1+2+2+2) = 2.8, so Night is covered for them; a bigger or needier home is not, and must staff
//                       it (or pay agency) — the M7 rule that under-staffing never saves money still holds there
export const ON_CALL = {
  clinicalNeedAbove: 45,
  maxResidents: { afternoon: 4, night: Infinity },
  coverPoints: 3.2,
};

export const SHORT_STAFFING = {
  agencyFeePerShift: 120, // Credits, each agency worker, each shift
  careRecoveryPerMissed: 25, // Credits per missed essential task (Milestone 22: 35 → 25, tuned with the real economy)
};

// Milestone 14 (fix first, Aaron's call 30 Sept): everyone walks 5× faster. The 90-second day stays. In a full Stage-1
// home the far rooms were a 2–3 game-hour walk from the Dining Room (M13: ~63 essential morning tasks missed a day);
// at 5× that is under half an hour. speedMultiplier multiplies data/home.js PERSON.speed (staff) and RESIDENT.speed
// (residents); the hop length (MOTION.stride) is multiplied too, so people take the same number of hops a second on
// screen as before — a longer, brisker hop, never frantic legs or a slide.
// aids: a resident with a mobility aid walks at this share of everyone else's speed (still 5× faster than before);
// aidBySupport: which aid by their primary support (bible §7), until Milestone 16 gives each resident their own.
// Milestone 25b (Aaron, 2 Oct: "Staff move way too fast… not heaps, but 10%"): 5 → 4.5, with the day 10% longer in
// real time to match (data/routine.js: 90 → 100 s), so the walk per game hour — and so the care per day — is unchanged.
export const WALK = {
  speedMultiplier: 4.5,
  aids: { frame: 0.8, wheelchair: 0.85 },
  aidBySupport: { 'Mobility Support': 'frame', Rehabilitation: 'frame', 'High Care': 'wheelchair' },
};
