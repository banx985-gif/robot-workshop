// Clinical care and the medicine round (Milestone 18, bible §16, §9 CL01–CL08, §25 F02 / F23 / F28, §13 Medication
// Safety). Plain data only; the rules are in src/systems/clinical.js and the home world. Placeholder numbers, logged in
// docs/DECISIONS.md.
//
// The rule for this milestone: no real medicines, amounts or diagnoses — ever. The player makes only high-level
// decisions (the six ACTIONS below). Medicines appear only as "the medicine round"; how a resident is shows only as
// their support type and a plain alert word (ALERT_WORDS). A test scans every string for the words in NEVER_SAY.

// --- the medicine round ------------------------------------------------------------------------------------------------
// A round is every medication-round task (type 'meds', from the resident's CL option) due at the same time of day. The
// nurse collects the Medication Cart first — at the Medication Room (F02), else the Nurse Station (F01) — then visits
// each resident on the round in turn (the cart beside them). How long each stop takes is the option's own task minutes
// (data/carePlans.js): CL01 and CL05 15, CL02 25 then 15, CL03 25 / 15 / 15 — so Medication Support and a Complex
// Medication Round make longer stops. A stop reached more than lateAfter hours after its time is late (logged).
export const ROUND = {
  cart: 'care_equipment_01', // the Medication Cart
  collectMinutes: 3,
  lateAfter: 1.5,
  lead: 0.75, // a round's stops open this many hours early (not before their band), so the cart is fetched in time
  names: { 9.5: 'Morning medicine round', 12.5: 'Midday medicine round', 18: 'Evening medicine round' },
};

// Round safety (0–100), worked out when the nurse collects the cart (bible §16's list):
//   base; the nurse's CLN stat ((CLN − cln.pivot) × cln.per, within cln.min…cln.max); their workload (tasks only a nurse
//   can do still waiting this band, per nurse on shift, over workload.freeTasks: workload.perTask each; residents on the
//   round per nurse on shift, over workload.freeStops: workload.perStop each); the Medication Room (none: noMedRoom); resident complexity
//   (Support Level 4+ and the CL options below, per resident on the round, capped; × (1 − Complex Care Lead %));
//   training (the Medication specialty from the Medication Safety course); unresolved alerts in the home (each, capped).
//   Then × (1 + the Medication Room's +8%) × (1 + the Clinical Governance Office's +10%) (their §25 effects).
export const SAFETY = {
  base: 72,
  cln: { pivot: 120, per: 0.12, min: -12, max: 20 },
  workload: { freeTasks: 5, perTask: -1.2, freeStops: 4, perStop: -1.5, cap: -24 },
  noMedRoom: -10,
  complexity: { levelFrom: 4, level: -1, plan: { CL02: -0.5, CL03: -1.5, CL07: -1 }, cap: -10 },
  trained: 8, // the Medication specialty (data/training.js)
  alertEach: -3,
  alertCap: -12,
  medRoomPct: 8, // F02 Medication Room: Medication round safety +8%
  governancePct: 10, // F28 Clinical Governance Office: Safety / compliance +10%
};
// A round issue (plain words, never harm — incidents are Milestone 25): at each stop, a chance that grows as round
// safety falls below `below` (perPoint for each point under it). It is logged, costs the resident a little Safety, and
// adds to the issues counter on the Nurse Station card.
export const ISSUES = {
  below: 65,
  perPoint: 0.006,
  safety: -2, // their Safety outcome
  words: { late: 'a medicine was given late', rushed: 'the round was rushed' },
};

// --- observations -------------------------------------------------------------------------------------------------------
// Health checks (type 'observation' tasks from CL01 Routine Observation, CL04–CL08 and CL07 High-Care Observation, the
// need-made Nurse check, and Increase observation) are how an alert is noticed early. An observation is counted done or
// missed each day (the Clinical Safety score); a missed one for a resident makes their next alert likelier and bigger.
export const OBSERVATION = { recentDays: 2 };

// --- alerts (clinical events, high level) ----------------------------------------------------------------------------------
// Residents occasionally become unwell. The chance a day (checked once a band, a quarter each time): by their primary
// support, + their Clinical/Nursing need × perNeed, + each missed observation or medicine-round stop for them in the last
// OBSERVATION.recentDays days × perMiss (capped).
export const ALERT_CHANCE = {
  bySupport: { 'Light Support': 0.012, 'Social Support': 0.012, 'Nutrition Support': 0.016, 'Mobility Support': 0.018, Rehabilitation: 0.018, 'Memory Support': 0.022, 'Clinical Support': 0.04, 'High Care': 0.045 },
  base: 0.015,
  perNeed: 0.0003,
  perMiss: 0.015,
  missCap: 0.06,
};
// Each alert has a hidden severity. The roll: weights, with each recent miss moving missShift from minor to the bigger
// two (half each); Clinical Support and High Care move complexShift the same way.
export const SEVERITIES = ['minor', 'moderate', 'serious'];
export const SEVERITY_ROLL = { weights: { minor: 0.6, moderate: 0.3, serious: 0.1 }, missShift: 0.1, complexShift: 0.1, complexSupports: ['Clinical Support', 'High Care'] };
// The plain word shown over the resident: it hints at the severity (never names a condition).
export const ALERT_WORDS = {
  minor: [['not themselves', 0.6], ['in pain', 0.4]],
  moderate: [['unwell', 0.5], ['in pain', 0.3], ['breathless', 0.2]],
  serious: [['breathless', 0.5], ['unwell', 0.5]],
};
// Noticing: an alert starts unseen. A nurse's task for them (a medicine-round stop, a health check, an assessment) or any
// health check notices it. Unseen for hiddenHours, it shows itself anyway — later, and one step bigger.
// While open, it costs a little Comfort an hour (by severity).
export const NOTICE = { hiddenHours: 6, comfortPerHour: { minor: -0.1, moderate: -0.2, serious: -0.3 } };

// --- the six high-level actions ----------------------------------------------------------------------------------------------
// size: the right-sized action for a severity has the same size (minor 1, moderate 2, serious 3). resolve: the chance it
// resolves the alert, by severity. A resolved alert is resolved well when the action was not bigger than it needed
// (bigger: overdone — resolved, but time or money wasted); not resolved: it lingers (still open, act again).
export const ACTIONS = {
  assess: { name: 'Assess', text: 'A nurse assesses them now: often settles a minor alert', size: 1, resolve: { minor: 0.85, moderate: 0.3, serious: 0.05 }, task: { name: 'Nurse assessment', roles: ['RN'], minutes: 15, urgency: 4 } },
  observe: { name: 'Increase observation', text: 'Extra health checks for a few days: the alert usually settles', size: 1, resolve: { minor: 0.75, moderate: 0.35, serious: 0.05 }, days: 3, checks: [{ at: 10.5, band: 'morning' }, { at: 16.5, band: 'afternoon' }], task: { name: 'Extra health check', roles: ['RN'], minutes: 10, urgency: 2 } },
  carePlan: { name: 'Update care plan', text: 'Opens their Clinical/Nursing plan with a suggested option', size: 1, resolve: { minor: 0.65, moderate: 0.4, serious: 0.05 }, otherOption: 0.5, days: 1 },
  clinician: { name: 'Contact visiting clinician', text: 'The visiting clinician sees them tomorrow', size: 2, resolve: { minor: 0.95, moderate: 0.85, serious: 0.3 } },
  escalate: { name: 'Escalate', text: 'The most senior nurse on shift reviews them now', size: 2, resolve: { minor: 0.95, moderate: 0.75, serious: 0.45 }, task: { name: 'Senior nurse review', roles: ['RN'], minutes: 30, urgency: 5 } },
  hospital: { name: 'Transfer to hospital service', text: 'They go to the hospital service for a few days; their room is held', size: 3, resolve: { minor: 1, moderate: 1, serious: 1 } },
};
export const ACTION_IDS = ['assess', 'observe', 'carePlan', 'clinician', 'escalate', 'hospital'];
export const SEVERITY_SIZE = { minor: 1, moderate: 2, serious: 3 };
// A nurse's assessment or review: + (their CLN − cln.pivot) × perCln to the chance (Complex Care Lead: × 1.12).
export const NURSE_SKILL = { pivot: 120, perCln: 0.001 };
// Update care plan: the suggested Clinical/Nursing option for the alert word (when it is already their option: next).
export const PLAN_SUGGEST = { 'not themselves': 'CL01', 'in pain': 'CL06', unwell: 'CL07', breathless: 'CL07', next: 'CL07', fallback: 'CL02' };
// The player's choice waits until the end of the band it was noticed in (at least minHours). No choice by then: the nurse
// on shift acts on their own, in this order (the next one each time an earlier one leaves it lingering).
export const AUTO = { minHours: 1, order: ['assess', 'escalate', 'clinician', 'hospital'] };

// --- the visiting clinician and the hospital service (§16; services, as data) ----------------------------------------------
// The visiting clinician comes once a week (visitDay: 0 = Monday) for anyone booked; a call booked for any other day comes
// the next day at visitAt for callOutFee (booked for the weekly visit: visitFee). The hospital service takes a resident
// any time for fee: they are away for `days` days (their room held, fees still paid) and come back with a plan-review
// flag. Never a death or a fail state.
export const CLINICIAN = { visitDay: 2, visitAt: 10, visitFee: 90, callOutFee: 180 };
export const HOSPITAL = { fee: 400, days: 3, returnAt: 11 };
// F23 Clinical Treatment Room (Complex clinical tasks +12%): a moderate alert can be handled in-house — an assessment or a
// senior review of a moderate alert has inHouse added to its chance (× 1.12), and counts as right-sized.
export const TREATMENT_ROOM = { id: 'F23', inHouse: 0.3, pct: 12 };
export const GOVERNANCE = { id: 'F28' };
export const MED_ROOM = { id: 'F02', fallback: 'F01' };

// --- the Clinical Safety score (home level; quality scores proper arrive in Milestone 26) ----------------------------------------
// 0–100 over the last `days` days: round safety (weight), health checks done (weight), alerts resolved well (weight), less
// openEach for each alert open now and issueEach for each round issue.
export const CLINICAL_SCORE = { days: 7, alertDays: 14, round: 0.5, obs: 0.25, well: 0.25, noRounds: 75, openEach: -6, issueEach: -2 };

// --- the words the game never uses (the test scans every string) ----------------------------------------------------------
// Medicine names, amounts and units, and diagnosis words. (Plain alert words, support types, "the medicine round", the
// Medication Room and the Medication Safety course are fine.)
export const NEVER_SAY = /\b(mg|mcg|ml|millilitres?|milligrams?|units? of|dose[sd]?|dosage|dosing|tablets?|pills?|capsules?|injections?|syringes?|inhalers?|drips?|prescri\w*|paracetamol|ibuprofen|aspirin|morphine|codeine|opioids?|insulin|warfarin|statins?|steroids?|antibiotics?|sedatives?|antipsychotics?|laxatives?|painkillers?|diagnos\w*|dementia|alzheimer\w*|parkinson\w*|diabet\w*|stroke|cancer|tumou?r|pneumonia|sepsis|copd|asthma|arthritis|osteoporosis|fracture[sd]?|wounds?|ulcers?|heart (attack|failure)|angina|epilep\w*|seizures?|delirium|infections? (of|in)|uti|flu|covid|virus|disease|disorder|syndrome)\b/i;

// --- older saves: renamed ids (Milestone 18 renamed the few names that were diagnoses; the saves keep working) ----------------
// Keys are the old ids as they appear in a save (a course, a trait, a diet); the migration swaps them for the new ones.
export const RENAMED_IDS = { dementiaCommunication: 'memoryCommunication', diabetesSupport: 'sugarWatch', woundWise: 'skinWise', diabetes: 'lowSugar' };
