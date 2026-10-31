// Community partners and grants (Milestone 23, bible §28 / §29 / §27). Plain data only; the rules are in
// src/systems/partners.js (on core/SponsorSystem and core/ContractSystem) and the home world. Placeholder numbers,
// logged in docs/DECISIONS.md.
//
// The rules: partners support the facility — they never buy access to residents. Every obligation and grant goal is a
// number the game counts (COUNTERS below), and the counters only ever count what residents chose to join: a session
// counts once at least one resident chose to come; a pilot counts only residents who said yes. A deal or a grant can
// always simply go unmet — never a reason to push anyone. Grants are recovery / expansion help, never required.

// What the game counts (care.partners.counters: key → [{ day, … }]). Each obligation / goal names one of these.
export const COUNTERS = {
  fallsSession: 'Falls-prevention sessions (a Balance class with someone who chose to join, or a Strength & Balance / Falls Prevention Plan session done)',
  communityActivity: 'Community activities (a visitor or community session with someone who chose to join)',
  gardenSession: 'Gardening sessions (with someone who chose to join)',
  familyReview: 'Family reviews and care-plan meetings held',
  staffTrained: 'Staff who finished a course',
  outing: 'Safe outings (outings come later; ?debug=1 can count one)',
  pilotDone: 'Assistive-tech pilots completed by a resident who said yes',
  facilityBuilt: 'Facilities built',
  allocatedAdmission: 'Residents admitted through an allocation',
};
// Short words for a counter on a progress bar (the Grant board).
export const COUNTER_LABELS = { fallsSession: 'Falls-prevention sessions', communityActivity: 'Community activities', gardenSession: 'Gardening sessions', familyReview: 'Family reviews', staffTrained: 'Staff trained', outing: 'Safe outings', pilotDone: 'Pilots completed', facilityBuilt: 'Care facilities built', allocatedAdmission: 'Referred residents admitted' };
// Monthly scores (checked at each month's close): the home's Nutrition outcome (the residents' average dining
// satisfaction, Milestone 15) and its Environment score (below).
export const SCORES = {
  nutrition: 'Nutrition outcome (the residents’ average dining satisfaction)',
  environment: 'Environment score (room quality and cleanliness)',
};
// The Environment score (SPN07): half room quality, half cleanliness.
//   room quality: the average of every room's template quality, + bonusPerFacility for each comfort facility placed (at
//                 most bonusCap); cleanliness: room checks done ÷ (done + missed) over the last `days` days (none due: 100).
export const ENVIRONMENT = {
  roomQuality: { RM01: 70, RM02: 85, RM03: 95, RM04: 75, RM05: 80, RM06: 75, RM07: 85 },
  comfortFacilities: ['F06', 'F12', 'F13', 'F14', 'F15', 'F21', 'F22', 'F25'],
  bonusPerFacility: 3,
  bonusCap: 12,
  days: 7,
};

// --- partners (§28) ---------------------------------------------------------------------------------------------------
// A partner: id, name, theme, logo (logos/partner_logo_spnNN.png), perk(s) { key, value, text } on existing costs and
// lifts, obligation in core/SponsorSystem form:
//   { type: 'count', signal: <a COUNTERS key>, min }        met once that many count during the deal
//   { type: 'avoid', signal: 'monthCheck', score, min }     met unless a month's close finds that score below min
// label / text: how the sheet shows it. locked: shown but not offered until its system exists (?debug=1 allows it).
const p = (id, name, theme, perks, obligation, extra = {}) => ({ id, name, theme, logo: `partner_logo_${id.toLowerCase()}`, perks, obligation, ...extra });
export const PARTNERS = [
  p('SPN01', 'GoldenStep Mobility', 'Mobility', [{ key: 'equipmentPct', value: -10, text: 'Equipment upkeep −10%' }],
    { type: 'count', signal: 'fallsSession', min: 1, label: 'Falls-prevention sessions', text: 'Run one falls-prevention session during the deal' }),
  p('SPN02', 'Hearth Nutrition', 'Nutrition', [{ key: 'foodPct', value: -8, text: 'Food −8%' }, { key: 'mealQuality', value: 3, text: 'Meal quality +3' }],
    { type: 'avoid', signal: 'monthCheck', score: 'nutrition', min: 70, label: 'Nutrition outcome', text: 'Keep the Nutrition outcome at 70+ (checked at each month’s close)' }),
  p('SPN03', 'Kindred Connect', 'Family / Tech', [{ key: 'familyPct', value: 8, text: 'Family meetings and calls +8% Trust' }],
    { type: 'count', signal: 'familyReview', min: 3, label: 'Family reviews', text: 'Complete 3 family reviews or meetings' }),
  p('SPN04', 'GreenLeaf Community', 'Wellbeing', [{ key: 'communityActivityPct', value: 10, text: 'Garden and community activities +10%' }],
    { type: 'count', signal: 'communityActivity', min: 2, label: 'Community activities', text: 'Run 2 community activities' }),
  p('SPN05', 'WellSpring Training', 'Education', [{ key: 'trainingDaysPct', value: -8, text: 'Training time −8%' }],
    { type: 'count', signal: 'staffTrained', min: 3, label: 'Staff trained', text: 'Train 3 staff during the deal' }),
  p('SPN06', 'SilverLine Transport', 'Outings', [{ key: 'transportPct', value: -12, text: 'Outing transport −12%' }],
    { type: 'count', signal: 'outing', min: 2, label: 'Safe outings', text: 'Run 2 safe outings' }, { locked: { text: 'Needs the Transport Bay and outings (they come in a later update)' } }),
  p('SPN07', 'BrightHome Furnishings', 'Environment', [{ key: 'roomBuildPct', value: -8, text: 'New rooms −8%' }],
    { type: 'avoid', signal: 'monthCheck', score: 'environment', min: 75, label: 'Environment score', text: 'Keep the Environment score at 75+ (checked at each month’s close)' }),
  p('SPN08', 'BOTWORKS Assistive Systems', 'Assistive Tech', [{ key: 'adminPct', value: -8, text: 'Upkeep and utilities −8% (logistics and admin automation)' }],
    { type: 'count', signal: 'pilotDone', min: 1, label: 'Assistive-tech pilot', text: 'Complete one assistive-tech pilot with a resident who said yes' }, { pilot: true }),
];
export const partnerById = (id) => PARTNERS.find((x) => x.id === id) ?? null;

// Partner slots by Rank (§28). Rank arrives in Milestone 26: Rank E (1 slot) until then; ?debug=1 can set it.
export const SLOTS = { E: 1, D: 1, C: 2, B: 2, A: 3, S: 3 };
// Deals (§28): 6 months. The first offer comes firstOfferDays into a new home (or a loaded older save), then one every
// offerEveryDays while a slot is free (at most maxOffers open at once); each stays offerDays. Not met: no penalty
// (cooldownDays 0); the tier only drops after missesToDrop misses in a row.
export const DEALS = { days: 168, firstOfferDays: 7, offerEveryDays: 28, offerDays: 28, maxOffers: 2, cooldownDays: 0, missesToDrop: 2 };
// Relationship tiers (§28): each improves the perk (× perkMult) and the partner's support: supportPerMonth for every 28
// days the deal runs (300 / 450 / 600 / 800 over a 6-month deal), paid at each month's close and when the deal ends or is
// cancelled. Paid for the days run, not on signing, so signing and cancelling over and over earns nothing (the M22
// anti-exploit rule).
export const TIERS = [
  { id: 'partner', name: 'Partner', perkMult: 1, supportPerMonth: 50 },
  { id: 'preferred', name: 'Preferred', perkMult: 1.15, supportPerMonth: 75 },
  { id: 'major', name: 'Major', perkMult: 1.3, supportPerMonth: 100 },
  { id: 'strategic', name: 'Strategic', perkMult: 1.5, supportPerMonth: 135 },
];

// --- the assistive-tech pilot (SPN08, the technology-pilot grant) --------------------------------------------------------
// Offered once to every resident here when it starts; each answers by their own choice (like an M14 activity: a liked
// idea, neutral, or one they'd rather not — a seeded roll for "maybe"; prefs.pilot 'refuse' is always no). Those who say
// yes get `sessions` short sessions, everyDays apart, at `at`; at the door they may still say no (nothing is pushed).
// Done when one of them has had every session.
export const PILOT = {
  name: 'Assistive-tech pilot session',
  sessions: 3,
  everyDays: 2,
  at: 11,
  band: 'morning',
  roles: ['CW', 'AH', 'RN'],
  minutes: 20,
  outcomes: { independence: 2 },
  likes: ['Curious', 'Independent', 'Stubbornly Independent', 'Witty'],
  dislikes: ['Reserved', 'Routine-Loving', 'Quiet'],
  chance: { like: 0.85, neutral: 0.55, dislike: 0.25 },
};

// --- grants and service contracts (§29) ------------------------------------------------------------------------------
// A grant: id, name, text, payOnAccept / payOnComplete (Credits), goal { counter, min, … filters }, days (deadline), and:
//   allocate { stay, count }   on acceptance, that many applicants of that stay type arrive on the admissions board
//                              with the grant attached (admitting one counts allocatedAdmission)
//   needs { facility }         offered only when that facility can be built (or ?debug=1)
//   recovery                   a recovery grant: more likely while the home is struggling
// At most 2 active (§29). Missing a deadline costs nothing: what was paid on acceptance (an advance) is handed back
// unused, so the home ends where it would have been without the grant — and accepting grants only to let them lapse
// earns nothing (the M22 anti-exploit rule).
export const GRANTS = [
  { id: 'training', name: 'Training grant', text: 'Funding for staff learning', payOnAccept: 0, payOnComplete: 1200, goal: { counter: 'staffTrained', min: 2 }, days: 84 },
  { id: 'equipment', name: 'Equipment grant', text: 'Half now, half when a care facility is built', payOnAccept: 750, payOnComplete: 750, goal: { counter: 'facilityBuilt', min: 1, facilities: ['F02', 'F07', 'F18', 'F19', 'F23'] }, days: 84, recovery: true },
  { id: 'community', name: 'Community program funding', text: 'For activities with the local community', payOnAccept: 0, payOnComplete: 1000, goal: { counter: 'communityActivity', min: 2 }, days: 56 },
  { id: 'respite', name: 'Respite allocation', text: 'The council sends respite applicants, funding attached', payOnAccept: 300, payOnComplete: 900, goal: { counter: 'allocatedAdmission', min: 1, stay: 'Respite' }, days: 56, allocate: { stay: 'Respite', count: 2 }, recovery: true },
  { id: 'rehab', name: 'Rehabilitation pathway', text: 'The hospital refers rehab patients, funding attached', payOnAccept: 300, payOnComplete: 1200, goal: { counter: 'allocatedAdmission', min: 1, stay: 'Rehab/Short Stay' }, days: 56, allocate: { stay: 'Rehab/Short Stay', count: 2 }, recovery: true },
  { id: 'garden', name: 'Garden and wellbeing project', text: 'For gardening with the residents who enjoy it', payOnAccept: 0, payOnComplete: 1000, goal: { counter: 'gardenSession', min: 3 }, days: 84 },
  { id: 'transport', name: 'Transport and community-access grant', text: 'Half now, half after two safe outings', payOnAccept: 1000, payOnComplete: 1000, goal: { counter: 'outing', min: 2 }, days: 84, needs: { facility: 'F26' } },
  { id: 'pilot', name: 'Technology pilot', text: 'Try assistive tech with residents who would like to', payOnAccept: 0, payOnComplete: 1000, goal: { counter: 'pilotDone', min: 1 }, days: 84 },
];
export const grantById = (id) => GRANTS.find((x) => x.id === id) ?? null;
// The board: offers each month (offersPerMonth), more when the home is struggling (balance under `below`, or Emergency
// Credit / a Rescue Investor taken) — and recovery grants weigh `recoveryWeight` × then.
export const GRANT_RULES = { maxActive: 2, offersPerMonth: 2, struggling: { below: 20000, offers: 3, recoveryWeight: 3 } };

// The Ledger's lines (data/economy.js LEDGER_ROWS reads these categories).
export const LEDGER_CATS = { partnerSupport: 'Partner support', partnerPerk: 'Partner perks (savings)', grants: 'Grants and service contracts' };

// Check the lists (the Node tests). counterKeys: the COUNTERS keys.
export function validatePartners(v) {
  v.check(PARTNERS.length === 8, 'partners: eight (§28)');
  for (const x of PARTNERS) {
    const who = `partner ${x.id}`;
    v.check(/^SPN0[1-8]$/.test(x.id) && x.logo === `partner_logo_${x.id.toLowerCase()}`, `${who}: id / logo`);
    v.check(x.perks.length > 0 && x.perks.every((k) => k.key && Number.isFinite(k.value) && k.text), `${who}: perks`);
    const ob = x.obligation;
    v.check(ob.type === 'count' ? !!COUNTERS[ob.signal] && ob.min > 0 : ob.type === 'avoid' && ob.signal === 'monthCheck' && !!SCORES[ob.score] && ob.min > 0, `${who}: a countable obligation`);
    v.check(!!ob.label && !!ob.text, `${who}: obligation words`);
  }
  v.check(GRANTS.length === 8, 'grants: eight types (§29)');
  for (const g of GRANTS) v.check(!!COUNTERS[g.goal.counter] && g.goal.min > 0 && g.days > 0 && g.payOnAccept + g.payOnComplete > 0, `grant ${g.id}: a countable goal, a deadline, money`);
  return v;
}
